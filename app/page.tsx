import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Boxes,
  Calculator,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { buttonClass } from "@/components/ui/button-class";

const demoItems = [
  { name: "Ламинат и подложка (расчёт по геометрии)", price: 432 },
  { name: "Краска интерьерная + подготовка стен", price: 289.5 },
  { name: "Электроустановочные изделия и кабель", price: 194 },
  { name: "Работа сертифицированного мастера (14 дн.)", price: 950 },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const total = 1865.5;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />

      <main className="flex-1">
        <PageTransition>
        <section className="relative overflow-hidden">
          <div className="animate-float pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-royal/10 blur-3xl" />
          <div className="animate-float animate-float-delayed pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

          <div className="container-page relative grid gap-14 py-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-20">
            <div className="animate-fade-up">
              <h1 className="text-[32px] font-extrabold leading-[1.08] tracking-tight md:text-[44px] lg:text-[52px]">
                Умное обустройство
                <br />
                комнаты под ключ
                <br />
                <span className="inline-block bg-gradient-to-r from-[#0040a8] via-[#2b59c3] to-[#ff5a00] bg-clip-text text-transparent">
                  за месяц
                </span>
                <span className="text-accent">.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
                Автоматизированный цикл ремонта без переплат: умная смета по
                официальному каталогу OMA, аттестованные прорабы и защищённая
                оплата через Escrow.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/auth?mode=login"
                  className={buttonClass(
                    "accent",
                    "md",
                    "group h-12 px-6 text-[15px]",
                  )}
                >
                  Войти в личный кабинет{" "}
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
                <Link
                  href="/auth?mode=register"
                  className={buttonClass("outline", "md", "h-12 px-6 text-[15px]")}
                >
                  Зарегистрироваться <UserRoundPlus size={17} />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted">
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck size={15} className="text-royal" />
                  Гарантия гипермаркета OMA
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock3 size={15} className="text-royal" />
                  Фиксированная смета в договоре
                </span>
              </div>

              <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6">
                <div>
                  <dt className="text-2xl font-extrabold text-royal">0%</dt>
                  <dd className="mt-1 text-xs leading-snug text-muted">
                    Лишних материалов в смете
                  </dd>
                </div>
                <div className="border-l border-line pl-4">
                  <dt className="text-2xl font-extrabold">14 дней</dt>
                  <dd className="mt-1 text-xs leading-snug text-muted">
                    Фиксированный срок работ
                  </dd>
                </div>
                <div className="border-l border-line pl-4">
                  <dt className="text-2xl font-extrabold text-success">
                    100% Escrow
                  </dt>
                  <dd className="mt-1 text-xs leading-snug text-muted">
                    Безопасная оплата этапов
                  </dd>
                </div>
              </dl>
            </div>

            <div className="animate-fade-up lg:pl-4">
              <div className="card overflow-hidden shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_24px_60px_-28px_rgba(43,89,195,0.35)]">
                <div className="flex items-start justify-between gap-4 border-b border-line p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-royal-soft text-royal">
                      <Bot size={20} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold">
                          Демонстрация сметы комнаты
                        </h2>
                        <span className="badge bg-success-soft text-success">
                          Live
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        Гостиная • 18.4 м² • Стандарт OMA Home
                      </p>
                    </div>
                  </div>
                  <span className="hidden items-center gap-1.5 whitespace-nowrap rounded border border-line px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted sm:flex">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                    Каталог OMA live
                  </span>
                </div>

                <ul className="divide-y divide-line">
                  {demoItems.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-center justify-between gap-4 px-5 py-4 text-sm transition-colors hover:bg-subtle/60"
                    >
                      <span className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-royal" />
                        {item.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-line bg-subtle px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-muted">
                        Итого под ключ без скрытых доплат
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-xl font-extrabold">
                          {formatMoney(total)}
                        </span>
                        <span className="text-xs text-muted line-through">
                          {formatMoney(2140)}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded border border-success/30 bg-success-soft px-2.5 py-1.5 text-xs font-semibold text-success">
                      <ShieldCheck size={14} /> Депонировано в Escrow
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  {
                    icon: Calculator,
                    title: "Параметры",
                    text: "Площадь и стиль за 2 минуты",
                  },
                  {
                    icon: Boxes,
                    title: "Комплектация",
                    text: "Доставка со склада OMA",
                  },
                  {
                    icon: CheckCircle2,
                    title: "Сдача работ",
                    text: "Выплата после приёмки",
                  },
                ].map((card) => (
                  <div key={card.title} className="card card-hover p-3.5">
                    <card.icon size={16} className="text-royal" />
                    <div className="mt-2 text-[12px] font-semibold">
                      {card.title}
                    </div>
                    <div className="mt-0.5 text-[10.5px] leading-snug text-muted">
                      {card.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        </PageTransition>
      </main>

      <Footer />
    </div>
  );
}
