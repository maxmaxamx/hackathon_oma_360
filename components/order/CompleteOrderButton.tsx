"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock } from "lucide-react";

export function CompleteOrderButton({
  projectId,
  allDone,
}: {
  projectId: string;
  allDone: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/complete`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось завершить заказ.");
        return;
      }
      router.refresh();
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void complete()}
        disabled={!allDone || loading}
        className="btn btn-accent w-full"
        title={allDone ? "" : "Сначала завершите все этапы"}
      >
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Закрываем заказ…
          </>
        ) : allDone ? (
          <>
            <CheckCircle2 size={15} /> Завершить заказ
          </>
        ) : (
          <>
            <Lock size={14} /> Завершить заказ
          </>
        )}
      </button>
      {!allDone ? (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-muted">
          Кнопка станет активной после завершения всех 10 этапов.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-center text-[10px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
