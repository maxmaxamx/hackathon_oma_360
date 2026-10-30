import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuestionsForm } from "@/components/wizard/QuestionsForm";
import { parseQuestions } from "@/lib/project";
import { roomLabel } from "@/lib/constants";

export const metadata = { title: "Вопросы — OMA 360" };

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await requireRole("CLIENT");
  const params = await searchParams;
  if (!params.project) notFound();

  const project = await prisma.project.findFirst({
    where: { id: params.project, clientId: user.id },
  });
  if (!project) notFound();
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    redirect(`/app/orders/${project.id}`);
  }

  const questions = parseQuestions(project.questionsJson);

  return (
    <div className="container-page py-8 md:py-10">
      <QuestionsForm
        projectId={project.id}
        initialQuestions={questions.length ? questions : null}
        projectLabel={`${roomLabel(project.roomType)} ${project.area} м²`}
        budget={project.budget}
      />
    </div>
  );
}
