import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";

const schema = z.object({
  answers: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        values: z.array(z.string()),
        labels: z.array(z.string()),
      }),
    )
    .min(1)
    .max(10),
});

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
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Ответы нельзя изменить после оплаты заказа." },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные ответы." }, { status: 400 });
  }

  const style = parsed.data.answers.find((a) => a.id === "style")?.values[0];

  await prisma.project.update({
    where: { id },
    data: {
      answersJson: JSON.stringify(parsed.data.answers),
      style: style ?? project.style,
    },
  });

  return NextResponse.json({ ok: true });
}
