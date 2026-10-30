import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { advanceStage } from "@/lib/estimate/plan";

const schema = z.object({ action: z.enum(["start", "complete"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> },
) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (user.role !== "FOREMAN") {
    return NextResponse.json({ error: "Только прораб может менять этапы." }, { status: 403 });
  }
  const { id, stageId } = await params;
  const project = await projectFor(user, id, { foremanOnly: true });
  if (!project) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректное действие." }, { status: 400 });
  }
  try {
    await advanceStage(id, stageId, parsed.data.action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось обновить этап.",
      },
      { status: 400 },
    );
  }
}
