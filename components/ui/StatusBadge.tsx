import type { ReactNode } from "react";

export function StatusBadge({
  status,
  children,
}: {
  status: string;
  children?: ReactNode;
}) {
  const styles: Record<string, string> = {
    DRAFT: "bg-subtle text-muted border border-line",
    QUESTIONS_READY: "bg-royal-soft text-royal",
    ESTIMATE_READY: "bg-royal-soft text-royal",
    FINAL_READY: "bg-accent-soft text-accent",
    ACTIVE: "bg-royal-soft text-royal",
    COMPLETED: "bg-success-soft text-success",
    PENDING: "bg-subtle text-muted border border-line",
    IN_PROGRESS: "bg-accent-soft text-accent",
    DONE: "bg-success-soft text-success",
    FAILED: "bg-danger-soft text-danger",
  };
  return (
    <span className={`badge ${styles[status] ?? styles.DRAFT}`}>
      {children}
    </span>
  );
}

export function Dot({ tone = "royal" }: { tone?: "royal" | "success" | "accent" }) {
  const colors = {
    royal: "bg-royal",
    success: "bg-success",
    accent: "bg-accent",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[tone]}`} />;
}
