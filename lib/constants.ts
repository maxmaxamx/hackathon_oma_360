export const ROOM_TYPES = [
  { value: "living", label: "Гостиная", minArea: 18, icon: "sofa" },
  { value: "bedroom", label: "Спальня", minArea: 12, icon: "bed" },
  { value: "kitchen", label: "Кухня", minArea: 9, icon: "kitchen" },
  { value: "kids", label: "Детская", minArea: 14, icon: "kids" },
  { value: "bathroom", label: "Ванная", minArea: 5, icon: "bath" },
  { value: "office", label: "Кабинет", minArea: 10, icon: "office" },
] as const;

export type RoomTypeValue = (typeof ROOM_TYPES)[number]["value"];

export function roomLabel(value: string): string {
  return ROOM_TYPES.find((r) => r.value === value)?.label ?? "Комната";
}

const ROOM_GENITIVE: Record<string, string> = {
  living: "гостиной",
  bedroom: "спальни",
  kitchen: "кухни",
  kids: "детской",
  bathroom: "ванной",
  office: "кабинета",
};

export function roomGenitive(value: string): string {
  return ROOM_GENITIVE[value] ?? "комнаты";
}

export const TIERS = ["ECONOMY", "BASE", "LUX"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_META: Record<
  Tier,
  { key: Tier; title: string; subtitle: string; code: string; description: string }
> = {
  ECONOMY: {
    key: "ECONOMY",
    title: "Эконом",
    subtitle: "Базовая спецификация",
    code: "БАЗОВАЯ СПЕЦИФИКАЦИЯ",
    description:
      "Качественные базовые материалы, ламинат 32 класса, прочные флизелиновые обои под покраску.",
  },
  BASE: {
    key: "BASE",
    title: "Базовый",
    subtitle: "Оптимальный баланс",
    code: "ОПТИМАЛЬНЫЙ БАЛАНС",
    description:
      "Кварцвинил, стойкая моющаяся краска, скрытый плинтус, надёжная электрика и комфортная мебель.",
  },
  LUX: {
    key: "LUX",
    title: "Люкс",
    subtitle: "Премиальный стандарт",
    code: "ПРЕМИАЛЬНЫЙ СТАНДАРТ",
    description:
      "Премиальные составы, широкоформатный керамогранит, трековое освещение, дизайнерская мебель.",
  },
};

export function tierTitle(tier?: string | null): string {
  if (!tier) return "—";
  return TIER_META[tier as Tier]?.title ?? tier;
}

export const PROJECT_STATUS = {
  DRAFT: "Черновик",
  QUESTIONS_READY: "Вопросы готовы",
  ESTIMATE_READY: "Смета готова",
  FINAL_READY: "Готов к оплате",
  ACTIVE: "В работе",
  COMPLETED: "Завершён",
} as const;

export function statusLabel(status: string): string {
  return PROJECT_STATUS[status as keyof typeof PROJECT_STATUS] ?? status;
}

export const STAGE_STATUS = {
  PENDING: "В очереди",
  IN_PROGRESS: "В процессе",
  DONE: "Завершён",
} as const;

export const STAGE_TEMPLATES = [
  {
    title: "Демонтаж и подготовка",
    description:
      "Снятие старых покрытий, вынос мусора, защита поверхностей и разметка под будущие работы.",
    days: 4,
    keywords: ["демонтаж"],
  },
  {
    title: "Черновая электрика",
    description:
      "Штробление, прокладка кабеля, установка подрозетников и подготовка линий освещения.",
    days: 5,
    keywords: ["электрика"],
  },
  {
    title: "Штукатурка и выравнивание стен",
    description:
      "Грунтование, штукатурка по маякам, шпаклёвка и финишное выравнивание под чистовую отделку.",
    days: 5,
    keywords: ["стены"],
  },
  {
    title: "Стяжка пола",
    description:
      "Подготовка основания, заливка самовыравнивающейся стяжки и контроль влажности.",
    days: 4,
    keywords: ["пол"],
  },
  {
    title: "Гидроизоляция и подготовка мокрых зон",
    description:
      "Гидроизоляция пола и стен в зонах контакта с водой, обработка примыканий и углов.",
    days: 3,
    keywords: ["гидро"],
  },
  {
    title: "Чистовая отделка стен",
    description:
      "Финишное покрытие стен: покраска или обои, аккуратная подрезка и защита примыканий.",
    days: 4,
    keywords: ["стены"],
  },
  {
    title: "Потолок",
    description:
      "Подготовка и финишная отделка потолка, заделка стыков и покраска в два слоя.",
    days: 3,
    keywords: ["потолок"],
  },
  {
    title: "Напольные покрытия",
    description:
      "Укладка подложки и чистового покрытия, монтаж порогов и подготовка к плинтусам.",
    days: 4,
    keywords: ["полы"],
  },
  {
    title: "Свет, розетки и плинтусы",
    description:
      "Установка светильников, розеток и выключателей, монтаж плинтусов и финальная электрика.",
    days: 3,
    keywords: ["свет"],
  },
  {
    title: "Мебель, декор и сдача",
    description:
      "Сборка и расстановка мебели, декор, пусконаладка и генеральная уборка объекта.",
    days: 4,
    keywords: ["мебель"],
  },
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  demolition: "Демонтаж и защита",
  electric: "Электрика",
  walls: "Стены",
  floor: "Полы",
  waterproofing: "Гидроизоляция",
  ceiling: "Потолок",
  lighting: "Освещение",
  furniture: "Мебель",
  decor: "Декор",
};

export const DEFAULT_CITY = {
  cityId: process.env.OMA_CITY_ID ?? "8019",
  locationId: process.env.OMA_LOCATION_ID ?? "432550",
  label: "Минск",
};
