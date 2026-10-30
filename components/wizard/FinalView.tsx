"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  Info,
  Loader2,
  Lock,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMoney } from "@/lib/format";

export type FinalStageDto = {
  id: string;
  number: number;
  title: string;
  description: string;
  durationDays: number;
  materialsTotal: number;
  laborTotal: number;
  budget: number;
  status: string;
  items: { id: string; name: string; quantity: number; unit: string; total: number }[];
};

export function FinalView({
  projectId,
  roomLabel,
  area,
  previewImage,
  materialsTotal,
  servicesTotal,
  total,
  stages,
  foreman,
}: {
  projectId: string;
  roomLabel: string;
  area: number;
  previewImage: string | null;
  materialsTotal: number;
  servicesTotal: number;
  total: number;
  stages: FinalStageDto[];
  foreman: { name: string } | null;
}) {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(previewImage);
  const [imageState, setImageState] = useState<"idle" | "loading" | "failed">(
    previewImage ? "idle" : "loading",
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const started = useRef(false);

  const startPreview = useCallback(async () => {
    setImageState("loading");
    setImageError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/preview`, {
        method: "POST",
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) {
        setImageState("failed");
        setImageError(data.error ?? "Не удалось запустить визуализацию.");
      }
    } catch {
      setImageState("failed");
      setImageError("Нет связи с сервером.");
    }
  }, [projectId]);

  useEffect(() => {
    if (previewImage || started.current) return;
    started.current = true;
    void startPreview();
  }, [previewImage, startPreview]);

  useEffect(() => {
    if (imageState !== "loading") return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/projects/${projectId}/status?type=preview`);
        const data = (await res.json()) as {
          job?: { status: string; error?: string } | null;
          project?: { previewImage: string | null } | null;
        };
        if (cancelled) return;
        if (data.project?.previewImage) {
          setImage(data.project.previewImage);
          setImageState("idle");
          return;
        }
        if (data.job?.status === "DONE" && data.project?.previewImage) {
          setImage(data.project.previewImage);
          setImageState("idle");
          return;
        }
        if (data.job?.status === "FAILED") {
          setImageState("failed");
          setImageError(data.job.error ?? "Визуализация недоступна.");
          return;
        }
        if (attempts > 200) {
          setImageState("failed");
          setImageError("Генерация заняла слишком много времени.");
          return;
        }
        setTimeout(poll, 2500);
      } catch {
        if (!cancelled) setTimeout(poll, 3500);
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [imageState, projectId]);

  async function pay() {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/pay`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось подтвердить оплату.");
        return;
      }
      router.push(`/app`);
      router.refresh();
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setPaying(false);
    }
  }

  const allItems = stages.flatMap((stage) => stage.items);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.55fr_0.95fr]">
        <section className="card order-2 overflow-hidden lg:order-none lg:col-start-1 lg:row-start-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">План реализации</h2>
            <span className="badge bg-royal-soft text-royal">
              {stages.length} этапов
            </span>
          </div>
          <div className="max-h-none divide-y divide-line overflow-visible">
            {stages.map((stage, index) => (
              <div key={stage.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-royal">
                    Этап {stage.number} • {stage.durationDays} дн.
                  </span>
                  <StatusBadge status={stage.status}>
                    {index === 0 ? "Готов к старту" : stage.status === "DONE" ? "Завершён" : "В очереди"}
                  </StatusBadge>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold">{stage.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  {stage.description}
                </p>
                {stage.items.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {stage.items.slice(0, 4).map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 text-[11px] text-muted"
                      >
                        <span className="truncate">• {item.name}</span>
                        <span className="shrink-0">{item.quantity} {item.unit}</span>
                      </li>
                    ))}
                    {stage.items.length > 4 ? (
                      <li className="text-[10px] text-muted">
                        + ещё {stage.items.length - 4} позиций
                      </li>
                    ) : null}
                  </ul>
                ) : null}
                <div className="mt-2 flex items-center justify-between border-t border-line/70 pt-1.5 text-[11px]">
                  <span className="text-muted">Бюджет этапа</span>
                  <span className="font-semibold">{formatMoney(stage.budget)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="order-1 space-y-4 lg:order-none lg:col-start-1 lg:row-start-1">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles size={15} className="text-accent" />
                Визуализация • {roomLabel} {area} м²
              </div>
              <span className="text-[10px] text-muted">Предпросмотр</span>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden bg-subtle">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={`Визуализация: ${roomLabel} ${area} м²`}
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                />
              ) : imageState === "loading" ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                  <div className="shimmer absolute inset-0 opacity-70" />
                  <div className="relative flex flex-col items-center gap-2">
                    <Loader2 size={26} className="animate-spin text-royal" />
                    <span className="text-xs font-medium">
                      Генерируем визуализацию…
                    </span>
                    <span className="text-[10px] text-muted">
                      Обычно 20–60 секунд
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-royal-soft via-white to-accent-soft px-6 text-center">
                  <ImageIcon size={30} className="text-royal/70" />
                  <div>
                    <div className="text-sm font-semibold">
                      Изображение недоступно
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-muted">
                      {imageError ??
                        "Визуализация временно недоступна. Смета и план сформированы корректно."}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      started.current = true;
                      void startPreview();
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    <RefreshCw size={13} /> Повторить
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-line px-5 py-3.5">
              <div className="flex items-start gap-2 rounded border border-royal/15 bg-royal-soft/50 px-3 py-2.5">
                <Info size={15} className="mt-0.5 shrink-0 text-royal" />
                <p className="text-[11px] leading-relaxed text-royal">
                  Правовое уведомление о 3D-моделировании: примерная
                  визуализация интерьера на основе выбранных артикулов OMA.
                  Итоговый результат может незначительно отличаться от
                  изображения в зависимости от геометрии стен.
                </p>
              </div>
            </div>

            <div className="border-t border-line">
              <button
                type="button"
                onClick={() => setShowItems((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition hover:bg-subtle"
              >
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <PackageSearch size={15} className="text-royal" />
                  Артикулы каталога OMA
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                  {allItems.length} позиций
                  <ChevronDown
                    size={14}
                    className={`transition ${showItems ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {showItems ? (
                <ul className="max-h-64 divide-y divide-line overflow-y-auto border-t border-line">
                  {allItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 px-5 py-2 text-[11px] transition-colors hover:bg-subtle/70"
                    >
                      <span className="min-w-0 truncate text-muted" title={item.name}>
                        {item.name}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {item.quantity} {item.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        <section className="order-3 space-y-4 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="card p-5">
            <div className="eyebrow">Назначенный специалист</div>
            {foreman ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={foreman.name} size={48} />
                  <div>
                    <div className="text-base font-semibold">{foreman.name}</div>
                    <div className="text-[11px] text-muted">
                      Ведущий сертифицированный прораб OMA
                    </div>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 border-t border-line pt-4 text-xs">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-success" />
                    Прошёл полную аттестацию технадзора OMA
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-success" />
                    Личная материальная ответственность по договору
                  </li>
                </ul>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Прораб будет назначен автоматически при запуске заказа.
              </p>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold">Итоговая смета</h2>
              <span className="badge bg-royal-soft text-royal">
                <Lock size={10} /> Гарантия цены
              </span>
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted">Материалы каталога OMA</dt>
                <dd className="font-semibold">{formatMoney(materialsTotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">
                  Работы под ключ
                  <span className="block text-[10px]">
                    услуги прораба — 50% стоимости товаров
                  </span>
                </dt>
                <dd className="font-semibold">{formatMoney(servicesTotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted">Комплектация и доставка</dt>
                <dd className="font-semibold text-success">Бесплатно</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-1 border-t border-line pt-4">
              <span className="text-sm font-semibold">К оплате:</span>
              <span className="text-2xl font-extrabold tracking-tight">
                {formatMoney(total)}
              </span>
            </div>

            <div className="mt-4 rounded border border-line bg-subtle px-3 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck size={15} className="text-success" />
                Безопасная сделка Escrow
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                Средства замораживаются на нейтральном счёте и переводятся
                подрядчику только после подписания вами электронного акта
                приёмки этапа.
              </p>
            </div>

            {error ? (
              <div className="mt-3 rounded border border-danger/30 bg-danger-soft px-3 py-2 text-[11px] text-danger">
                {error}
              </div>
            ) : null}

            <button
              onClick={() => void pay()}
              disabled={paying}
              className="btn btn-accent mt-4 w-full h-12"
            >
              {paying ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Передаём прорабу…
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Оплатить
                </>
              )}
            </button>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-muted">
              Нажимая «Оплатить», вы соглашаетесь с условиями публичной оферты.
              Платёж в демо-режиме не списывается.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
