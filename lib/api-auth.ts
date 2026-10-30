import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./auth";
import { prisma } from "./prisma";
import type { Project } from "@prisma/client";

export async function apiUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export function unauthorized() {
  return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Нет доступа к этому заказу." }, { status: 403 });
}

export async function projectFor(
  user: SessionUser,
  id: string,
  options?: { clientOnly?: boolean; foremanOnly?: boolean },
): Promise<Project | null> {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return null;
  if (options?.clientOnly && project.clientId !== user.id) return null;
  if (options?.foremanOnly && project.foremanId !== user.id) return null;
  if (user.role === "FOREMAN") {
    if (project.foremanId !== user.id) return null;
  } else if (project.clientId !== user.id) {
    return null;
  }
  return project;
}
