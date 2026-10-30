"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

export function StageAction({
  projectId,
  stageId,
}: {
  projectId: string;
  stageId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stages/${stageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось завершить этап.");
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void complete()}
        disabled={loading}
        className="btn btn-primary btn-sm"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Сохраняем…
          </>
        ) : (
          <>
            <CheckCircle2 size={14} /> Завершить этап
          </>
        )}
      </button>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
      <span className="text-[10px] text-muted">
        Товары этапа станут «Куплено», выплата освободится из Escrow
      </span>
    </div>
  );
}
