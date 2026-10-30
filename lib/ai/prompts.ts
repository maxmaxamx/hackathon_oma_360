import type { ProjectBrief } from "./fallbacks";

export type AnswerEntry = {
  id: string;
  title: string;
  values: string[];
  labels: string[];
};

export function answersToText(answers: AnswerEntry[] | null | undefined): string {
  if (!answers?.length) return "Ответы не заданы.";
  return answers
    .map((a) => `— ${a.title}: ${a.labels.length ? a.labels.join(", ") : "не выбрано"}`)
    .join("\n");
}

export function questionsSystemPrompt(): string {
  return `Ты — старший технолог ремонтной платформы OMA 360 (Беларусь, каталог OMA, цены в BYN).
Твоя задача — составить ровно 5 уточняющих вопросов клиенту, чтобы точно рассчитать материалы, мебель и план работ.
Правила:
- Вопросы должны быть практичными и влиять на закупку или технологию.
- У каждого вопроса ровно 3 варианта ответа, у каждого короткое пояснение.
- Тип "single" — один выбор, "multi" — несколько.
- Один вопрос обязательно про стиль, один про напольное покрытие, один про интенсивность эксплуатации, один про освещение/электрику, один про сроки.
- Пиши по-русски, кратко, без воды.
- defaultValue — массив value выбранных по умолчанию вариантов (ровно 1 для single).
Верни строгий JSON:
{"questions":[{"id":"латиница","title":"...","subtitle":"...","type":"single|multi","options":[{"value":"латиница","label":"...","description":"..."}],"defaultValue":["..."]}]}`;
}

export function questionsUserPrompt(brief: ProjectBrief): string {
  return `Параметры проекта:
Тип помещения: ${brief.roomLabel}
Площадь: ${brief.area} м²
Высота потолков: ${brief.ceiling} м
Бюджет: ${brief.budget} BYN
Пожелания клиента: ${brief.description || "не указаны"}`;
}

export function planSystemPrompt(): string {
  return `Ты — прораб-технолог OMA 360. Составь план ремонта ровно из 10 этапов.
Правила:
- Этапы идут в технологически верном порядке: демонтаж, электрика, выравнивание, стяжка, гидроизоляция/подготовка, чистовая отделка стен, потолок, полы, свет/плинтусы, мебель и сдача.
- Учитывай тип комнаты и влажные зоны.
- durationDays — реалистичный срок в рабочих днях (3–8).
- description — 1–2 предложения о работах и материалах.
- Пиши по-русски.
Верни строгий JSON: {"stages":[{"number":1,"title":"...","description":"...","durationDays":4}, ... 10 этапов]}`;
}

export function planUserPrompt(input: {
  brief: ProjectBrief;
  answers: AnswerEntry[];
  tierTitle: string;
  goodsTotal: number;
}): string {
  return `Проект: ${input.brief.roomLabel}, ${input.brief.area} м², потолок ${input.brief.ceiling} м.
Пожелания: ${input.brief.description || "нет"}.
Пакет: ${input.tierTitle}. Стоимость материалов: ${input.goodsTotal} BYN.
${answersToText(input.answers)}`;
}

export function queriesSystemPrompt(): string {
  return `Ты — специалист по закупкам стройматериалов в гипермаркете OMA (Беларусь).
По описанию клиента подбери короткие поисковые запросы для категорий. Запросы должны быть на русском, 1–4 слова, как в поиске каталога OMA.
Верни строгий JSON: {"queries":{"demolition":"...","electric":"...","walls":"...","floor":"...","waterproofing":"...","ceiling":"...","lighting":"...","furniture":"...","decor":"..."}}
Не добавляй пояснений.`;
}

export function preferencesSystemPrompt(): string {
  return `Ты — консультант по интерьерам и закупкам в гипермаркете OMA (Беларусь).
На основе пожеланий клиента и ответов подбери уточняющие поисковые запросы для каталога.
Правила:
- 2–4 слова на русском, без брендов, как реальный поисковый запрос.
- floorQuery — для чистового напольного покрытия с учётом стиля и типа комнаты.
- wallQuery — для чистовой отделки стен (краска/обои/плитка).
- styleQuery — короткое описание стиля для визуализации.
- furnitureSuffix — 1–2 слова, которые можно добавить к названию мебели (например "скандинавский", "лофт", "неоклассика").
Верни строгий JSON: {"styleQuery":"...","floorQuery":"...","wallQuery":"...","furnitureSuffix":"..."}`;
}

export function preferencesUserPrompt(input: {
  brief: ProjectBrief;
  answers: AnswerEntry[];
}): string {
  return `Комната: ${input.brief.roomLabel}, ${input.brief.area} м², потолок ${input.brief.ceiling} м, бюджет ${input.brief.budget} BYN.
Пожелания клиента: ${input.brief.description || "не указаны"}.
${answersToText(input.answers)}`;
}

export function queriesUserPrompt(input: {
  brief: ProjectBrief;
  answers: AnswerEntry[];
}): string {
  return `Комната: ${input.brief.roomLabel}, ${input.brief.area} м², бюджет ${input.brief.budget} BYN.
Пожелания: ${input.brief.description || "нет"}.
${answersToText(input.answers)}`;
}

export function imagePrompt(input: {
  brief: ProjectBrief;
  styleLabel: string;
  itemNames: string[];
  tierTitle: string;
}): string {
  const items = input.itemNames.slice(0, 14).join("; ");
  return `Photorealistic interior design render of a ${input.brief.roomLabel.toLowerCase()} room, ${input.brief.area} square meters, ceiling ${input.brief.ceiling} m.
Style: ${input.styleLabel}. Finish level: ${input.tierTitle}.
Furniture and materials from the shopping list: ${items}.
Bright natural daylight, wide angle 24mm, realistic materials, clean composition, no people, no text, no watermarks, professional architectural visualization, 4k.
The result is an approximate visualization and may differ from the actual delivered items.`;
}
