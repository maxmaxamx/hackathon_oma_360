import { prisma } from "./prisma";

export async function generateOrderCode(): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const code = `OMA-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await prisma.project.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `OMA-${Date.now().toString().slice(-6)}`;
}

export async function pickForeman(): Promise<string | null> {
  const foremen = await prisma.user.findMany({
    where: { role: "FOREMAN" },
    select: { id: true },
  });
  if (foremen.length === 0) return null;

  const counts = await prisma.project.groupBy({
    by: ["foremanId"],
    where: { status: { in: ["ACTIVE", "FINAL_READY"] }, foremanId: { not: null } },
    _count: { _all: true },
  });
  const countMap = new Map(
    counts.map((c) => [c.foremanId as string, c._count._all]),
  );
  const min = Math.min(...foremen.map((f) => countMap.get(f.id) ?? 0));
  const candidates = foremen.filter((f) => (countMap.get(f.id) ?? 0) === min);
  return candidates[Math.floor(Math.random() * candidates.length)].id;
}

export function projectProgress(stages: { status: string }[]): number {
  if (stages.length === 0) return 0;
  const done = stages.filter((s) => s.status === "DONE").length;
  return Math.round((done / stages.length) * 100);
}

export function currentStageNumber(
  stages: { number: number; status: string }[],
): number | null {
  const active = stages.find((s) => s.status === "IN_PROGRESS");
  if (active) return active.number;
  const pending = stages.find((s) => s.status === "PENDING");
  return pending?.number ?? null;
}

export function canAccessProject(
  user: { id: string; role: string },
  project: { clientId: string; foremanId: string | null },
): boolean {
  if (user.role === "FOREMAN") return project.foremanId === user.id;
  return project.clientId === user.id;
}
