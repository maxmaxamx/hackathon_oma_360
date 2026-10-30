import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata = { title: "Вход и регистрация — OMA 360" };

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  const params = await searchParams;
  const mode = params.mode === "register" ? "register" : "login";

  return (
    <div className="flex min-h-screen flex-col bg-subtle">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <PageTransition>
          <AuthForm initialMode={mode} />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}
