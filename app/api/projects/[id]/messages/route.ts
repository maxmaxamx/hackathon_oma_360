import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";

const schema = z.object({ text: z.string().trim().min(1).max(2000) });

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

  const after = new URL(request.url).searchParams.get("after");
  const messages = await prisma.chatMessage.findMany({
    where: { projectId: id },
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
    take: after ? 100 : 200,
    ...(after ? { cursor: { id: after }, skip: 1 } : {}),
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      author: message.author,
      mine: message.authorId === user.id,
    })),
  });
}

export async function POST(
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
  if (!project.foremanId) {
    return NextResponse.json(
      { error: "Прораб ещё не назначен." },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Введите сообщение." }, { status: 400 });
  }
  const message = await prisma.chatMessage.create({
    data: { projectId: id, authorId: user.id, text: parsed.data.text },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  return NextResponse.json({
    message: {
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      author: message.author,
      mine: true,
    },
  });
}
