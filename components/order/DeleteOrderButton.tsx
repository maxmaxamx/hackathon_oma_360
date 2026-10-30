"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteOrderButton({
  projectId,
  redirectTo,
  className = "",
}: {
  projectId: string;
  redirectTo?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    const confirmed = window.confirm(
      "Удалить заказ? Вся смета, план и переписка будут удалены без возможности восстановления.",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить заказ.");
        return;
      }
      if (redirectTo) {
        window.location.assign(redirectTo);
      } else {
        window.location.reload();
      }
    } catch {
      setError("Нет связи с сервером.");
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void remove()}
        disabled={loading}
        className={`btn btn-outline btn-sm text-danger hover:border-danger hover:bg-danger-soft ${className}`}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Удаляем…
          </>
        ) : (
          <>
            <Trash2 size={14} /> Удалить
          </>
        )}
      </button>
      {error ? <span className="text-[10px] text-danger">{error}</span> : null}
    </span>
  );
}
