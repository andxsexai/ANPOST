import type { FeedResponse } from "./types";
import { SOURCES } from "./sources";

export type OsintBrief = {
  liveSources: number;
  darkSources: number;
  coverage: string;
  topGaps: string[];
  contradictions: string[];
  velocity: string;
  pains: Array<{ title: string; detail: string }>;
};

export function buildOsintBrief(feed: FeedResponse): OsintBrief {
  const liveSources = feed.sources.filter((source) => source.ok).length;
  const darkSources = feed.sources.length - liveSources;
  const regions = new Set(feed.articles.map((article) => article.region));
  const coverage =
    regions.size >= 5
      ? "Пять регионов в эфире"
      : `В эфире ${regions.size} из 5 регионов`;

  const topGaps = feed.clusters
    .filter((cluster) => cluster.gap.startsWith("Слепая"))
    .slice(0, 4)
    .map((cluster) => `${cluster.title.slice(0, 90)} — ${cluster.gap}`);

  const contradictions: string[] = [];
  for (const cluster of feed.clusters.slice(0, 6)) {
    if (cluster.regions.includes("US") && cluster.regions.includes("CN")) {
      contradictions.push(
        `Сюжет «${cluster.title.slice(0, 72)}» идёт и в США, и в КНР — сверять рамку.`,
      );
    }
    if (cluster.regions.includes("RU") && cluster.regions.includes("US")) {
      contradictions.push(
        `Сюжет «${cluster.title.slice(0, 72)}» живёт в RU и US лентах одновременно.`,
      );
    }
  }

  const newest = feed.articles[0]?.publishedAt
    ? Math.round((Date.now() - Date.parse(feed.articles[0].publishedAt)) / 60000)
    : null;
  const velocity =
    newest !== null
      ? `Свежайший сигнал: ${newest} мин назад · ${feed.articles.length} материалов в окне`
      : `${feed.articles.length} материалов в текущем окне`;

  const pains = [
    {
      title: "Слепые зоны источников",
      detail:
        darkSources > 0
          ? `${darkSources} лент не ответили. Это тоже OSINT: молчание источника — сигнал.`
          : "Все 10 открытых лент отвечают. Контур живой.",
    },
    {
      title: "Госнарратив vs независимый",
      detail: SOURCES.filter((source) => source.affiliation === "state")
        .map((source) => source.short)
        .join(", ")
        .concat(" помечены как state — не смешивать с agency/public без пометки."),
    },
    {
      title: "Языковой лаг",
      detail:
        "JP-лента NHK приходит на японском. Это боль перевода и одновременно преимущество: вы видите внутренний кадр раньше английской переупаковки.",
    },
    {
      title: "Кросс-постинг не существует",
      detail:
        "API Instagram не зеркалит Facebook и Threads. Каждая платформа — отдельный контур. Это дыра исходного toolkit и причина студии ANPOST.",
    },
    {
      title: "Метаданные вместо правды",
      detail:
        "Ролики TikTok / Reels / VK часто закрывают расшифровку. ANPOST честно пишет метод: oEmbed и Open Graph, без обхода авторизации.",
    },
  ];

  return {
    liveSources,
    darkSources,
    coverage,
    topGaps: topGaps.length ? topGaps : ["Кластеры пока редкие — мир не сошёлся в одном сюжете."],
    contradictions: contradictions.slice(0, 4),
    velocity,
    pains,
  };
}
