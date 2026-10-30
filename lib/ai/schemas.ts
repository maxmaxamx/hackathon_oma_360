import { z } from "zod";

export const questionOptionSchema = z.object({
  value: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  description: z.string().max(220).default(""),
});

export const questionSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(140),
  subtitle: z.string().max(240).default(""),
  type: z.enum(["single", "multi"]),
  options: z.array(questionOptionSchema).min(2).max(6),
  defaultValue: z.array(z.string()).default([]),
});

export const questionsResponseSchema = z.object({
  questions: z.array(questionSchema).length(5),
});

export type Question = z.infer<typeof questionSchema>;

export const planResponseSchema = z.object({
  stages: z
    .array(
      z.object({
        number: z.number().int().min(1).max(10),
        title: z.string().min(2).max(120),
        description: z.string().min(5).max(400),
        durationDays: z.number().int().min(1).max(30),
      }),
    )
    .length(10),
});

export const queriesResponseSchema = z.object({
  queries: z.record(z.string(), z.string()),
});

export const preferencesResponseSchema = z.object({
  styleQuery: z.string().max(80).optional().default(""),
  floorQuery: z.string().max(120).optional().default(""),
  wallQuery: z.string().max(120).optional().default(""),
  furnitureSuffix: z.string().max(60).optional().default(""),
});

export type StylePreferences = z.infer<typeof preferencesResponseSchema>;
