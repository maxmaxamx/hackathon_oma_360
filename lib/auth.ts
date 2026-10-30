import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "oma_session";
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET || "oma-360-dev-secret-change-me",
  );
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "CLIENT" | "FOREMAN";
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: {
  id: string;
  role: string;
}): Promise<void> {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role === "FOREMAN" ? "FOREMAN" : "CLIENT",
    };
  } catch {
    return null;
  }
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  return user;
}

export async function requireRole(
  role: "CLIENT" | "FOREMAN",
): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(user.role === "FOREMAN" ? "/pro" : "/app");
  }
  return user;
}

export function homeFor(role: string): string {
  return role === "FOREMAN" ? "/pro" : "/app";
}
