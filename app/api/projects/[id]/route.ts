import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { ROOM_TYPES } from "@/lib/constants";

const schema = z.object({
  roomType: z.enum(ROOM_TYPES.map((r) => r.value) as [string, ...string[]]),
  area: z.number().min(2).max(300),
  ceiling: z.number().min(1.8).max(6),
  description: z.string().max(500).default(""),
  budget: z.number().min(500).max(500000),
});

export async function PATCH(
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
    return NextResponse.json({ error: "Проверьте параметры комнаты." }, { status: 400 });
  }
  await prisma.project.update({
    where: { id },
    data: {
      ...parsed.data,
      areaLabel: `${parsed.data.area} м²`,
      status: project.status === "DRAFT" ? "DRAFT" : project.status,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
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
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
