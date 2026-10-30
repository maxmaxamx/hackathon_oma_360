import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { startEstimateJob } from "@/lib/estimate/build";

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
  if (!project.answersJson) {
    return NextResponse.json(
      { error: "Сначала ответьте на вопросы AI." },
      { status: 400 },
    );
  }
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Нельзя пересчитать смету по заказу в работе." },
      { status: 400 },
    );
  }

  await prisma.project.update({
    where: { id },
    data: { status: "QUESTIONS_READY" },
  });

  const jobId = await startEstimateJob(id);
  return NextResponse.json({ jobId });
}
