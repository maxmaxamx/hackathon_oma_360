import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState, Avatar } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { buttonClass } from "@/components/ui/button-class";
import { currentStageNumber, projectProgress } from "@/lib/orders";
import { roomGenitive, roomLabel, statusLabel, tierTitle } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Мои объекты — OMA 360" };

type Filter = "all" | "active" | "completed";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "В процессе" },
  { key: "completed", label: "Завершённые" },
];

export default async function ProOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireRole("FOREMAN");
  const params = await searchParams;
  const filter: Filter =
    params.filter === "active" || params.filter === "completed"
      ? params.filter
      : "all";

  const all = await prisma.project.findMany({
    where: {
      foremanId: user.id,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    include: {
      stages: { orderBy: { number: "asc" } },
      client: { select: { name: true } },
      escrow: true,
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projects = all.filter((project) => {
    if (filter === "active") return project.status === "ACTIVE";
    if (filter === "completed") return project.status === "COMPLETED";
    return true;
  });

  const counts = {
    all: all.length,
    active: all.filter((p) => p.status === "ACTIVE").length,
    completed: all.filter((p) => p.status === "COMPLETED").length,
  };

  return (
    <div className="container-page py-8 md:py-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Мои объекты
        </h1>
        <p className="mt-2 text-sm text-muted">
          Управление ремонтами, сдача этапов и закупка стройматериалов в OMA
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-0">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/pro" : `/pro?filter=${tab.key}`}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition ${
                filter === tab.key
                  ? "border-royal font-semibold text-royal"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 rounded-full bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                {counts[tab.key]}
              </span>
            </Link>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 pb-2 text-xs text-muted">
          <SlidersHorizontal size={13} /> Сортировка: по срочности
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {projects.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Объектов пока нет"
            text="Заказы распределяются автоматически: новый оплаченный проект получит прораб с наименьшей загрузкой. Проверьте позже."
          />
        ) : null}

        {projects.map((project) => {
          const progress = projectProgress(project.stages);
          const current = currentStageNumber(project.stages);
          const currentStage = project.stages.find((s) => s.number === current);
          const allDone = project.stages.every((s) => s.status === "DONE");

          return (
            <article key={project.id} className="card card-hover overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-subtle px-2 py-1 text-[10px] font-semibold tracking-wide text-muted">
                    №{project.code}
                  </span>
                  <StatusBadge status={project.status}>
                    {project.status === "ACTIVE" && currentStage
                      ? `В работе • этап ${currentStage.number} из ${project.stages.length}: ${currentStage.title}`
                      : allDone
                        ? "Завершён и сдан заказчику"
                        : statusLabel(project.status)}
                  </StatusBadge>
                </div>
                <span className="text-[11px] text-muted">
                  Обновлено {formatDate(project.updatedAt)}
                </span>
              </div>

              <div className="px-5 py-4">
                <h2 className="text-lg font-bold">
                  Обустройство {roomGenitive(project.roomType).toLowerCase()}{" "}
                  {project.area} м²{" "}
                  <span className="inline-flex items-center gap-1 font-normal text-muted">
                    <MapPin size={13} /> Минск
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {project.tier
                    ? `Тариф сметы: ${tierTitle(project.tier)} (${formatMoney(project.total)})`
                    : ""}
                  {project.paidAt ? ` • Оплачен ${formatDate(project.paidAt)}` : ""}
                  {project.completedAt
                    ? ` • Закрыт ${formatDate(project.completedAt)}`
                    : ""}
                </p>

                {project.status === "ACTIVE" ? (
                  <div className="mt-4 rounded border border-line bg-subtle px-3.5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <ShieldCheck size={14} className="text-success" />
                        Счёт Escrow:{" "}
                        {formatMoney(project.escrow?.funded ?? project.total)} • к
                        выплате за этап{" "}
                        {formatMoney(currentStage?.budget ?? 0)}
                      </span>
                      <span className="text-xs font-semibold text-royal">
                        {progress}% выполнено
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-royal"
                        style={{ width: `${Math.max(2, progress)}%` }}
                      />
                    </div>
                    {currentStage ? (
                      <div className="mt-2 text-[11px] text-muted">
                        Текущий этап {currentStage.number}:{" "}
                        <span className="text-ink">{currentStage.title}</span> •{" "}
                        {currentStage.durationDays} дн.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded border border-success/30 bg-success-soft px-3.5 py-3 text-[11px] text-success">
                    Акт подписан технадзором и заказчиком. Выплата{" "}
                    {formatMoney(project.total)} получена. Гарантийный паспорт
                    объекта активен.
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={project.client.name} size={34} />
                    <div>
                      <div className="text-xs font-semibold">
                        Заказчик: {project.client.name}
                      </div>
                      <div className="text-[10px] text-muted">
                        Договор №{project.code}
                      </div>
                    </div>
                    {project._count.messages > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-royal-soft px-1.5 py-0.5 text-[10px] font-semibold text-royal">
                        <MessageSquare size={10} /> {project._count.messages}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/pro/orders/${project.id}`}
                    className={buttonClass("primary", "sm")}
                  >
                    Подробнее об объекте <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
