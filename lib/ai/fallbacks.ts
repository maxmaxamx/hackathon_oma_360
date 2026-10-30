import type { Question } from "./schemas";
import { roomGenitive } from "@/lib/constants";

export type ProjectBrief = {
  roomType: string;
  roomLabel: string;
  area: number;
  ceiling: number;
  description: string;
  budget: number;
};

export function fallbackQuestions(brief: ProjectBrief): Question[] {
  const wet = brief.roomType === "bathroom" || brief.roomType === "kitchen";
  const kids = brief.roomType === "kids";
  return [
    {
      id: "usage",
      title: "Интенсивность эксплуатации помещения",
      subtitle: kids
        ? "В детской важна усиленная защита покрытий и безопасные материалы."
        : "Есть ли домашние питомцы, маленькие дети? Требуется усиленная стойкость отделки?",
      type: "single",
      options: [
        {
          value: "standard",
          label: "Стандартная",
          description: "1–2 взрослых, без питомцев. Базовые покрытия без спецзащиты.",
        },
        {
          value: "high",
          label: "Высокая",
          description:
            "Дети или животные. Антивандальные моющиеся покрытия, класс износа выше.",
        },
        {
          value: "max",
          label: "Максимальная защита",
          description:
            "Высокая проходимость. Ударопрочные панели, влагостойкие покрытия, барьер.",
        },
      ],
      defaultValue: [kids ? "high" : "standard"],
    },
    {
      id: "style",
      title: "Стиль интерьера",
      subtitle:
        "Определяет цветовую палитру, фактуру покрытий и характер мебели из каталога OMA.",
      type: "single",
      options: [
        {
          value: "scandi",
          label: "Скандинавский",
          description: "Минимализм, светлое дерево, белый матовый.",
        },
        {
          value: "loft",
          label: "Современный лофт",
          description: "Фактурный бетон, графит, чёрный металл.",
        },
        {
          value: "classic",
          label: "Неоклассика",
          description: "Симметрия, лепнина, полиуретановые молдинги.",
        },
      ],
      defaultValue: ["scandi"],
    },
    {
      id: "lighting",
      title: "Сценарии освещения и электрика",
      subtitle: "Выберите ключевые группы подсветки для кабельных линий и профилей.",
      type: "multi",
      options: [
        {
          value: "soft",
          label: "Мягкий свет 3000К",
          description: "Люстры, бра, точечные слоты для комфортного отдыха.",
        },
        {
          value: "track",
          label: "Трековые шинопроводы",
          description: "Магнитные и накладные треки с поворотными модулями.",
        },
        {
          value: "led",
          label: "Скрытая контурная LED",
          description: "Парящие потолки, теневой плинтус, алюминиевые профили.",
        },
      ],
      defaultValue: ["soft"],
    },
    {
      id: "floor",
      title: `Напольное покрытие для ${roomGenitive(brief.roomType)} ${brief.area} м²`,
      subtitle: "Включает автоматический расчёт подложки, клея и запаса на подрезку (+7%).",
      type: "single",
      options: wet
        ? [
            {
              value: "tile",
              label: "Керамогранит / плитка",
              description: "Влагостойко, износостойко, подходит для влажных зон.",
            },
            {
              value: "laminate",
              label: "Ламинат 33 класс",
              description: "Быстрый монтаж, практичный вариант для тёплого пола.",
            },
            {
              value: "parquet",
              label: "Паркетная доска",
              description: "Натуральное дерево, премиальный тактильный комфорт.",
            },
          ]
        : [
            {
              value: "laminate",
              label: "Ламинат 33 класс",
              description:
                "Толщина 10–12 мм, высокая износостойкость замков, фаска с 4 сторон.",
            },
            {
              value: "parquet",
              label: "Паркетная доска",
              description:
                "Натуральный массив дуба/ясеня, премиальный тактильный комфорт.",
            },
            {
              value: "tile",
              label: "Керамогранит",
              description:
                "Максимальная износостойкость и влагостойкость, современный крупный формат.",
            },
          ],
      defaultValue: [wet ? "tile" : "laminate"],
    },
    {
      id: "timeline",
      title: "Сроки реализации и готовность к закупке",
      subtitle: "Влияет на выбор складских позиций OMA и экспресс-доставку.",
      type: "single",
      options: [
        {
          value: "now",
          label: "Старт немедленно",
          description: "Только товары в наличии на складе OMA с доставкой за 24–48 часов.",
        },
        {
          value: "2weeks",
          label: "В течение 2 недель",
          description: "Оптимальный баланс наличия и возможности дозаказа позиций.",
        },
        {
          value: "month",
          label: "Через месяц и позже",
          description: "Планирование с фиксацией цен и предварительной брони партии.",
        },
      ],
      defaultValue: ["2weeks"],
    },
  ];
}
