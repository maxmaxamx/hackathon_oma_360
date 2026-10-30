"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calculator, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { Question } from "@/lib/ai/schemas";
import type { AnswerEntry } from "@/lib/ai/prompts";
import { formatMoney } from "@/lib/format";

export function QuestionsForm({
  projectId,
  initialQuestions,
  projectLabel,
  budget,
}: {
  projectId: string;
  initialQuestions: Question[] | null;
  projectLabel: string;
  budget: number;
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(initialQuestions);
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const question of initialQuestions ?? []) {
      map[question.id] = question.defaultValue.length
        ? question.defaultValue
        : [question.options[0]?.value].filter(Boolean);
    }
    return map;
  });
  const [loading, setLoading] = useState(!initialQuestions);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/questions`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        questions?: Question[];
        error?: string;
      };
      if (!res.ok || !data.questions) {
        setError(data.error ?? "Не удалось подготовить вопросы.");
        return;
      }
      setQuestions(data.questions);
      const map: Record<string, string[]> = {};
      for (const question of data.questions) {
        map[question.id] = question.defaultValue.length
          ? question.defaultValue
          : [question.options[0]?.value].filter(Boolean);
      }
      setAnswers(map);
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (initialQuestions || started.current) return;
    started.current = true;
    void generate();
  }, [generate, initialQuestions]);

  function toggle(question: Question, value: string) {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      if (question.type === "single") {
        return { ...current, [question.id]: [value] };
      }
      return {
        ...current,
        [question.id]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!questions) return;
    const entries: AnswerEntry[] = questions.map((question) => {
      const values = answers[question.id] ?? [];
      return {
        id: question.id,
        title: question.title,
        values,
        labels: question.options
          .filter((option) => values.includes(option.value))
          .map((option) => option.label),
      };
    });
    if (entries.some((entry) => entry.values.length === 0)) {
      setError("Ответьте на все вопросы — это влияет на точность сметы.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: entries }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить ответы.");
        return;
      }
      router.push(`/app/new/packages?project=${projectId}`);
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Calculator size={15} className="text-royal" />
          <span className="font-semibold">Контекст расчёта</span>
          <span className="text-muted">
            {projectLabel} • Бюджет: {formatMoney(budget)}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Данные зафиксированы
        </span>
      </div>

      <div className="eyebrow text-royal">ШАГ 2 ИЗ 4</div>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
        Вопросы для точного расчёта
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Ответьте на 5 уточняющих вопросов OMA 360, чтобы подобрать совместимые
        стройматериалы без переплат и остатков.
      </p>
      <div className="mt-5 flex items-center gap-4">
        <div className="h-0.5 flex-1 bg-line">
          <div className="h-0.5 w-1/2 bg-royal" />
        </div>
        <span className="text-[11px] text-muted">50% завершено</span>
      </div>

      {loading ? (
        <div className="card flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <Loader2 size={28} className="animate-spin text-royal" />
          <div>
            <div className="text-sm font-semibold">
              Подбираем уточняющие вопросы…
            </div>
            <div className="mt-1 text-xs text-muted">
              Обычно это занимает 5–15 секунд
            </div>
          </div>
        </div>
      ) : null}

      {!loading && !questions ? (
        <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
          <p className="text-sm text-muted">
            {error ?? "Вопросы не были сформированы."}
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} /> Попробовать снова
          </button>
        </div>
      ) : null}

      {!loading && questions ? (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const selected = answers[question.id] ?? [];
            const multi = question.type === "multi";
            return (
              <section key={question.id} className="card p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-royal-soft text-xs font-bold text-royal">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold">{question.title}</h2>
                    {question.subtitle ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {question.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`mt-4 grid gap-3 pl-0 sm:pl-12 ${
                    question.options.length === 3
                      ? "sm:grid-cols-3"
                      : question.options.length === 2
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-2 lg:grid-cols-4"
                  }`}
                >
                  {question.options.map((option) => {
                    const active = selected.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggle(question, option.value)}
                        className={`relative rounded border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                          active
                            ? "border-royal bg-royal-soft/30"
                            : "border-line bg-white hover:border-line-strong hover:shadow-[0_8px_20px_-16px_rgba(43,89,195,0.4)]"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center border transition ${
                            multi ? "rounded-[3px]" : "rounded-full"
                          } ${
                            active
                              ? "animate-pop border-royal bg-royal text-white"
                              : "border-line-strong bg-white"
                          }`}
                        >
                          {active ? (
                            multi ? (
                              <Check size={10} strokeWidth={3} />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-white" />
                            )
                          ) : null}
                        </span>
                        <div className="mt-2 text-sm font-semibold">
                          {option.label}
                        </div>
                        <div className="mt-1 text-[11px] leading-snug text-muted">
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {error && questions ? (
        <div className="mt-4 rounded border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <Link
          href={`/app/new?project=${projectId}`}
          className="btn btn-outline"
        >
          ← Назад к параметрам
        </Link>
        <button
          type="submit"
          disabled={submitting || loading || !questions}
          className="btn btn-accent"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Сохраняем…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Рассчитать смету OMA
            </>
          )}
          {!submitting ? <ArrowRight size={16} /> : null}
        </button>
      </div>
    </form>
  );
}
