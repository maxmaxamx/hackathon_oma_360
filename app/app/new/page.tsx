import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stepper } from "@/components/wizard/Stepper";
import { ParamsForm } from "@/components/wizard/ParamsForm";
import { roomLabel } from "@/lib/constants";

export const metadata = { title: "Параметры комнаты — OMA 360" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireRole("CLIENT");
  const params = await searchParams;

  let project = null;
  if (params.project) {
    project = await prisma.project.findFirst({
      where: { id: params.project, clientId: user.id },
    });
    if (project && (project.status === "ACTIVE" || project.status === "COMPLETED")) {
      redirect(`/app/orders/${project.id}`);
    }
  }

  const label = project
    ? `Проект: ${roomLabel(project.roomType)} ${project.area} м² • Минск`
    : "Новый проект • Минск";

  return (
    <>
      <Stepper active={1} projectLabel={label} />
      <div className="container-page py-8 md:py-10">
        <div className="mb-7">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            Параметры комнаты и бюджет
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Задайте базовые физические габариты и финансовые рамки. Наш алгоритм
            рассчитает смету и сформирует бриф для проекта.
          </p>
        </div>

        <ParamsForm
          projectId={project?.id}
          initial={
            project
              ? {
                  roomType: project.roomType,
                  area: project.area,
                  ceiling: project.ceiling,
                  description: project.description,
                  budget: project.budget,
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
