import "server-only";
import { prisma } from "@/lib/prisma";
import { STAGE_TEMPLATES, TIER_META, type Tier } from "@/lib/constants";
import {
  chatJson,
  generateImage,
  isImageConfigured,
} from "@/lib/ai/client";
import { planResponseSchema } from "@/lib/ai/schemas";
import { imagePrompt, planSystemPrompt, planUserPrompt } from "@/lib/ai/prompts";
import { roomGenitive } from "@/lib/constants";
import { parseAnswers, styleLabelFromAnswers, toBrief } from "@/lib/project";
import { pickForeman } from "@/lib/orders";

function scaledDays(base: number, factor: number): number {
  return Math.max(1, Math.round(base * factor));
}

export async function buildFinalPlan(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      items: true,
      stages: true,
    },
  });
  if (!project) throw new Error("Проект не найден");
  if (!project.tier) throw new Error("Сначала выберите пакет");

  const tier = project.tier as Tier;
  const selectedItems = project.items.filter((item) => item.tier === tier);
  if (selectedItems.length === 0) {
    throw new Error("В выбранном пакете нет товаров");
  }

  const materialsTotal =
    Math.round(selectedItems.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const servicesTotal = Math.round(materialsTotal * 0.5 * 100) / 100;
  const total = Math.round((materialsTotal + servicesTotal) * 100) / 100;
  const goodsByStage = new Map<number, number>();
  for (const item of selectedItems) {
    goodsByStage.set(
      item.stageNumber,
      (goodsByStage.get(item.stageNumber) ?? 0) + item.total,
    );
  }

  const brief = toBrief(project);
  const answers = parseAnswers(project.answersJson);

  type StageDraft = {
    number: number;
    title: string;
    description: string;
    durationDays: number;
  };
  const rawTemplateDays = STAGE_TEMPLATES.reduce(
    (sum, template) => sum + template.days,
    0,
  );
  const targetDays = Math.min(
    26,
    Math.max(14, Math.round(project.area * 0.75)),
  );
  const dayFactor = targetDays / rawTemplateDays;
  const fallbackStages: StageDraft[] = STAGE_TEMPLATES.map((template, index) => {
    const wet = project.roomType === "bathroom" || project.roomType === "kitchen";
    const number = index + 1;
    const isWetStage = number === 5;
    return {
      number,
      title:
        isWetStage && !wet ? "Подготовка основания" : template.title,
      description:
        isWetStage && !wet
          ? "Грунтование и подготовка основания пола перед укладкой чистового покрытия."
          : template.description,
      durationDays: scaledDays(template.days, dayFactor),
    };
  });

  let stages = fallbackStages;
  const raw = await chatJson(
    planSystemPrompt(),
    planUserPrompt({
      brief,
      answers,
      tierTitle: TIER_META[tier].title,
      goodsTotal: materialsTotal,
    }),
    {
      temperature: 0.4,
      maxTokens: 3000,
      timeoutMs: 45000,
      sessionId: `oma360-${projectId}-plan`,
    },
  );
  const parsed = planResponseSchema.safeParse(raw);
  if (parsed.success) {
    const byNumber = new Map(parsed.data.stages.map((s) => [s.number, s]));
    stages = fallbackStages.map((fallback) => {
      const candidate = byNumber.get(fallback.number);
      return candidate
        ? {
            number: fallback.number,
            title: candidate.title,
            description: candidate.description,
            durationDays: Math.min(10, Math.max(2, candidate.durationDays)),
          }
        : fallback;
    });
  }

  const rawSumDays = stages.reduce((sum, stage) => sum + stage.durationDays, 0);
  if (rawSumDays > 0 && rawSumDays !== targetDays) {
    const ratio = targetDays / rawSumDays;
    stages = stages.map((stage) => ({
      ...stage,
      durationDays: Math.max(1, Math.round(stage.durationDays * ratio)),
    }));
  }

  const sumDays = stages.reduce((sum, stage) => sum + stage.durationDays, 0);
  let allocatedLabor = 0;
  const stageRows = stages.map((stage, index) => {
    const materials = Math.round((goodsByStage.get(stage.number) ?? 0) * 100) / 100;
    const isLast = index === stages.length - 1;
    const labor = isLast
      ? Math.round((servicesTotal - allocatedLabor) * 100) / 100
      : Math.round(((servicesTotal * stage.durationDays) / sumDays) * 100) / 100;
    allocatedLabor += labor;
    return {
      number: stage.number,
      title: stage.title,
      description: stage.description,
      durationDays: stage.durationDays,
      materialsTotal: materials,
      laborTotal: Math.max(0, labor),
      budget: Math.round((materials + Math.max(0, labor)) * 100) / 100,
      status: "PENDING",
    };
  });

  const foremanId = project.foremanId ?? (await pickForeman());

  await prisma.$transaction(async (tx) => {
    await tx.planStage.deleteMany({ where: { projectId } });
    await tx.planStage.createMany({
      data: stageRows.map((stage) => ({ ...stage, projectId })),
    });
    await tx.project.update({
      where: { id: projectId },
      data: {
        materialsTotal,
        servicesTotal,
        total,
        foremanId,
        status: "FINAL_READY",
      },
    });
    await tx.escrowAccount.upsert({
      where: { projectId },
      create: { projectId, total, funded: 0, released: 0, status: "PENDING" },
      update: { total },
    });
  });
}

export async function startPreviewJob(projectId: string): Promise<string> {
  const running = await prisma.aiJob.findFirst({
    where: {
      projectId,
      type: "preview",
      status: "RUNNING",
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (running) return running.id;

  const job = await prisma.aiJob.create({
    data: { projectId, type: "preview", status: "RUNNING", progress: 5 },
  });
  void runPreviewJob(job.id, projectId);
  return job.id;
}

async function runPreviewJob(jobId: string, projectId: string): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { items: true },
    });
    if (!project) throw new Error("Проект не найден");
    if (!isImageConfigured()) {
      throw new Error(
        "Модель генерации изображений не настроена (AI_IMAGE_MODEL).",
      );
    }
    const tier = (project.tier ?? "BASE") as Tier;
    const items = project.items.filter((item) => item.tier === tier);
    const answers = parseAnswers(project.answersJson);
    const prompt = imagePrompt({
      brief: toBrief(project),
      styleLabel: styleLabelFromAnswers(answers),
      itemNames: items.map((item) => item.name),
      tierTitle: TIER_META[tier].title,
    });

    await prisma.aiJob
      .update({ where: { id: jobId }, data: { progress: 35 } })
      .catch(() => undefined);

    const image = await generateImage(
      prompt,
      `oma360-${projectId}-preview`,
    );
    if (!image) {
      throw new Error(
        "Визуализация недоступна: сервис генерации не настроен или вернул ошибку.",
      );
    }
    await prisma.project.update({
      where: { id: projectId },
      data: { previewImage: image },
    });
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: "DONE", progress: 100 },
    });
  } catch (error) {
    await prisma.aiJob
      .update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          progress: 100,
          error:
            error instanceof Error
              ? error.message
              : "Не удалось сгенерировать изображение",
        },
      })
      .catch(() => undefined);
  }
}

export async function payProject(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: true },
  });
  if (!project) throw new Error("Проект не найден");
  if (project.status === "ACTIVE" || project.status === "COMPLETED") return;
  if (project.status !== "FINAL_READY") {
    throw new Error("Заказ ещё не готов к оплате");
  }

  const firstStage = project.stages.find((stage) => stage.number === 1);
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { status: "ACTIVE", paidAt: new Date() },
    });
    await tx.escrowAccount.upsert({
      where: { projectId },
      create: {
        projectId,
        total: project.total,
        funded: project.total,
        released: 0,
        status: "FUNDED",
      },
      update: { funded: project.total, status: "FUNDED" },
    });
    if (firstStage) {
      await tx.planStage.update({
        where: { id: firstStage.id },
        data: { status: "IN_PROGRESS" },
      });
      await tx.projectItem.updateMany({
        where: {
          projectId,
          tier: project.tier ?? "BASE",
          stageNumber: 1,
        },
        data: { delivered: true },
      });
    }
  });
}

export async function advanceStage(
  projectId: string,
  stageId: string,
  action: "start" | "complete",
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: { orderBy: { number: "asc" } } },
  });
  if (!project) throw new Error("Проект не найден");
  if (project.status !== "ACTIVE") throw new Error("Заказ не в работе");

  const stage = project.stages.find((s) => s.id === stageId);
  if (!stage) throw new Error("Этап не найден");

  if (action === "start") {
    await prisma.$transaction([
      prisma.planStage.update({
        where: { id: stage.id },
        data: { status: "IN_PROGRESS" },
      }),
      prisma.projectItem.updateMany({
        where: {
          projectId,
          tier: project.tier ?? "BASE",
          stageNumber: stage.number,
        },
        data: { delivered: true },
      }),
    ]);
    return;
  }

  const next = project.stages.find((s) => s.number === stage.number + 1);
  const escrow = await prisma.escrowAccount.findUnique({ where: { projectId } });
  const newReleased = Math.min(
    project.total,
    Math.round(((escrow?.released ?? 0) + stage.budget) * 100) / 100,
  );
  const allDone = project.stages
    .filter((s) => s.id !== stage.id)
    .every((s) => s.status === "DONE");

  await prisma.$transaction(async (tx) => {
    await tx.planStage.update({
      where: { id: stage.id },
      data: { status: "DONE" },
    });
    await tx.projectItem.updateMany({
      where: {
        projectId,
        tier: project.tier ?? "BASE",
        stageNumber: stage.number,
      },
      data: { purchased: true, delivered: true },
    });
    if (next) {
      await tx.planStage.update({
        where: { id: next.id },
        data: { status: "IN_PROGRESS" },
      });
      await tx.projectItem.updateMany({
        where: {
          projectId,
          tier: project.tier ?? "BASE",
          stageNumber: next.number,
        },
        data: { delivered: true },
      });
    }
    if (escrow) {
      await tx.escrowAccount.update({
        where: { projectId },
        data: {
          released: allDone ? project.total : newReleased,
          status: allDone ? "RELEASED" : "FUNDED",
        },
      });
    }
  });
}

export async function completeProject(projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { stages: true },
  });
  if (!project) throw new Error("Проект не найден");
  if (project.stages.some((stage) => stage.status !== "DONE")) {
    throw new Error("Сначала завершите все этапы плана");
  }
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await tx.escrowAccount.updateMany({
      where: { projectId },
      data: { released: project.total, status: "RELEASED" },
    });
  });
}

export function projectTitle(project: {
  roomType: string;
  area: number;
  code: string;
}): string {
  return `Обустройство ${roomGenitive(project.roomType)} ${project.area} м²`;
}
