"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HardHat,
  Home,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

type Mode = "login" | "register";

export function AuthForm({ initialMode }: { initialMode: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<"CLIENT" | "FOREMAN">("CLIENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tabDirection, setTabDirection] = useState<"forward" | "back" | null>(
    null,
  );

  function switchMode(next: Mode) {
    if (next === mode) return;
    setTabDirection(next === "register" ? "forward" : "back");
    setMode(next);
    setError(null);
  }

  const tabAnimation =
    tabDirection === "forward"
      ? "animate-tab-left"
      : tabDirection === "back"
        ? "animate-tab-right"
        : "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "register" && !consent) {
      setError("Подтвердите согласие с условиями сервиса.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        mode === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "register"
              ? { name, email, password, role, consent }
              : { email, password },
          ),
        },
      );
      const data = (await res.json()) as { error?: string; role?: string };
      if (!res.ok) {
        setError(data.error ?? "Что-то пошло не так.");
        return;
      }
      router.push(data.role === "FOREMAN" ? "/pro" : "/app");
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full max-w-[480px] p-6 shadow-[0_10px_40px_-20px_rgba(26,29,32,0.18)] sm:p-8">
      <div className="flex flex-col items-center text-center">
        <Logo href="/" compact />
        <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted">
          Единая цифровая экосистема ремонта, прозрачных смет и безопасных
          расчётов в Беларуси
        </p>
      </div>

      <div className="relative mt-6 grid grid-cols-2 rounded border border-line bg-subtle p-1">
        <span
          className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded bg-white shadow-sm transition-transform duration-300 ease-out ${
            mode === "register" ? "translate-x-full" : "translate-x-0"
          }`}
        />
        {(["login", "register"] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => switchMode(value)}
            className={`relative z-10 rounded px-3 py-2.5 text-sm font-semibold transition-colors duration-300 ${
              mode === value ? "text-royal" : "text-muted hover:text-ink"
            }`}
          >
            {value === "login" ? "Вход" : "Регистрация"}
          </button>
        ))}
      </div>

      <form
        key={mode}
        onSubmit={submit}
        className={`mt-6 space-y-4 ${tabAnimation}`}
      >
        {mode === "register" ? (
          <div>
            <div className="label">Выберите статус в экосистеме</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("CLIENT")}
                className={`relative rounded border p-3 text-left transition-all duration-300 ease-out ${
                  role === "CLIENT"
                    ? "border-royal bg-royal-soft opacity-100 shadow-[0_10px_28px_-20px_rgba(43,89,195,0.6)]"
                    : "border-line bg-white opacity-75 hover:-translate-y-0.5 hover:border-line-strong hover:opacity-100"
                }`}
              >
                <Home
                  size={18}
                  className={role === "CLIENT" ? "text-royal" : "text-muted"}
                />
                <div className="mt-2 text-sm font-semibold">Я клиент</div>
                <div className="mt-1 text-[11px] leading-snug text-muted">
                  Заказчик ремонта: расчёт, подбор материалов, Escrow.
                </div>
                {role === "CLIENT" ? (
                  <span className="absolute right-2.5 top-2.5 flex h-4 w-4 animate-pop items-center justify-center rounded-full bg-royal text-[9px] text-white">
                    ✓
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setRole("FOREMAN")}
                className={`relative rounded border p-3 text-left transition-all duration-300 ease-out ${
                  role === "FOREMAN"
                    ? "border-royal bg-royal-soft opacity-100 shadow-[0_10px_28px_-20px_rgba(43,89,195,0.6)]"
                    : "border-line bg-white opacity-75 hover:-translate-y-0.5 hover:border-line-strong hover:opacity-100"
                }`}
              >
                <HardHat
                  size={18}
                  className={role === "FOREMAN" ? "text-royal" : "text-muted"}
                />
                <div className="mt-2 text-sm font-semibold">
                  Я мастер / прораб
                </div>
                <div className="mt-1 text-[11px] leading-snug text-muted">
                  Проверенные заказы, готовые сметы, гарантированная оплата.
                </div>
                {role === "FOREMAN" ? (
                  <span className="absolute right-2.5 top-2.5 flex h-4 w-4 animate-pop items-center justify-center rounded-full bg-royal text-[9px] text-white">
                    ✓
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        ) : null}

        {mode === "register" ? (
          <div>
            <label className="label" htmlFor="name">
              Имя и фамилия
            </label>
            <div className="relative">
              <User
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                id="name"
                className="input pl-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Константин Васильев"
                autoComplete="name"
                required
                minLength={2}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="email">
            Электронная почта
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="email"
              type="email"
              className="input pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.by"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="password">
            Пароль
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input px-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Минимум 8 символов" : "Ваш пароль"}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              minLength={mode === "register" ? 8 : 1}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {mode === "register" ? (
          <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-royal"
            />
            <span>
              Согласен с{" "}
              <Link href="/legal/terms" className="text-royal hover:underline">
                условиями сервиса OMA 360
              </Link>{" "}
              и обработкой персональных данных
            </span>
          </label>
        ) : null}

        {error ? (
          <div className="rounded border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs text-danger">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary h-12 w-full text-[15px]"
        >
          {loading
            ? "Подождите…"
            : mode === "register"
              ? "Зарегистрироваться в OMA 360"
              : "Войти в личный кабинет"}
          {!loading ? <ArrowRight size={17} /> : null}
        </button>
      </form>
    </div>
  );
}
