import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-white">
      <div className="container-page flex flex-col items-center justify-between gap-4 py-8 text-xs text-muted md:flex-row">
        <div className="flex items-center gap-4">
          <Logo compact />
          <span>© {new Date().getFullYear()} OMA 360. Все права защищены.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/legal/privacy" className="transition hover:text-royal">
            Политика конфиденциальности
          </Link>
          <Link href="/legal/terms" className="transition hover:text-royal">
            Публичная оферта
          </Link>
        </div>
      </div>
    </footer>
  );
}
