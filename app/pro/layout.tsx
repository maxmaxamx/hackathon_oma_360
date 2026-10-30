import { requireRole } from "@/lib/auth";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("FOREMAN");
  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fd]">
      <Header user={user} variant="pro" />
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <Footer />
    </div>
  );
}
