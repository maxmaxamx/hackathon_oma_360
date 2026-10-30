import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160),
  password: z.string().min(8).max(100),
  role: z.enum(["CLIENT", "FOREMAN"]),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Проверьте имя, email и пароль (минимум 8 символов)." },
        { status: 400 },
      );
    }
    const email = parsed.data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "Аккаунт с таким email уже существует." },
        { status: 409 },
      );
    }
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
      },
    });
    await createSession(user);
    return NextResponse.json({ ok: true, role: user.role });
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать аккаунт. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
