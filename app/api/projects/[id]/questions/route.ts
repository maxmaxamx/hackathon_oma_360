import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiUser, projectFor, unauthorized } from "@/lib/api-auth";
import { chatJson } from "@/lib/ai/client";
import { questionsResponseSchema } from "@/lib/ai/schemas";
import { fallbackQuestions } from "@/lib/ai/fallbacks";
import { questionsSystemPrompt, questionsUserPrompt } from "@/lib/ai/prompts";
import { toBrief } from "@/lib/project";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await apiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const project = await projectFor(user, id, { clientOnly: true });
  if (!project) {
    return NextResponse.json({ error: "Заказ не найден." }, { status: 404 });
  }
  if (project.status === "ACTIVE" || project.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Вопросы нельзя изменить после оплаты заказа." },
      { status: 400 },
    );
  }

  const brief = toBrief(project);
  const fallback = fallbackQuestions(brief);
  let questions = fallback;

  const raw = await chatJson(
    questionsSystemPrompt(),
    questionsUserPrompt(brief),
    {
      temperature: 0.6,
      maxTokens: 3200,
      timeoutMs: 45000,
      sessionId: `oma360-${id}-questions`,
    },
  );
  const parsed = questionsResponseSchema.safeParse(raw);
  if (parsed.success) {
    questions = parsed.data.questions.map((question, index) => {
      const options =
        question.options.length >= 3
          ? question.options.slice(0, 3)
          : (fallback[index]?.options ?? question.options);
      const allowed = new Set(options.map((option) => option.value));
      let defaults = question.defaultValue.filter((value) => allowed.has(value));
      if (question.type === "single") defaults = defaults.slice(0, 1);
      if (defaults.length === 0) {
        defaults = [options[0].value];
      }
      return {
        ...question,
        id: question.id || `q${index + 1}`,
        options,
        defaultValue: defaults,
      };
    });
  }

  await prisma.project.update({
    where: { id },
    data: {
      questionsJson: JSON.stringify(questions),
      answersJson: null,
      status: "QUESTIONS_READY",
    },
  });

  return NextResponse.json({ questions, ai: Boolean(raw && parsed.success) });
}
