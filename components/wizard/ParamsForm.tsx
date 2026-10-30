"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Baby,
  Bath,
  BedDouble,
  Briefcase,
  CookingPot,
  Ruler,
  Sofa,
  Sparkles,
} from "lucide-react";
import { ROOM_TYPES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

const roomIcons = {
  living: Sofa,
  bedroom: BedDouble,
  kitchen: CookingPot,
  kids: Baby,
  bathroom: Bath,
  office: Briefcase,
} as const;

const suggestions = [
  "домашний кинотеатр",
  "рабочая зона",
  "зонирование",
  "скрытое хранение",
  "эко-материалы",
];

export type ParamsValues = {
  roomType: string;
  area: number;
  ceiling: number;
  description: string;
  budget: number;
};

export function ParamsForm({
  projectId,
  initial,
}: {
  projectId?: string;
  initial?: Partial<ParamsValues>;
}) {
  const router = useRouter();
  const [roomType, setRoomType] = useState(initial?.roomType ?? "living");
  const [area, setArea] = useState(initial?.area ?? 24);
  const [ceiling, setCeiling] = useState(initial?.ceiling ?? 2.75);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? 8500);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const room = useMemo(
    () => ROOM_TYPES.find((item) => item.value === roomType) ?? ROOM_TYPES[0],
    [roomType],
  );

  function addSuggestion(value: string) {
    setDescription((current) => {
      if (current.toLowerCase().includes(value)) return current;
      const next = current ? `${current.replace(/[.\s]+$/, "")}. ${value}` : value;
      return next.slice(0, 500);
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (area < room.minArea) {
      setError(`Минимальная площадь для «${room.label}» — ${room.minArea} м².`);
      return;
    }
    setLoading(true);
    try {
      const payload = { roomType, area, ceiling, description, budget };
      const res = await fetch(
        projectId ? `/api/projects/${projectId}` : "/api/projects",
        {
          method: projectId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить параметры.");
        return;
      }
      const id = projectId ?? data.id;
      router.push(`/app/new/questions?project=${id}`);
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">1. Тип помещения</h2>
            <p className="mt-1 text-xs text-muted">
              Выберите комнату, которую планируете обустроить или отремонтировать
            </p>
          </div>
          <span className="badge bg-royal-soft text-royal">Обязательно</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ROOM_TYPES.map((item) => {
            const Icon = roomIcons[item.value as keyof typeof roomIcons];
            const active = roomType === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setRoomType(item.value);
                  if (area < item.minArea) setArea(item.minArea);
                }}
                className={`relative flex flex-col items-center rounded border px-2 py-4 transition-all duration-200 hover:-translate-y-0.5 ${
                  active
                    ? "border-royal bg-royal-soft/40"
                    : "border-line bg-white hover:border-line-strong hover:shadow-[0_8px_20px_-16px_rgba(43,89,195,0.4)]"
                }`}
              >
                <Icon
                  size={22}
                  className={active ? "text-royal" : "text-muted"}
                />
                <span className="mt-2.5 text-sm font-semibold">{item.label}</span>
                <span className="mt-0.5 text-[10.5px] text-muted">
                  От {item.minArea} м²
                </span>
                {active ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-royal" />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">2. Площадь комнаты</h2>
              <p className="mt-1 text-xs text-muted">
                Укажите полезную площадь по полу
              </p>
            </div>
            <div className="rounded border border-line px-2.5 py-1 text-right">
              <span className="text-lg font-bold text-royal">{area}</span>
              <span className="ml-1 text-[10px] text-muted">м²</span>
            </div>
          </div>
          <input
            type="range"
            min={2}
            max={60}
            step={1}
            value={area}
            onChange={(e) => setArea(Number(e.target.value))}
            className="mt-6 w-full accent-royal"
            aria-label="Площадь комнаты"
          />
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                min={2}
                max={300}
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="input pr-9"
              />
              <Ruler
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              />
            </div>
            {[16, 24, 35].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setArea(value)}
                className="btn btn-outline btn-sm w-12 px-0"
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold">3. Высота потолков</h2>
              <p className="mt-1 text-xs text-muted">
                Влияет на выбор подвесных систем и шкафов
              </p>
            </div>
            <div className="rounded border border-line px-2.5 py-1 text-right">
              <span className="text-lg font-bold text-royal">
                {ceiling.toFixed(2)}
              </span>
              <span className="ml-1 text-[10px] text-muted">м</span>
            </div>
          </div>
          <input
            type="range"
            min={1.8}
            max={5}
            step={0.05}
            value={ceiling}
            onChange={(e) => setCeiling(Number(e.target.value))}
            className="mt-6 w-full accent-royal"
            aria-label="Высота потолков"
          />
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              min={1.8}
              max={6}
              step={0.05}
              value={ceiling}
              onChange={(e) => setCeiling(Number(e.target.value))}
              className="input w-full"
            />
            {[2.5, 2.75, 3.2].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCeiling(value)}
                className="btn btn-outline btn-sm w-14 px-0"
              >
                {value.toFixed(2).replace(".", ",")}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-5 md:p-6">
        <h2 className="text-base font-semibold">
          4. Для чего нужна комната и что бы вы хотели видеть
        </h2>
        <p className="mt-1 text-xs text-muted">
          Опишите сценарии жизни, функциональные акценты или предпочтения по
          планировке
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => addSuggestion(value)}
              className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1.5 text-[11px] text-muted transition hover:border-royal hover:text-royal"
            >
              <Sparkles size={11} /> {value}
            </button>
          ))}
        </div>
        <textarea
          className="input mt-4 min-h-[110px]"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Например: хотим объединить зону отдыха с домашним кинотеатром. Нужна тихая рабочая зона у окна и продуманное многоуровневое зонирование света…"
        />
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>Учтём описание при подборе материалов из каталога OMA</span>
          <span>{description.length} / 500</span>
        </div>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">5. Планируемый бюджет</h2>
            <p className="mt-1 text-xs text-muted">
              Ориентировочная сумма на чистовые материалы, мебель и декор
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-royal">
              {formatMoney(budget)}
            </div>
            <div className="text-[11px] text-muted">итого под ключ</div>
          </div>
        </div>
        <input
          type="range"
          min={3000}
          max={50000}
          step={500}
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="mt-6 w-full accent-royal"
          aria-label="Бюджет"
        />
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>3 000 BYN · базовый стандарт</span>
          <span>20 000 BYN · оптимальный баланс</span>
          <span>50 000 BYN · премиум</span>
        </div>
        <div className="mt-4 rounded border border-royal/15 bg-royal-soft/60 px-3 py-2.5 text-[11px] leading-relaxed text-royal">
          В смету OMA 360 автоматически закладывается запас +7% на подрезку и
          стыковку. Стоимость услуг прораба — 50% от стоимости товаров.
        </div>
      </section>

      {error ? (
        <div className="rounded border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <Link
          href="/app"
          className="text-sm text-muted transition hover:text-ink"
        >
          ← Вернуться на главную
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary sm:w-auto"
        >
          {loading ? "Сохраняем…" : "Дополнительные вопросы"}
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
