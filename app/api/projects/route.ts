import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser, unauthorized } from "@/lib/api-auth";
import { generateOrderCode } from "@/lib/orders";
import { ROOM_TYPES } from "@/lib/constants";

const schema = z.object({
  roomType: z.enum(ROOM_TYPES.map((r) => r.value) as [string, ...string[]]),
  area: z.number().min(2).max(300),
  ceiling: z.number().min(1.8).max(6),
  description: z.string().max(500).default(""),
  budget: z.number().min(500).max(500000),
});

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user) return unauthorized();
  if (user.role !== "CLIENT") {
    return NextResponse.json({ error: "Только клиент может создать заказ." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте параметры комнаты." }, { status: 400 });
  }
  const project = await prisma.project.create({
    data: {
      code: await generateOrderCode(),
      clientId: user.id,
      status: "DRAFT",
      ...parsed.data,
      areaLabel: `${parsed.data.area} м²`,
    },
  });
  return NextResponse.json({ id: project.id });
}
