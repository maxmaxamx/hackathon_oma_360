import { NextResponse } from "next/server";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { payProject } from "@/lib/estimate/plan";

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
  try {
    await payProject(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Не удалось подтвердить оплату.",
      },
      { status: 400 },
    );
  }
}
