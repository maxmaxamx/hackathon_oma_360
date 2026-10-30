import type { AnswerEntry } from "@/lib/ai/prompts";
import { roomGeometry } from "./geometry";

export type Demand =
  | { kind: "area"; value: number }
  | { kind: "mass"; value: number }
  | { kind: "volume"; value: number }
  | { kind: "length"; value: number }
  | { kind: "count"; value: number };

export type MaterialNeed = {
  key: string;
  category: string;
  stage: number;
  query: string;
  altQuery?: string;
  demand: Demand;
  defaultPack: {
    coverage?: number;
    mass?: number;
    volume?: number;
    length?: number;
  };
  note: string;
  essential?: boolean;
};

export type NeedsInput = {
  roomType: string;
  area: number;
  ceiling: number;
  answers: AnswerEntry[];
};

function answerValue(answers: AnswerEntry[], id: string): string | undefined {
  const entry = answers.find((a) => a.id === id);
  return entry?.values[0];
}

function answerLabels(answers: AnswerEntry[], id: string): string {
  const entry = answers.find((a) => a.id === id);
  return (entry?.labels ?? []).join(", ");
}

export function describeDemand(demand: Demand, note: string): string {
  if (note) return note;
  switch (demand.kind) {
    case "area":
      return `${Math.round(demand.value * 10) / 10} м² с запасом`;
    case "mass":
      return `${Math.round(demand.value)} кг расчётно`;
    case "volume":
      return `${Math.round(demand.value * 10) / 10} л расчётно`;
    case "length":
      return `${Math.round(demand.value * 10) / 10} м`;
    case "count":
      return `${demand.value} шт`;
  }
}

export function buildNeeds(input: NeedsInput): MaterialNeed[] {
  const { area, ceiling, roomType, answers } = input;
  const geo = roomGeometry(area, ceiling);
  const wet = roomType === "bathroom" || roomType === "kitchen";
  const kids = roomType === "kids";
  const floorChoice = answerValue(answers, "floor") ?? (wet ? "tile" : "spc");
  const styleChoice = answerValue(answers, "style") ?? "scandi";
  const styleLabel = answerLabels(answers, "style");
  const lighting = answers.find((a) => a.id === "lighting")?.values ?? ["soft"];

  const needs: MaterialNeed[] = [];

  const add = (need: MaterialNeed) => needs.push(need);

  // Stage 1 — demolition and protection
  add({
    key: "trash-bags",
    category: "demolition",
    stage: 1,
    query: "мешки для мусора",
    demand: { kind: "count", value: Math.max(5, Math.ceil(area / 4)) },
    defaultPack: {},
    note: `≈ ${Math.max(5, Math.ceil(area / 4))} шт для выноса мусора`,
  });
  add({
    key: "protection-film",
    category: "demolition",
    stage: 1,
    query: "плёнка защитная строительная",
    demand: { kind: "area", value: area * 1.2 },
    defaultPack: { coverage: 20 },
    note: `≈ ${Math.round(area * 1.2)} м² защиты поверхностей`,
  });

  // Stage 2 — rough electrics
  add({
    key: "cable",
    category: "electric",
    stage: 2,
    query: "кабель ВВГ 3х2,5",
    altQuery: "кабель ВВГ",
    demand: { kind: "length", value: geo.perimeter * 2 + 24 },
    defaultPack: {},
    note: `≈ ${Math.round(geo.perimeter * 2 + 24)} м кабельных линий`,
    essential: true,
  });
  add({
    key: "back-boxes",
    category: "electric",
    stage: 2,
    query: "коробка установочная",
    demand: { kind: "count", value: Math.ceil(area / 6) + 6 },
    defaultPack: {},
    note: "Подрозетники под розетки и выключатели",
  });

  // Stage 3 — walls leveling
  add({
    key: "primer-walls",
    category: "walls",
    stage: 3,
    query: "грунтовка глубокого проникновения",
    demand: { kind: "volume", value: geo.wallArea / 8 },
    defaultPack: { volume: 10 },
    note: `≈ ${Math.round(geo.wallArea)} м² стен под грунт`,
    essential: true,
  });
  add({
    key: "plaster",
    category: "walls",
    stage: 3,
    query: "штукатурка гипсовая",
    demand: { kind: "mass", value: geo.wallArea * 8 },
    defaultPack: { mass: 30 },
    note: `≈ ${Math.round(geo.wallArea)} м², слой до 10 мм`,
  });
  add({
    key: "putty",
    category: "walls",
    stage: 3,
    query: "шпаклевка финишная",
    demand: { kind: "mass", value: geo.wallArea * 1.2 },
    defaultPack: { mass: 25 },
    note: `Финишное выравнивание ${Math.round(geo.wallArea)} м²`,
  });

  // Stage 4 — floor screed
  add({
    key: "screed",
    category: "floor",
    stage: 4,
    query: "смесь для стяжки пола",
    altQuery: "стяжка самовыравнивающаяся",
    demand: { kind: "mass", value: area * 20 },
    defaultPack: { mass: 25 },
    note: `Стяжка ${area} м², слой 10 мм`,
    essential: true,
  });
  add({
    key: "primer-floor",
    category: "floor",
    stage: 4,
    query: "грунтовка бетоноконтакт",
    demand: { kind: "volume", value: area / 8 },
    defaultPack: { volume: 10 },
    note: `Подготовка основания ${area} м²`,
  });

  // Stage 5 — waterproofing / wet zones
  if (wet) {
    add({
      key: "waterproofing",
      category: "waterproofing",
      stage: 5,
      query: "гидроизоляция для ванной",
      altQuery: "гидроизоляционная мастика",
      demand: { kind: "mass", value: (area + geo.perimeter * 0.6) * 1.6 },
      defaultPack: { mass: 20 },
      note: `Пол и примыкания, ${Math.round(area + geo.perimeter * 0.6)} м²`,
      essential: true,
    });
  } else {
    add({
      key: "primer-base",
      category: "waterproofing",
      stage: 5,
      query: "грунтовка для пола",
      demand: { kind: "volume", value: area / 8 },
      defaultPack: { volume: 10 },
      note: `Подготовка основания ${area} м²`,
    });
  }

  // Stage 6 — finish walls
  if (wet) {
    add({
      key: "wall-tile",
      category: "walls",
      stage: 6,
      query: "плитка керамическая для стен",
      altQuery: "керамогранит для стен",
      demand: { kind: "area", value: geo.wallArea * 1.05 },
      defaultPack: { coverage: 1.44 },
      note: `Облицовка стен ${Math.round(geo.wallArea)} м² + 5%`,
      essential: true,
    });
  } else if (styleChoice === "classic" || styleChoice === "japandi") {
    add({
      key: "wallpaper",
      category: "walls",
      stage: 6,
      query: styleChoice === "japandi" ? "обои под покраску" : "обои флизелиновые",
      demand: { kind: "area", value: geo.wallArea * 1.1 },
      defaultPack: { coverage: 5.3 },
      note: `Стены ${Math.round(geo.wallArea)} м² + 10% на подгон`,
      essential: true,
    });
  } else {
    add({
      key: "paint-walls",
      category: "walls",
      stage: 6,
      query: "краска интерьерная моющаяся",
      altQuery: "краска для стен",
      demand: { kind: "volume", value: (geo.wallArea * 2) / 10 },
      defaultPack: { volume: 9 },
      note: `Стены ${Math.round(geo.wallArea)} м², 2 слоя`,
      essential: true,
    });
  }

  // Stage 7 — ceiling
  add({
    key: "ceiling-paint",
    category: "ceiling",
    stage: 7,
    query: "краска для потолка матовая",
    altQuery: "краска интерьерная белая",
    demand: { kind: "volume", value: (area * 2) / 10 },
    defaultPack: { volume: 9 },
    note: `Потолок ${area} м², 2 слоя`,
    essential: true,
  });

  // Stage 8 — floor covering
  if (floorChoice === "tile") {
    add({
      key: "floor-tile",
      category: "floor",
      stage: 8,
      query: "керамогранит для пола",
      altQuery: "плитка для пола",
      demand: { kind: "area", value: area * 1.1 },
      defaultPack: { coverage: 1.44 },
      note: `Пол ${area} м² + 10%`,
      essential: true,
    });
  } else if (floorChoice === "parquet") {
    add({
      key: "parquet",
      category: "floor",
      stage: 8,
      query: "паркетная доска дуб",
      demand: { kind: "area", value: area * 1.07 },
      defaultPack: { coverage: 2.2 },
      note: `Пол ${area} м² + 7%`,
      essential: true,
    });
    add({
      key: "underlay",
      category: "floor",
      stage: 8,
      query: "подложка под паркет",
      demand: { kind: "area", value: area * 1.05 },
      defaultPack: { coverage: 10 },
      note: "Подложка по всей площади",
    });
  } else {
    add({
      key: "flooring",
      category: "floor",
      stage: 8,
      query: "ламинат 33 класс",
      altQuery: "ламинат",
      demand: { kind: "area", value: area * 1.07 },
      defaultPack: { coverage: 2.2 },
      note: `Пол ${area} м² + 7% на подрезку`,
      essential: true,
    });
    add({
      key: "underlay",
      category: "floor",
      stage: 8,
      query: "подложка под ламинат",
      demand: { kind: "area", value: area * 1.05 },
      defaultPack: { coverage: 10 },
      note: "Подложка по всей площади",
    });
  }

  // Stage 9 — light, sockets, skirting
  add({
    key: "lighting",
    category: "lighting",
    stage: 9,
    query: lighting.includes("track") ? "трековая система освещения" : "светильник потолочный",
    altQuery: "светильник",
    demand: {
      kind: "count",
      value: roomType === "living" || roomType === "kitchen" ? 3 : 2,
    },
    defaultPack: {},
    note: `Основное освещение (${styleLabel || "выбранный стиль"})`,
  });
  add({
    key: "sockets",
    category: "lighting",
    stage: 9,
    query: "розетка с заземлением",
    demand: { kind: "count", value: Math.ceil(area / 6) + 4 },
    defaultPack: {},
    note: "Розеточные группы",
  });
  add({
    key: "switches",
    category: "lighting",
    stage: 9,
    query: "выключатель",
    demand: { kind: "count", value: 2 },
    defaultPack: {},
    note: "Выключатели",
  });
  add({
    key: "skirting",
    category: "lighting",
    stage: 9,
    query: "плинтус напольный",
    demand: { kind: "length", value: geo.perimeter },
    defaultPack: { length: 2.5 },
    note: `Периметр ${Math.round(geo.perimeter)} м`,
  });

  // Stage 10 — furniture and decor
  const furniture: Record<string, { query: string; count: number }[]> = {
    living: [
      { query: "диван", count: 1 },
      { query: "журнальный стол", count: 1 },
      { query: "тумба под телевизор", count: 1 },
      { query: "стеллаж", count: 1 },
    ],
    bedroom: [
      { query: "кровать", count: 1 },
      { query: "шкаф", count: 1 },
      { query: "тумба прикроватная", count: 2 },
    ],
    kitchen: [
      { query: "стол обеденный", count: 1 },
      { query: "стул", count: 4 },
      { query: "кухонный шкаф", count: 1 },
    ],
    kids: [
      { query: kids ? "кровать детская" : "кровать", count: 1 },
      { query: "стол письменный", count: 1 },
      { query: "шкаф", count: 1 },
      { query: "ковер", count: 1 },
    ],
    bathroom: [
      { query: "зеркало для ванной", count: 1 },
      { query: "шкаф под раковину", count: 1 },
      { query: "полотенцесушитель", count: 1 },
    ],
    office: [
      { query: "стол письменный", count: 1 },
      { query: "кресло офисное", count: 1 },
      { query: "стеллаж", count: 1 },
    ],
  };

  for (const [index, item] of (furniture[roomType] ?? furniture.living).entries()) {
    add({
      key: `furniture-${index}`,
      category: "furniture",
      stage: 10,
      query: item.query,
      demand: { kind: "count", value: item.count },
      defaultPack: {},
      note: item.count > 1 ? `${item.count} шт` : "1 позиция",
      essential: true,
    });
  }

  if (roomType === "living" || roomType === "bedroom") {
    add({
      key: "decor-rug",
      category: "decor",
      stage: 10,
      query: "ковер для гостиной",
      demand: { kind: "count", value: 1 },
      defaultPack: {},
      note: "Декор и текстиль",
    });
  }

  return needs;
}
