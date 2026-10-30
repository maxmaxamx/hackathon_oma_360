import { NextResponse } from "next/server";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { startPreviewJob } from "@/lib/estimate/plan";

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
  if (!project.tier) {
    return NextResponse.json({ error: "Сначала выберите пакет." }, { status: 400 });
  }
  const jobId = await startPreviewJob(id);
  return NextResponse.json({ jobId });
}
