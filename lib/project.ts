import type { Question } from "@/lib/ai/schemas";
import type { AnswerEntry } from "@/lib/ai/prompts";
import type { ProjectBrief } from "@/lib/ai/fallbacks";
import { ROOM_TYPES, roomLabel } from "@/lib/constants";

export function parseQuestions(json: string | null | undefined): Question[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as Question[]) : [];
  } catch {
    return [];
  }
}

export function parseAnswers(json: string | null | undefined): AnswerEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as AnswerEntry[]) : [];
  } catch {
    return [];
  }
}

export function toBrief(project: {
  roomType: string;
  area: number;
  ceiling: number;
  description: string;
  budget: number;
}): ProjectBrief {
  return {
    roomType: project.roomType,
    roomLabel: roomLabel(project.roomType),
    area: project.area,
    ceiling: project.ceiling,
    description: project.description,
    budget: project.budget,
  };
}

export function styleLabelFromAnswers(answers: AnswerEntry[]): string {
  return answers.find((a) => a.id === "style")?.labels[0] ?? "Современный";
}

export function isValidRoomType(value: string): boolean {
  return ROOM_TYPES.some((room) => room.value === value);
}
