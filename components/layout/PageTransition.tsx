"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

function routeLevel(path: string | null): number | null {
  if (!path) return null;
  if (path.startsWith("/app/new")) {
    if (path.startsWith("/app/new/questions")) return 2;
    if (path.startsWith("/app/new/packages")) return 3;
    if (path.startsWith("/app/new/final")) return 4;
    return 1;
  }
  if (/^\/(app|pro)\/orders\/[^/]+/.test(path)) return 2;
  if (path === "/app" || path === "/pro") return 0;
  return null;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  const animation = useMemo(() => {
    const from = routeLevel(previous.current);
    const to = routeLevel(pathname);
    if (from === null || to === null || from === to) return "animate-page";
    return to > from ? "animate-swipe-left" : "animate-swipe-right";
  }, [pathname]);

  useEffect(() => {
    previous.current = pathname;
  }, [pathname]);

  return (
    <div key={pathname} className={animation}>
      {children}
    </div>
  );
}
