import {
  Check,
  CheckCircle2,
  CircleDollarSign,
  Lock,
  PackageCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/cn";
import { StageAction } from "./StageAction";

export type TimelineItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  total: number;
  purchased: boolean;
  delivered: boolean;
  link: string;
};

export type TimelineStage = {
  id: string;
  number: number;
  title: string;
  description: string;
  durationDays: number;
  materialsTotal: number;
  laborTotal: number;
  budget: number;
  status: string;
  items: TimelineItem[];
};

function StageIcon({ status }: { status: string }) {
  if (status === "DONE") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white">
        <Check size={16} strokeWidth={3} />
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="flex h-8 w-8 animate-pulse-soft items-center justify-center rounded-full bg-royal text-white">
        <Wrench size={15} />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-muted">
      <Lock size={13} />
    </span>
  );
}

export function OrderTimeline({
  stages,
  showPurchaseStatus = true,
  projectId,
  foremanMode = false,
}: {
  stages: TimelineStage[];
  showPurchaseStatus?: boolean;
  projectId?: string;
  foremanMode?: boolean;
}) {
  return (
    <div className="relative space-y-0">
      {stages.map((stage, index) => {
        const active = stage.status === "IN_PROGRESS";
        return (
          <div key={stage.id} className="relative flex gap-4 pb-5">
            {index < stages.length - 1 ? (
              <span className="absolute left-4 top-9 h-[calc(100%-1.5rem)] w-px bg-line" />
            ) : null}
            <div className="relative z-10 pt-1">
              <StageIcon status={stage.status} />
            </div>

            <div
              className={cn(
                "flex-1 overflow-hidden rounded-lg border bg-white transition-shadow duration-200",
                active
                  ? "border-royal shadow-[0_10px_30px_-24px_rgba(43,89,195,0.55)]"
                  : "border-line hover:shadow-[0_10px_24px_-24px_rgba(0,0,0,0.35)]",
                stage.status === "PENDING" ? "opacity-75" : "",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{stage.title}</h3>
                    {active ? (
                      <span className="badge bg-accent-soft text-accent">
                        В процессе
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-muted">
                    {stage.description}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge status={stage.status}>
                    {stage.status === "DONE"
                      ? "Завершён"
                      : stage.status === "IN_PROGRESS"
                        ? "Текущий этап"
                        : `${stage.durationDays} дн.`}
                  </StatusBadge>
                </div>
              </div>

              {stage.items.length > 0 ? (
                <div className="border-t border-line/70 px-4 py-2">
                  <div className="flex items-center justify-between py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-royal">
                    <span className="inline-flex items-center gap-1.5">
                      <PackageCheck size={12} /> Материалы каталога OMA
                    </span>
                    <span>{formatMoney(stage.materialsTotal)}</span>
                  </div>
                  <ul className="divide-y divide-line/60">
                    {stage.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                      >
                        <span className="min-w-0 flex-1">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="line-clamp-2 transition hover:text-royal"
                          >
                            {item.name}
                          </a>
                          {showPurchaseStatus ? (
                            <span
                              className={cn(
                                "mt-0.5 inline-flex items-center gap-1 text-[10px]",
                                item.purchased
                                  ? "text-success"
                                  : item.delivered
                                    ? "text-accent"
                                    : "text-muted",
                              )}
                            >
                              {item.purchased ? (
                                <>
                                  <CheckCircle2 size={10} /> Куплено
                                </>
                              ) : item.delivered ? (
                                <>
                                  <Truck size={10} /> В доставке
                                </>
                              ) : (
                                <>
                                  <Lock size={9} /> Зарезервировано
                                </>
                              )}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="w-24 shrink-0 text-right text-xs font-semibold">
                          {formatMoney(item.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 bg-subtle/60 px-4 py-2.5 text-xs">
                <span className="text-muted">
                  Материалы {formatMoney(stage.materialsTotal)} · работы{" "}
                  {formatMoney(stage.laborTotal)}
                </span>
                <span className="font-semibold">
                  Итого этапа: {formatMoney(stage.budget)}
                </span>
              </div>

              {foremanMode && active && projectId ? (
                <div className="border-t border-line bg-royal-soft/40 px-4 py-3">
                  <StageAction projectId={projectId} stageId={stage.id} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-4 pl-0">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-muted">
          <CircleDollarSign size={14} />
        </span>
        <div className="text-[11px] text-muted">
          Выплата по этапу проходит только после подтверждения приёмки.
        </div>
      </div>
    </div>
  );
}
