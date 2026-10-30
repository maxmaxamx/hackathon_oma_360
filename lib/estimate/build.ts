import "server-only";
import { prisma } from "@/lib/prisma";
import { searchCatalog, type OmaProduct } from "@/lib/oma/client";
import { chatJson } from "@/lib/ai/client";
import {
  preferencesResponseSchema,
  type StylePreferences,
} from "@/lib/ai/schemas";
import {
  preferencesSystemPrompt,
  preferencesUserPrompt,
  type AnswerEntry,
} from "@/lib/ai/prompts";
import { TIER_META, TIERS, type Tier, roomLabel } from "@/lib/constants";
import { parseAnswers, toBrief } from "@/lib/project";
import { buildNeeds, type MaterialNeed } from "./needs";
import { roundUpToStep } from "./geometry";

export type BuiltItem = {
  tier: Tier;
  stageNumber: number;
  category: string;
  productId: string;
  name: string;
  link: string;
  image: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  calcNote: string;
};

export type BuiltPackage = {
  tier: Tier;
  title: string;
  subtitle: string;
  summary: string;
  total: number;
  itemsCount: number;
  budgetCap: number;
  items: BuiltItem[];
};

const TIER_INDEX: Record<Tier, number> = {
  ECONOMY: 0.16,
  BASE: 0.5,
  LUX: 0.84,
};

const TIER_MULTIPLIER: Record<Tier, number> = {
  ECONOMY: 0.78,
  BASE: 1,
  LUX: 1.35,
};

export function unitSizeFor(product: OmaProduct, need: MaterialNeed): number {
  switch (need.demand.kind) {
    case "area":
      return product.coverage ?? need.defaultPack.coverage ?? 1;
    case "mass":
      return product.mass ?? need.defaultPack.mass ?? 1;
    case "volume":
      return product.volume ?? need.defaultPack.volume ?? 1;
    case "length":
      return product.length ?? 1;
    case "count":
      return 1;
  }
}

export function quantityFor(product: OmaProduct, need: MaterialNeed): number {
  const unitSize = unitSizeFor(product, need);
  const raw =
    need.demand.kind === "count"
      ? need.demand.value
      : need.demand.value / Math.max(0.0001, unitSize);
  let qty = Math.max(1, Math.ceil(raw));
  if (need.demand.kind !== "count" && product.inc > 1) {
    qty = roundUpToStep(qty, product.inc);
  }
  return qty;
}

function pickProduct(
  candidates: OmaProduct[],
  need: MaterialNeed,
  tier: Tier,
  query: string,
): OmaProduct | null {
  if (candidates.length === 0) return null;

  const STOP_WORDS = new Set(["для", "под", "над", "при", "или", "это"]);
  const tokens = [
    ...new Set(
      (query.toLowerCase().match(/[a-zа-яё0-9]+(?:[.,][0-9]+)?/g) ?? []).filter(
        (token) => token.length >= 3 && !STOP_WORDS.has(token),
      ),
    ),
  ];
  const scored = candidates.map((product) => {
    const name = product.name.toLowerCase();
    const score = tokens.reduce(
      (sum, token) => (name.includes(token) ? sum + 1 : sum),
      0,
    );
    return { product, score };
  });
  const best = Math.max(0, ...scored.map((entry) => entry.score));
  const relevant =
    best > 0 ? scored.filter((entry) => entry.score === best) : scored;

  const sorted = relevant
    .map((entry) => entry.product)
    .sort((a, b) => {
      const aSize = unitSizeFor(a, need);
      const bSize = unitSizeFor(b, need);
      const aEff = a.price / Math.max(0.0001, aSize);
      const bEff = b.price / Math.max(0.0001, bSize);
      return aEff - bEff;
    });
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((sorted.length - 1) * TIER_INDEX[tier])),
  );
  return sorted[index];
}

function buildItem(
  product: OmaProduct,
  need: MaterialNeed,
  tier: Tier,
): BuiltItem {
  const quantity = quantityFor(product, need);
  return {
    tier,
    stageNumber: need.stage,
    category: need.category,
    productId: product.id,
    name: product.name,
    link: product.link,
    image: product.image,
    unit: product.measure,
    quantity,
    unitPrice: product.price,
    total: Math.round(quantity * product.price * 100) / 100,
    calcNote: need.note,
  };
}

function fallbackPreferences(
  answers: AnswerEntry[],
  roomType: string,
): StylePreferences {
  const style = answers.find((a) => a.id === "style")?.values[0] ?? "scandi";
  const floor = answers.find((a) => a.id === "floor")?.values[0] ?? "laminate";
  const map: Record<
    string,
    { styleQuery: string; floorQuery: string; wallQuery: string; furnitureSuffix: string }
  > = {
    scandi: {
      styleQuery: "скандинавский минимализм, светлое дерево, белые стены",
      floorQuery: floor === "parquet" ? "паркетная доска дуб" : "ламинат светлый дуб",
      wallQuery: "краска интерьерная белая матовая",
      furnitureSuffix: "скандинавский",
    },
    loft: {
      styleQuery: "современный лофт, бетон, графит, чёрный металл",
      floorQuery: floor === "parquet" ? "паркетная доска дуб" : "ламинат серый",
      wallQuery: "краска интерьерная серая матовая",
      furnitureSuffix: "лофт",
    },
    classic: {
      styleQuery: "неоклассика, симметрия, светлая палитра",
      floorQuery: "паркетная доска дуб",
      wallQuery: "обои флизелиновые под покраску",
      furnitureSuffix: "неоклассика",
    },
    japandi: {
      styleQuery: "джапанди, тёплые землистые тона, натуральное дерево",
      floorQuery: "ламинат дуб натуральный",
      wallQuery: "обои под покраску тёплый бежевый",
      furnitureSuffix: "джапанди",
    },
  };
  const picked = map[style] ?? map.scandi;
  if (roomType === "bathroom") {
    return {
      ...picked,
      styleQuery: `${picked.styleQuery}, влагостойкая керамика`,
      floorQuery: "керамогранит для пола",
      wallQuery: "плитка керамическая для стен",
    };
  }
  return picked;
}

async function preferencesFor(
  brief: ReturnType<typeof toBrief>,
  answers: AnswerEntry[],
  projectId: string,
): Promise<StylePreferences> {
  const fallback = fallbackPreferences(answers, brief.roomType);
  const raw = await chatJson(
    preferencesSystemPrompt(),
    preferencesUserPrompt({ brief, answers }),
    {
      temperature: 0.5,
      maxTokens: 1400,
      timeoutMs: 30000,
      sessionId: `oma360-${projectId}-estimate`,
    },
  );
  const parsed = preferencesResponseSchema.safeParse(raw);
  if (!parsed.success) return fallback;
  return {
    styleQuery: parsed.data.styleQuery || fallback.styleQuery,
    floorQuery: parsed.data.floorQuery || fallback.floorQuery,
    wallQuery: parsed.data.wallQuery || fallback.wallQuery,
    furnitureSuffix:
      parsed.data.furnitureSuffix || fallback.furnitureSuffix,
  };
}

function queryFor(need: MaterialNeed, prefs: StylePreferences): string {
  if (need.key === "flooring" || need.key === "parquet") {
    return prefs.floorQuery || need.query;
  }
  if (need.key === "paint-walls" || need.key === "wallpaper") {
    return prefs.wallQuery || need.query;
  }
  if (need.category === "furniture" && prefs.furnitureSuffix) {
    return `${need.query} ${prefs.furnitureSuffix}`.trim();
  }
  return need.query;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function updateJob(jobId: string, progress: number): Promise<void> {
  try {
    await prisma.aiJob.update({
      where: { id: jobId },
      data: { progress: Math.min(99, Math.max(1, Math.round(progress))) },
    });
  } catch {
    // job may have been removed
  }
}

export async function runEstimateJob(
  jobId: string,
  projectId: string,
): Promise<void> {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Проект не найден");

    const answers = parseAnswers(project.answersJson);
    const brief = toBrief(project);
    const needs = buildNeeds({
      roomType: project.roomType,
      area: project.area,
      ceiling: project.ceiling,
      answers,
    });

    await updateJob(jobId, 6);
    const prefs = await preferencesFor(brief, answers, projectId);
    await updateJob(jobId, 12);

    let done = 0;
    const searchDeadline = Date.now() + 90000;
    const searched = await mapLimit(needs, 2, async (need) => {
      let products: OmaProduct[] = [];
      try {
        products = await searchCatalog(queryFor(need, prefs), 40, {
          deadline: searchDeadline,
        });
        if (products.length === 0 && need.altQuery) {
          products = await searchCatalog(need.altQuery, 40, {
            deadline: searchDeadline,
          });
        }
        if (products.length === 0) {
          products = await searchCatalog(need.query, 40, {
            deadline: searchDeadline,
          });
        }
      } catch (error) {
        console.warn(`[estimate] search failed for "${need.query}":`, error);
      }
      done += 1;
      await updateJob(jobId, 12 + (done / needs.length) * 48);
      return { need, products };
    });

    await updateJob(jobId, 64);

    const goodsBudget = project.budget / 1.5;
    const packages: BuiltPackage[] = TIERS.map((tier) => {
      const items: BuiltItem[] = [];
      for (const { need, products } of searched) {
        const product = pickProduct(
          products,
          need,
          tier,
          queryFor(need, prefs),
        );
        if (!product) continue;
        items.push(buildItem(product, need, tier));
      }
      items.sort((a, b) => a.stageNumber - b.stageNumber);
      const total = Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
      const meta = TIER_META[tier];
      return {
        tier,
        title: meta.title,
        subtitle: meta.subtitle,
        summary: items.length
          ? `${items.length} позиций • ${Math.round(total / Math.max(1, project.area))} BYN/м² с запасом`
          : "Нет подходящих позиций в каталоге",
        total,
        itemsCount: items.length,
        budgetCap: Math.round(goodsBudget * TIER_MULTIPLIER[tier]),
        items,
      };
    });

    if (packages.every((p) => p.items.length === 0)) {
      throw new Error(
        "Каталог OMA не вернул ни одной позиции. Проверьте соединение и повторите расчёт.",
      );
    }
    if (packages.find((p) => p.tier === "BASE")?.items.length === 0) {
      throw new Error("Не удалось собрать базовый пакет из реальных товаров каталога.");
    }

    await updateJob(jobId, 82);

    await prisma.$transaction(async (tx) => {
      await tx.projectItem.deleteMany({ where: { projectId } });
      await tx.estimatePackage.deleteMany({ where: { projectId } });
      for (const pack of packages) {
        await tx.estimatePackage.create({
          data: {
            projectId,
            tier: pack.tier,
            title: pack.title,
            subtitle: pack.subtitle,
            summary: pack.summary,
            total: pack.total,
            itemsCount: pack.itemsCount,
            budgetCap: pack.budgetCap,
          },
        });
        if (pack.items.length > 0) {
          await tx.projectItem.createMany({
            data: pack.items.map((item) => ({
              projectId,
              tier: item.tier,
              stageNumber: item.stageNumber,
              category: item.category,
              productId: item.productId,
              name: item.name,
              link: item.link,
              image: item.image,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              calcNote: item.calcNote,
            })),
          });
        }
      }
      await tx.project.update({
        where: { id: projectId },
        data: { status: "ESTIMATE_READY" },
      });
    });

    await prisma.aiJob.update({
      where: { id: jobId },
      data: { status: "DONE", progress: 100 },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка расчёта";
    await prisma.aiJob
      .update({
        where: { id: jobId },
        data: { status: "FAILED", error: message, progress: 100 },
      })
      .catch(() => undefined);
  }
}

export async function startEstimateJob(projectId: string): Promise<string> {
  const running = await prisma.aiJob.findFirst({
    where: {
      projectId,
      type: "estimate",
      status: "RUNNING",
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (running) return running.id;

  const job = await prisma.aiJob.create({
    data: { projectId, type: "estimate", status: "RUNNING", progress: 2 },
  });
  void runEstimateJob(job.id, projectId);
  return job.id;
}
