"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  PackageCheck,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import { CATEGORY_LABELS, TIER_META, type Tier } from "@/lib/constants";
import { formatMoney, plural } from "@/lib/format";

export type PackageItemDto = {
  id: string;
  tier: string;
  stageNumber: number;
  category: string;
  name: string;
  link: string;
  image: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  calcNote: string | null;
};

export type PackageDto = {
  tier: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  total: number;
  itemsCount: number;
  budgetCap: number;
};

const ORDER: Tier[] = ["ECONOMY", "BASE", "LUX"];

export function PackagesView({
  projectId,
  area,
  budget,
  packages: initialPackages,
  items: initialItems,
  initialTier,
}: {
  projectId: string;
  area: number;
  budget: number;
  packages: PackageDto[];
  items: PackageItemDto[];
  initialTier?: string | null;
}) {
  const router = useRouter();
  const [packages, setPackages] = useState(initialPackages);
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<Tier>(
    (initialTier as Tier) || "BASE",
  );
  const [jobStatus, setJobStatus] = useState<string | null>(
    initialPackages.length ? "DONE" : null,
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);

  const startEstimate = useCallback(async () => {
    setError(null);
    setJobStatus("RUNNING");
    setProgress(2);
    try {
      const res = await fetch(`/api/projects/${projectId}/estimate`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось запустить расчёт.");
        setJobStatus("FAILED");
        return;
      }
      setJobStatus("RUNNING");
    } catch {
      setError("Нет связи с сервером.");
      setJobStatus("FAILED");
    }
  }, [projectId]);

  useEffect(() => {
    if (initialPackages.length > 0) {
      setPackages(initialPackages);
      setItems(initialItems);
      setJobStatus("DONE");
    }
  }, [initialPackages, initialItems]);

  useEffect(() => {
    if (initialPackages.length > 0 || started.current) return;
    started.current = true;
    void startEstimate();
  }, [initialPackages.length, startEstimate]);

  useEffect(() => {
    if (jobStatus !== "RUNNING") return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/projects/${projectId}/status?type=estimate`);
        const data = (await res.json()) as {
          job?: { status: string; progress: number; error?: string } | null;
        };
        if (cancelled) return;
        if (data.job) {
          setProgress(data.job.progress);
          if (data.job.status === "DONE") {
            setJobStatus("DONE");
            setError(null);
            router.refresh();
            return;
          }
          if (data.job.status === "FAILED") {
            setJobStatus("FAILED");
            setError(data.job.error ?? "Расчёт не удался.");
            return;
          }
        }
        if (attempts > 300) {
          setJobStatus("FAILED");
          setError("Расчёт занял слишком много времени. Попробуйте ещё раз.");
          return;
        }
        setTimeout(poll, 1500);
      } catch {
        if (!cancelled) setTimeout(poll, 2500);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [jobStatus, projectId, router]);

  const selectedPackage = packages.find((pack) => pack.tier === selected);
  const selectedItems = items.filter((item) => item.tier === selected);

  const grouped = selectedItems.reduce<Record<number, PackageItemDto[]>>(
    (acc, item) => {
      acc[item.stageNumber] = acc[item.stageNumber] ?? [];
      acc[item.stageNumber].push(item);
      return acc;
    },
    {},
  );

  async function choose() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selected }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось выбрать пакет.");
        return;
      }
      router.push(`/app/new/final?project=${projectId}`);
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setSubmitting(false);
    }
  }

  if (jobStatus === "RUNNING") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-royal-soft text-royal">
            <Sparkles size={26} className="animate-pulse" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">
            Собираем смету по каталогу OMA
          </h2>
          <p className="mt-2 text-sm text-muted">
            Подбираем реальные товары, считаем количество с запасом 7% и
            формируем три пакета комплектации.
          </p>
          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-royal transition-all duration-500"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>
              {progress < 15
                ? "Анализ параметров и пожеланий"
                : progress < 64
                  ? "Поиск товаров в каталоге OMA"
                  : progress < 85
                    ? "Сборка пакетов"
                    : "Сохранение спецификации"}
            </span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card overflow-hidden p-8 text-center">
          <div className="mx-auto flex h-14 w-14 animate-pulse-soft items-center justify-center rounded-full bg-royal-soft text-royal">
            <Sparkles size={26} />
          </div>
          <h2 className="mt-5 text-lg font-semibold">
            Создаём план работ
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Распределяем материалы по 10 этапам, рассчитываем бюджет каждого
            этапа и назначаем прораба. Обычно это занимает 5–15 секунд.
          </p>
          <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="animate-indeterminate h-full rounded-full bg-gradient-to-r from-royal/40 via-royal to-accent" />
          </div>
          <div className="mt-3 flex justify-center gap-1.5">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-royal/60"
                style={{ animationDelay: `${dot * 160}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (jobStatus === "FAILED" || packages.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-danger">
            <RefreshCw size={24} />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Не удалось собрать смету</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            {error ??
              "Каталог OMA временно недоступен. Параметры и ответы сохранены — можно повторить расчёт."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => void startEstimate()}
              className="btn btn-primary"
            >
              <RefreshCw size={16} /> Повторить расчёт
            </button>
            <Link
              href={`/app/new/questions?project=${projectId}`}
              className="btn btn-outline"
            >
              Изменить ответы
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Пакеты материалов и комплектации
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Автоматический расчёт черновых и чистовых материалов с нормативным
            запасом +7% на подрезку и стыковку из официального каталога OMA.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-xs text-muted">
          <CheckCircle2 size={15} className="text-success" />
          Прямые поставки со склада OMA • Минск
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {ORDER.map((tier) => {
          const pack = packages.find((item) => item.tier === tier);
          if (!pack) return null;
          const meta = TIER_META[tier];
          const active = selected === tier;
          const popular = tier === "BASE";
          const tierItems = items.filter((item) => item.tier === tier);
          const categories = [...new Set(tierItems.map((item) => item.category))]
            .slice(0, 4)
            .map((category) => CATEGORY_LABELS[category] ?? category);
          return (
            <button
              key={tier}
              type="button"
              onClick={() => setSelected(tier)}
              className={`card card-hover relative flex flex-col p-5 text-left transition ${
                active
                  ? "border-royal shadow-[0_4px_16px_-2px_rgba(43,89,195,0.10)]"
                  : "hover:border-line-strong"
              }`}
            >
              {popular ? (
                <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <Star size={10} /> Хит выбора
                </span>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                  {meta.code}
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    active
                      ? "border-royal bg-royal text-white"
                      : "border-line-strong bg-white"
                  }`}
                >
                  {active ? <Check size={11} strokeWidth={3} /> : null}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{meta.title}</h2>
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight">
                  {formatMoney(pack.total)}
                </span>
                <span className="text-[11px] text-muted">
                  ~{Math.round(pack.total / Math.max(1, area))} BYN/м² с запасом
                </span>
              </div>
              <p className="mt-3 line-clamp-4 min-h-[60px] text-xs leading-relaxed text-muted">
                {meta.description}
              </p>
              <ul className="mt-4 space-y-2 border-t border-line pt-4">
                {categories.map((category) => (
                  <li
                    key={category}
                    className="flex items-start gap-2 text-xs text-ink"
                  >
                    <Check size={13} className="mt-0.5 shrink-0 text-royal" />
                    {category}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs">
                <span className="text-muted">
                  {pack.itemsCount}{" "}
                  {plural(pack.itemsCount, "позиция", "позиции", "позиций")} в
                  каталоге
                </span>
                <span className={active ? "font-semibold text-accent" : "font-semibold text-royal"}>
                  {active ? "Выбран ✓" : "Выбрать"}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">
              Спецификация OMA: пакет «{selectedPackage?.title}»
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Включает технологический запас +7% на подрезку и монтажные риски
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded border border-success/30 bg-success-soft px-2.5 py-1.5 text-[11px] font-semibold text-success">
            <PackageCheck size={14} /> В наличии на складе OMA
          </span>
        </div>

        <div className="divide-y divide-line">
          {selectedItems.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 px-5 py-3.5 md:grid-cols-[1fr_auto_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-subtle px-1.5 py-0.5 text-[10px] text-muted">
                    Этап {item.stageNumber}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block truncate text-sm font-medium transition hover:text-royal"
                  title={item.name}
                >
                  {item.name}
                </a>
                {item.calcNote ? (
                  <div className="mt-0.5 text-[11px] text-muted">
                    {item.calcNote}
                  </div>
                ) : null}
              </div>
              <div className="text-right md:w-36">
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  Расчётный объём
                </div>
                <div className="text-xs font-semibold">
                  {item.quantity} {item.unit}
                </div>
              </div>
              <div className="text-right md:w-32">
                <div className="text-[10px] uppercase tracking-wide text-muted">
                  Сумма OMA
                </div>
                <div className="text-sm font-bold text-royal">
                  {formatMoney(item.total)}
                </div>
              </div>
            </div>
          ))}
          {selectedItems.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted">
              В этом пакете пока нет позиций.
            </div>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <Link
          href={`/app/new/questions?project=${projectId}`}
          className="btn btn-outline"
        >
          ← Назад к вопросам
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right">
            <div className="text-[11px] text-muted">
              Итого по смете «{selectedPackage?.title}»
            </div>
            <div className="text-lg font-extrabold">
              {formatMoney(selectedPackage?.total ?? 0)}
            </div>
          </div>
          <button
            onClick={() => void choose()}
            disabled={submitting}
            className="btn btn-accent"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Формируем план…
              </>
            ) : (
              <>
                Выбрать и перейти к согласованию <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
