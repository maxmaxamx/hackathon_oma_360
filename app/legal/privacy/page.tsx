import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container-page max-w-3xl flex-1 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Политика конфиденциальности
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted">
          <p>
            OMA 360 обрабатывает персональные данные, необходимые для оформления
            и сопровождения заказа на обустройство помещения: имя, адрес
            электронной почты и историю взаимодействия с сервисом.
          </p>
          <p>
            Мы не запрашиваем контактные данные, кроме имени и адреса электронной
            почты. Связь между клиентом и прорабом осуществляется во встроенном
            чате сервиса.
          </p>
          <p>
            Данные используются исключительно для расчёта сметы, подбора
            материалов из каталога OMA, назначения прораба и ведения заказа. Мы
            не передаём их третьим лицам, кроме случаев, предусмотренных
            законодательством Республики Беларусь.
          </p>
          <p>
            Вы можете запросить удаление аккаунта и связанных данных, направив
            обращение через чат поддержки в личном кабинете.
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
