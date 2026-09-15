import { NICHES, NICHE_BY_ID } from "./niches";
import type { Article, NicheId } from "./types";
import { clamp } from "./utils";

const PAIN_LEXICON: Array<{ tag: string; words: string[] }> = [
  { tag: "конфликт", words: ["war", "войн", "attack", "удар", "missile", "ракет"] },
  { tag: "санкции", words: ["sanction", "санкц", "embargo", "эмбарго"] },
  { tag: "рынок", words: ["crash", "обвал", "inflation", "инфляц", "rate", "ставк"] },
  { tag: "утечка", words: ["leak", "утчк", "hack", "взлом", "breach", "data"] },
  { tag: "здоровье", words: ["outbreak", "вспышк", "virus", "вирус", "hospital"] },
  { tag: "регуляция", words: ["ban", "запрет", "regulat", "закон", "штраф", "fine"] },
  { tag: "техносбой", words: ["outage", "сбой", "blackout", "отключ"] },
];

export function classifyNiche(title: string, summary: string): NicheId {
  const text = `${title} ${summary}`.toLowerCase();
  let best: NicheId = "news";
  let score = 0;
  for (const niche of NICHES) {
    const hits = niche.keywords.filter((word) => text.includes(word.toLowerCase())).length;
    const weighted = niche.id === "news" ? hits * 0.6 : hits;
    if (weighted > score) {
      score = weighted;
      best = niche.id;
    }
  }
  return score === 0 ? "news" : best;
}

export function extractSignals(title: string, summary: string) {
  const text = `${title} ${summary}`.toLowerCase();
  return PAIN_LEXICON.filter((item) =>
    item.words.some((word) => text.includes(word)),
  ).map((item) => item.tag);
}

export function heatScore(article: Pick<Article, "title" | "summary" | "publishedAt" | "signals">) {
  const ageHours = article.publishedAt
    ? Math.max(0, (Date.now() - new Date(article.publishedAt).getTime()) / 36e5)
    : 24;
  const recency = clamp(1 - ageHours / 36, 0.15, 1);
  const signalBoost = 1 + article.signals.length * 0.12;
  const lengthBoost = clamp((article.title.length + article.summary.length) / 280, 0.6, 1.2);
  return Math.round(recency * signalBoost * lengthBoost * 100);
}

export function nicheLabel(id: NicheId) {
  return NICHE_BY_ID[id].title;
}
