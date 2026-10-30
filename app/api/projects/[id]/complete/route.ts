import { NextResponse } from "next/server";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { completeProject } from "@/lib/estimate/plan";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (user.role !== "FOREMAN") {
    return NextResponse.json({ error: "Только прораб может завершить заказ." }, { status: 403 });
  }
  const { id } = await params;
  const project = await projectFor(user, id, { foremanOnly: true });
  if (!project) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }
  try {
    await completeProject(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось завершить заказ.",
      },
      { status: 400 },
    );
  }
}
