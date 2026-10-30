import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  ImageIcon,
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
import { DeleteOrderButton } from "@/components/order/DeleteOrderButton";
import { currentStageNumber, projectProgress } from "@/lib/orders";
import { roomGenitive, roomLabel, statusLabel, tierTitle } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Заказ — OMA 360" };

export default async function ClientOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("CLIENT");
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, clientId: user.id },
    include: {
      stages: { orderBy: { number: "asc" } },
      items: true,
      foreman: { select: { name: true } },
      escrow: true,
    },
  });
  if (!project) notFound();

  if (project.status === "FINAL_READY") {
    redirect(`/app/new/final?project=${project.id}`);
  }
  if (project.status !== "ACTIVE" && project.status !== "COMPLETED") {
    redirect(`/app?filter=active`);
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
        <Link href="/app" className="hover:text-royal">
          Главная
        </Link>
        <ChevronRight size={11} />
        <Link href="/app" className="hover:text-royal">
          Личный кабинет
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
              Стоимость под ключ
            </div>
            <div className="text-xl font-extrabold text-royal">
              {formatMoney(project.total)}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted">
              <ShieldCheck size={11} className="text-success" /> Гарантия OMA 24
              мес.
            </div>
            <div className="mt-2">
              <DeleteOrderButton projectId={project.id} redirectTo="/app" />
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted">
          Материалы {formatMoney(project.materialsTotal)} · работы{" "}
          {formatMoney(project.servicesTotal)} · Минск
        </div>
      </div>

      {project.status === "COMPLETED" ? (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft px-4 py-3">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
          <div>
            <div className="text-sm font-semibold text-success">
              Заказ завершён и сдан
            </div>
            <div className="mt-0.5 text-[11px] text-muted">
              Акт подписан, гарантийный паспорт объекта активен. Escrow-средства
              полностью переведены прорабу.
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">
                  Таймлайн и этапы ремонта
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Прогресс финансирования контролируется через независимый
                  технадзор OMA
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
            <OrderTimeline stages={stages} />
          </div>
        </div>

        <aside className="space-y-4">
          <EscrowCard
            total={project.escrow?.total ?? project.total}
            funded={project.escrow?.funded ?? project.total}
            released={project.escrow?.released ?? 0}
            status={project.escrow?.status ?? "FUNDED"}
          />

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                <ImageIcon size={14} className="text-royal" /> Визуализация
                комнаты
              </span>
              <span className="text-[10px] text-muted">Предпросмотр</span>
            </div>
            {project.previewImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={project.previewImage}
                  alt={`Визуализация: ${roomLabel(project.roomType)} ${project.area} м²`}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
                <p className="px-3 py-2 text-[10px] leading-relaxed text-muted">
                  Примерная визуализация на основе выбранных товаров. Итоговый
                  результат может отличаться.
                </p>
              </>
            ) : (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-gradient-to-br from-royal-soft via-white to-accent-soft px-5 text-center">
                <ImageIcon size={24} className="text-royal/70" />
                <p className="text-[11px] leading-relaxed text-muted">
                  Визуализация пока недоступна. Смета и план сформированы
                  корректно.
                </p>
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              Прораб проекта
            </div>
            {project.foreman ? (
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={project.foreman.name} size={42} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {project.foreman.name}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    Сертифицированный прораб OMA
                  </div>
                </div>
                <UserRound size={16} className="ml-auto text-muted" />
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">Прораб назначается.</p>
            )}
            <div className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
              Все работы выполняются по договору с фиксированной ценой. Приёмка
              этапа подтверждается технадзором.
            </div>
          </div>

          <Chat
            projectId={project.id}
            otherName={project.foreman?.name ?? "прораб"}
            disabled={!project.foreman}
          />

          <div className="flex items-start gap-2.5 rounded border border-line bg-subtle px-3.5 py-3 text-[11px] leading-relaxed text-muted">
            <Info size={15} className="mt-0.5 shrink-0 text-royal" />
            <span>
              Все материалы куплены в торговой сети OMA по договору подряда. В
              случае брака или задержки OMA 360 производит замену за 24 часа.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
