import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container-page max-w-3xl flex-1 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Публичная оферта
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            OMA 360 предоставляет услуги по расчёту сметы, подбору материалов из
            официального каталога OMA, формированию плана работ и сопровождению
            заказа аттестованным прорабом.
          </p>
          <p>
            Итоговая стоимость складывается из стоимости товаров каталога и
            стоимости услуг прораба, равной 50% от стоимости товаров. Смета
            фиксируется в договоре после подтверждения заказа.
          </p>
          <p>
            Оплата этапов проводится через Escrow-счёт. Средства переводятся
            прорабу после подтверждения приёмки этапа. Демонстрационная версия
            сервиса не производит реальных списаний.
          </p>
          <p>
            Визуализация комнаты формируется автоматически и носит ознакомительный
            характер. Итоговый результат может отличаться в зависимости от
            геометрии помещения и фактических артикулов каталога.
          </p>
        </div>
        <Link href="/" className="link-royal mt-8 inline-block text-sm">
          ← На главную
        </Link>
      </main>
      <Footer />
    </div>
  );
}
