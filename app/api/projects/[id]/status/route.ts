import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const project = await projectFor(user, id);
  if (!project) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }

  const type = new URL(request.url).searchParams.get("type") ?? "estimate";
  const job = await prisma.aiJob.findFirst({
    where: { projectId: id, type },
    orderBy: { createdAt: "desc" },
  });
  const fresh = await prisma.project.findUnique({
    where: { id },
    select: { status: true, previewImage: true, total: true },
  });

  return NextResponse.json({
    job: job
      ? {
          id: job.id,
          status: job.status,
          progress: job.progress,
          error: job.error,
        }
      : null,
    project: fresh,
  });
}
