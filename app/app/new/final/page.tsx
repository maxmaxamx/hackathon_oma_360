import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stepper } from "@/components/wizard/Stepper";
import { FinalView } from "@/components/wizard/FinalView";
import { roomLabel, tierTitle } from "@/lib/constants";

export const metadata = { title: "Финальное согласование — OMA 360" };

export default async function FinalPage({
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
      stages: { orderBy: { number: "asc" } },
      items: true,
      foreman: { select: { name: true } },
    },
  });
  if (!project) notFound();
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    redirect(`/app/orders/${project.id}`);
  }
  if (!project.tier || project.stages.length === 0) {
    redirect(`/app/new/packages?project=${project.id}`);
  }

  const tier = project.tier;
  const items = project.items.filter((item) => item.tier === tier);

  const stages = project.stages.map((stage) => ({
    id: stage.id,
    number: stage.number,
    title: stage.title,
    description: stage.description,
    durationDays: stage.durationDays,
    materialsTotal: stage.materialsTotal,
    laborTotal: stage.laborTotal,
    budget: stage.budget,
    status: stage.status,
    items: items
      .filter((item) => item.stageNumber === stage.number)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        total: item.total,
      })),
  }));

  return (
    <>
      <Stepper
        active={4}
        projectLabel={`Проект: ${roomLabel(project.roomType)} ${project.area} м² • Пакет «${tierTitle(tier)}»`}
      />
      <div className="container-page py-8 md:py-10">
        <FinalView
          projectId={project.id}
          roomLabel={roomLabel(project.roomType)}
          area={project.area}
          previewImage={project.previewImage}
          materialsTotal={project.materialsTotal}
          servicesTotal={project.servicesTotal}
          total={project.total}
          stages={stages}
          foreman={project.foreman}
        />
      </div>
    </>
  );
}
