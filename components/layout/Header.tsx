"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/EmptyState";
import { LogoutButton } from "./LogoutButton";
import type { SessionUser } from "@/lib/auth";

export function Header({
  user,
  variant = "public",
}: {
  user?: SessionUser | null;
  variant?: "public" | "client" | "pro";
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const home = user
    ? user.role === "FOREMAN"
      ? "/pro"
      : "/app"
    : "/";
  const iconOnly =
    pathname?.startsWith("/app/new") || pathname?.startsWith("/app/orders");
  const displayName =
    user?.role === "CLIENT"
      ? user.name
          .split(" ")
          .filter(Boolean)
          .map((part, index, parts) =>
            index === parts.length - 1 && parts.length > 1
              ? `${part[0]}.`
              : part,
          )
          .join(" ")
      : user?.name;

  return (
    <header
      className={`sticky top-0 z-40 border-b border-line bg-white transition-shadow duration-300 ${
        scrolled ? "shadow-[0_8px_28px_-20px_rgba(0,0,0,0.35)]" : ""
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Logo href={home} />

        {user ? (
          <div className="flex items-center gap-3">
            {!iconOnly ? (
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold leading-tight">
                  {displayName}
                </div>
                <div className="text-[11px] text-muted">
                  {user.role === "FOREMAN" ? "Прораб проекта" : "Клиент"}
                </div>
              </div>
            ) : null}
            <Link
              href={home}
              className={
                iconOnly
                  ? "flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-royal hover:text-royal"
                  : "rounded-full ring-offset-2 transition hover:ring-2 hover:ring-royal/20"
              }
              aria-label="Личный кабинет"
            >
              {iconOnly ? <UserRound size={19} /> : <Avatar name={user.name} size={38} />}
            </Link>
            <LogoutButton />
          </div>
        ) : (
          <Link
            href="/auth?mode=login"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-royal hover:text-royal"
            aria-label="Личный кабинет"
          >
            <UserRound size={19} />
          </Link>
        )}
      </div>
    </header>
  );
}
