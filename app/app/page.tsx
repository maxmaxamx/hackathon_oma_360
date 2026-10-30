import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  MessageSquare,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeleteOrderButton } from "@/components/order/DeleteOrderButton";
import { buttonClass } from "@/components/ui/button-class";
import { currentStageNumber, projectProgress } from "@/lib/orders";
import { roomGenitive, roomLabel, statusLabel, tierTitle } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Мои заказы — OMA 360" };

type Filter = "all" | "active" | "completed";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "В работе" },
  { key: "completed", label: "Завершённые" },
];

export default async function ClientOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireRole("CLIENT");
  const params = await searchParams;
  const filter: Filter =
    params.filter === "active" || params.filter === "completed"
      ? params.filter
      : "all";

  const all = await prisma.project.findMany({
    where: { clientId: user.id },
    include: {
      stages: { orderBy: { number: "asc" } },
      foreman: { select: { name: true } },
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

  function resumeHref(project: (typeof all)[number]): string {
    if (project.status === "FINAL_READY") {
      return `/app/new/final?project=${project.id}`;
    }
    if (project.status === "ESTIMATE_READY") {
      return `/app/new/packages?project=${project.id}`;
    }
    if (project.status === "QUESTIONS_READY" || project.questionsJson) {
      return `/app/new/questions?project=${project.id}`;
    }
    return `/app/new?project=${project.id}`;
  }

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Мои заказы
          </h1>
          <p className="mt-2 text-sm text-muted">
            Отслеживание хода ремонта, контроль этапов и безопасные расчёты через
            Escrow OMA
          </p>
        </div>
        <Link href="/app/new" className={buttonClass("primary")}>
          <Plus size={16} /> Новый заказ
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-0">
        <div className="flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/app" : `/app?filter=${tab.key}`}
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
            title="Заказов пока нет"
            text="Создайте первый проект: укажите параметры комнаты, ответьте на 5 вопросов и получите три варианта сметы из реального каталога OMA."
            action={
              <Link href="/app/new" className={buttonClass("accent")}>
                Начать обустройство <ArrowRight size={16} />
              </Link>
            }
          />
        ) : null}

        {projects.map((project) => {
          const progress = projectProgress(project.stages);
          const current = currentStageNumber(project.stages);
          const currentStage = project.stages.find((s) => s.number === current);
          const isDraft =
            project.status === "DRAFT" ||
            project.status === "QUESTIONS_READY" ||
            project.status === "ESTIMATE_READY" ||
            project.status === "FINAL_READY";
          const released = project.escrow?.released ?? 0;
          const totalDays = project.stages.reduce(
            (sum, stage) => sum + stage.durationDays,
            0,
          );

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
                      : statusLabel(project.status)}
                  </StatusBadge>
                </div>
                <span className="text-[11px] text-muted">
                  Обновлено {formatDate(project.updatedAt)}
                </span>
              </div>

              <div className="px-5 py-4">
                <h2 className="text-lg font-bold">
                  {project.status === "COMPLETED"
                    ? roomLabel(project.roomType)
                    : `Обустройство ${roomGenitive(project.roomType)}`}{" "}
                  {project.area} м²{" "}
                  <span className="inline-flex items-center gap-1 font-normal text-muted">
                    <MapPin size={13} /> Минск
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {project.tier
                    ? `Тариф сметы: ${tierTitle(project.tier)} (${
                        project.total ? formatMoney(project.total) : "—"
                      })`
                    : "Смета ещё не сформирована"}
                  {project.status === "ACTIVE" && totalDays > 0
                    ? ` • План: ${totalDays} рабочих дней`
                    : ""}
                  {project.status === "COMPLETED" && project.completedAt
                    ? ` • Закрыт ${formatDate(project.completedAt)}`
                    : ""}
                </p>

                {project.status === "ACTIVE" || project.status === "COMPLETED" ? (
                  <div className="mt-4 rounded border border-line bg-subtle px-3.5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <ShieldCheck size={14} className="text-success" />
                        Счёт Escrow:{" "}
                        {formatMoney(
                          project.escrow?.funded ??
                            project.escrow?.total ??
                            project.total,
                        )}{" "}
                        {released > 0
                          ? `• выплачено ${formatMoney(released)}`
                          : "зарезервировано"}
                      </span>
                      <span className="text-xs font-semibold text-royal">
                        {progress}% выполнено
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-royal transition-all"
                        style={{ width: `${Math.max(2, progress)}%` }}
                      />
                    </div>
                    {project.stages.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px]">
                        {project.stages.slice(0, 4).map((stage) => (
                          <span
                            key={stage.id}
                            className={
                              stage.status === "DONE"
                                ? "text-success"
                                : stage.status === "IN_PROGRESS"
                                  ? "font-semibold text-royal"
                                  : "text-muted"
                            }
                          >
                            Этап {stage.number}: {stage.title.split(" ")[0]}
                            {stage.status === "DONE"
                              ? " (Принят)"
                              : stage.status === "IN_PROGRESS"
                                ? " (Текущий)"
                                : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {project.foreman ? (
                      <>
                        <Avatar name={project.foreman.name} size={34} />
                        <div>
                          <div className="text-xs font-semibold">
                            {project.foreman.name}
                          </div>
                          <div className="text-[10px] text-muted">
                            Прораб проекта
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted">
                        {isDraft
                          ? "Оформление заказа ещё не завершено"
                          : "Прораб назначается"}
                      </div>
                    )}
                    {project._count.messages > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-royal-soft px-1.5 py-0.5 text-[10px] font-semibold text-royal">
                        <MessageSquare size={10} /> {project._count.messages}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <DeleteOrderButton projectId={project.id} />
                    <Link
                      href={
                        isDraft
                          ? resumeHref(project)
                          : `/app/orders/${project.id}`
                      }
                      className={buttonClass(
                        isDraft ? "outline" : "primary",
                        "sm",
                      )}
                    >
                      {isDraft ? "Продолжить оформление" : "Подробнее о заказе"}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
