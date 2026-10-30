import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { buildFinalPlan, startPreviewJob } from "@/lib/estimate/plan";

const schema = z.object({ tier: z.enum(["ECONOMY", "BASE", "LUX"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const project = await projectFor(user, id, { clientOnly: true });
  if (!project) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Выберите пакет." }, { status: 400 });
  }
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Пакет нельзя изменить после оплаты заказа." },
      { status: 400 },
    );
  }

  const pack = await prisma.estimatePackage.findUnique({
    where: { projectId_tier: { projectId: id, tier: parsed.data.tier } },
  });
  if (!pack || pack.itemsCount === 0) {
    return NextResponse.json(
      { error: "В этом пакете нет доступных товаров." },
      { status: 400 },
    );
  }

  await prisma.project.update({
    where: { id },
    data: { tier: parsed.data.tier, previewImage: null },
  });

  try {
    await buildFinalPlan(id);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось сформировать план.",
      },
      { status: 500 },
    );
  }

  const previewJobId = await startPreviewJob(id);
  return NextResponse.json({ ok: true, previewJobId });
}
