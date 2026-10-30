import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stepper } from "@/components/wizard/Stepper";
import { PackagesView } from "@/components/wizard/PackagesView";
import { roomLabel, tierTitle } from "@/lib/constants";

export const metadata = { title: "Выбор сметы — OMA 360" };

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireRole("CLIENT");
  const params = await searchParams;
  if (!params.project) notFound();

  const project = await prisma.project.findFirst({
    where: { id: params.project, clientId: user.id },
    include: {
      packages: { orderBy: { tier: "asc" } },
      items: true,
    },
  });
  if (!project) notFound();
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    redirect(`/app/orders/${project.id}`);
  }
  if (!project.answersJson) {
    redirect(`/app/new/questions?project=${project.id}`);
  }

  const order: Record<string, number> = { ECONOMY: 1, BASE: 2, LUX: 3 };
  const packages = [...project.packages].sort(
    (a, b) => (order[a.tier] ?? 9) - (order[b.tier] ?? 9),
  );

  const label = project.tier
    ? `Проект: ${roomLabel(project.roomType)} ${project.area} м² • Пакет «${tierTitle(project.tier)}»`
    : `Проект: ${roomLabel(project.roomType)} ${project.area} м² • Минск`;

  return (
    <>
      <Stepper active={3} projectLabel={label} />
      <div className="container-page py-8 md:py-10">
        <PackagesView
          projectId={project.id}
          area={project.area}
          budget={project.budget}
          packages={packages.map((pack) => ({
            tier: pack.tier,
            title: pack.title,
            subtitle: pack.subtitle,
            summary: pack.summary,
            total: pack.total,
            itemsCount: pack.itemsCount,
            budgetCap: pack.budgetCap,
          }))}
          items={project.items.map((item) => ({
            id: item.id,
            tier: item.tier,
            stageNumber: item.stageNumber,
            category: item.category,
            name: item.name,
            link: item.link,
            image: item.image,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            calcNote: item.calcNote,
          }))}
          initialTier={project.tier}
        />
      </div>
    </>
  );
}
