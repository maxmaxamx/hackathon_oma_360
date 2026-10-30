import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Info,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/EmptyState";
import { EscrowCard } from "@/components/order/EscrowCard";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { Chat } from "@/components/order/Chat";
import { CompleteOrderButton } from "@/components/order/CompleteOrderButton";
import { currentStageNumber, projectProgress } from "@/lib/orders";
import { roomGenitive, roomLabel, statusLabel, tierTitle } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Объект — OMA 360" };

export default async function ProOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("FOREMAN");
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, foremanId: user.id },
    include: {
      stages: { orderBy: { number: "asc" } },
      items: true,
      client: { select: { name: true } },
      escrow: true,
    },
  });
  if (!project) notFound();
  if (project.status === "FINAL_READY" || project.status === "COMPLETED") {
    if (project.status === "FINAL_READY") redirect("/pro");
  }
  if (project.status !== "ACTIVE" && project.status !== "COMPLETED") {
    redirect("/pro");
  }

  const tier = project.tier ?? "BASE";
  const items = project.items.filter((item) => item.tier === tier);
  const progress = projectProgress(project.stages);
  const current = currentStageNumber(project.stages);
  const currentStage = project.stages.find((stage) => stage.number === current);
  const allDone = project.stages.every((stage) => stage.status === "DONE");

  const stages = project.stages.map((stage) => ({
    id: stage.id,
    number: stage.number,
    title: stage.title,
    description: stage.description,
    durationDays: stage.durationDays,
    materialsTotal: stage.materialsTotal,
    laborTotal: stage.laborTotal,
    budget: stage.budget,
    status: stage.status,
    items: items
      .filter((item) => item.stageNumber === stage.number)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        total: item.total,
        purchased: item.purchased,
        delivered: item.delivered,
        link: item.link,
      })),
  }));

  return (
    <div className="container-page py-6 md:py-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
        <Link href="/pro" className="hover:text-royal">
          Главная
        </Link>
        <ChevronRight size={11} />
        <Link href="/pro" className="hover:text-royal">
          Мои объекты
        </Link>
        <ChevronRight size={11} />
        <span className="text-ink">Заказ №{project.code}</span>
      </nav>

      <div className="card mt-3 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold md:text-2xl">
              Заказ №{project.code}: Обустройство{" "}
              {roomGenitive(project.roomType)} {project.area} м²
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status}>
                {project.status === "ACTIVE" && allDone
                  ? "Все этапы завершены • ожидает закрытия"
                  : project.status === "ACTIVE" && currentStage
                    ? `В работе • этап ${currentStage.number} из ${project.stages.length}: ${currentStage.title}`
                    : statusLabel(project.status)}
              </StatusBadge>
              <span className="text-[11px] text-muted">
                {project.tier ? `Тариф: ${tierTitle(project.tier)}` : ""}
                {project.paidAt ? ` • оплачен ${formatDate(project.paidAt)}` : ""}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Сумма договора
            </div>
            <div className="text-xl font-extrabold text-royal">
              {formatMoney(project.total)}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted">
              <ShieldCheck size={11} className="text-success" /> Работы застрахованы
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted">
          Материалы {formatMoney(project.materialsTotal)} · ваши работы{" "}
          {formatMoney(project.servicesTotal)} · Минск
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">
                  Таймлайн и этапы ремонта
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Отмечайте этапы по факту выполнения — выплата освобождается
                  автоматически
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded bg-royal-soft px-2.5 py-1 text-xs font-semibold text-royal">
                Готовность: {progress}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-royal transition-all"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>
          </div>
          <div className="px-4 py-4">
            <OrderTimeline
              stages={stages}
              projectId={project.id}
              foremanMode
            />
          </div>
        </div>

        <aside className="space-y-4">
          <EscrowCard
            total={project.escrow?.total ?? project.total}
            funded={project.escrow?.funded ?? project.total}
            released={project.escrow?.released ?? 0}
            status={project.escrow?.status ?? "FUNDED"}
          />

          <div className="card p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              Заказчик
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={project.client.name} size={42} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {project.client.name}
                </div>
                <div className="text-[10px] text-muted">
                  Договор №{project.code} от {formatDate(project.createdAt)}
                </div>
              </div>
              <UserRound size={16} className="ml-auto text-muted" />
            </div>
            {project.previewImage ? (
              <div className="mt-3 overflow-hidden rounded border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.previewImage}
                  alt="Визуализация проекта"
                  className="h-28 w-full object-cover"
                />
              </div>
            ) : null}
          </div>

          <Chat
            projectId={project.id}
            otherName={project.client.name}
            disabled={project.status === "COMPLETED"}
          />

          {project.status === "ACTIVE" ? (
            <div className="card p-4">
              <CompleteOrderButton projectId={project.id} allDone={allDone} />
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded border border-success/30 bg-success-soft px-3.5 py-3 text-[11px] leading-relaxed text-success">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              Заказ завершён. Выплата получена, гарантийный паспорт активирован.
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded border border-line bg-subtle px-3.5 py-3 text-[11px] leading-relaxed text-muted">
            <Info size={15} className="mt-0.5 shrink-0 text-royal" />
            <span>
              Все материалы закуплены в OMA по договору подряда. При браке или
              задержке OMA 360 производит замену за 24 часа.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
