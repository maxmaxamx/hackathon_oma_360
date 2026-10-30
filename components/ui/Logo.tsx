import Link from "next/link";

export function Logo({
  href = "/",
  className = "",
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex shrink-0 items-center ${className}`}
      aria-label="OMA 360 — на главную"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-oma360.png"
        alt="OMA 360"
        className={`w-auto ${compact ? "h-10" : "h-12"}`}
      />
    </Link>
  );
}
