"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={logout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded px-2 py-2 text-sm text-muted transition hover:bg-subtle hover:text-ink"
      title="Выйти"
    >
      <LogOut size={16} />
      {!compact ? <span>Выйти</span> : null}
    </button>
  );
}
