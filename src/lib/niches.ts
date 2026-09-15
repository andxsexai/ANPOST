import type { NicheId } from "./types";

export type Niche = {
  id: NicheId;
  title: string;
  need: string;
  promise: string;
  color: string;
  keywords: string[];
};

export const NICHES: Niche[] = [
  {
    id: "money",
    title: "Деньги",
    need: "Контроль, рост, защита капитала",
    promise: "Рынки, ставки, стартапы и власть денег — без шума брокера.",
    color: "#c4f542",
    keywords: [
      "bank", "банк", "stock", "акции", "market", "рынок", "crypto", "крипт",
      "bitcoin", "fed", "цб", "inflation", "инфляц", "salary", "зарплат",
      "tax", "налог", "oil", "нефть", "dollar", "доллар", "invest", "инвест",
      "ipo", "funding", "капитал", "кредит", "loan", "gdp", "ввп", "рубл",
    ],
  },
  {
    id: "news",
    title: "Новости",
    need: "Ориентация в мире прямо сейчас",
    promise: "Сверка лент США, Кореи, Японии, Китая и России в одном контуре.",
    color: "#e879f9",
    keywords: [
      "war", "войн", "president", "президент", "election", "выбор", "sanction",
      "санкц", "un ", "оон", "diplomat", "дипломат", "protest", "протест",
      "government", "правительств", "ministry", "мид", "nato", "nato",
    ],
  },
  {
    id: "innovation",
    title: "Инновации",
    need: "Понимать, что меняет правила",
    promise: "AI, чипы, космос, биотех — сигнал раньше, чем он станет мемом.",
    color: "#22d3ee",
    keywords: [
      "ai", "ии", "gpt", "chip", "чип", "semiconductor", "полупровод", "robot",
      "робот", "space", "космос", "nasa", "spacex", "quantum", "квант",
      "startup", "стартап", "software", "софт", "apple", "google", "nvidia",
      "openai", "samsung", "toyota", "huawei", "bytedance", "neural",
    ],
  },
  {
    id: "relations",
    title: "Отношения",
    need: "Связь, семья, доверие, статус",
    promise: "Социум, семья, знаменитости и то, как люди держат друг друга.",
    color: "#fb7185",
    keywords: [
      "love", "любов", "family", "семь", "marriage", "брак", "wedding", "свадьб",
      "celebrity", "звезд", "dating", "отношен", "child", "дет", "women",
      "женщин", "men ", "мужчин", "friend", "друж", "divorce", "развод",
    ],
  },
  {
    id: "health",
    title: "Здоровье",
    need: "Тело, энергия, продолжительность жизни",
    promise: "Медицина, эпидемии, спорт и то, что продлевает жизнь.",
    color: "#4ade80",
    keywords: [
      "health", "здоров", "covid", "virus", "вирус", "hospital", "больниц",
      "doctor", "врач", "vaccine", "вакцин", "cancer", "рак", "diet", "диет",
      "mental", "психи", "who", "воз", "drug", "лекарств", "sport", "спорт",
    ],
  },
  {
    id: "spirit",
    title: "Духовность",
    need: "Смысл, ритуал, внутренняя ось",
    promise: "Вера, культура, смысл и тишина внутри ускоряющегося мира.",
    color: "#c084fc",
    keywords: [
      "god", "бог", "church", "церков", "budd", "будд", "islam", "ислам",
      "orthodox", "православ", "temple", "храм", "faith", "вер", "spirit",
      "духов", "meditat", "медитац", "soul", "душ", "religion", "религ",
      "monk", "монах", "prayer", "молитв", "zen", "дзен",
    ],
  },
];

export const NICHE_BY_ID = Object.fromEntries(
  NICHES.map((niche) => [niche.id, niche]),
) as Record<NicheId, Niche>;
