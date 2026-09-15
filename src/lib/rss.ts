import { classifyNiche, extractSignals, heatScore } from "./classify";
import { SOURCES } from "./sources";
import type { Article, FeedResponse, Source, StoryCluster } from "./types";
import { hashId, stripHtml } from "./utils";

const UA = "ANPOST/1.0 (open-source OSINT aggregator)";

function pickTag(block: string, names: string[]) {
  for (const name of names) {
    const cdata = block.match(
      new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${name}>`, "i"),
    );
    if (cdata?.[1]) return stripHtml(cdata[1]);
    const plain = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
    if (plain?.[1]) return stripHtml(plain[1]);
  }
  return "";
}

function splitBlocks(xml: string) {
  const items = xml.split(/<item[\s>]/i).slice(1).map((chunk) => chunk.split(/<\/item>/i)[0]);
  if (items.length) return items;
  return xml.split(/<entry[\s>]/i).slice(1).map((chunk) => chunk.split(/<\/entry>/i)[0]);
}

function parseFeed(xml: string, source: Source): Article[] {
  return splitBlocks(xml)
    .map((block) => {
      const title = pickTag(block, ["title"]);
      const url =
        pickTag(block, ["link"]) ||
        block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ||
        "";
      if (!title || !url) return null;
      const summary = pickTag(block, ["description", "summary", "content", "content:encoded"]).slice(0, 420);
      const publishedAt =
        pickTag(block, ["pubDate", "published", "updated", "dc:date"]) || null;
      const iso = publishedAt ? new Date(publishedAt).toISOString() : null;
      const niche = classifyNiche(title, summary);
      const signals = extractSignals(title, summary);
      const article: Article = {
        id: hashId(`${source.id}:${url}`),
        sourceId: source.id,
        sourceName: source.short,
        region: source.region,
        title,
        summary,
        url,
        publishedAt: iso && !Number.isNaN(Date.parse(iso)) ? iso : null,
        niche,
        heat: 0,
        signals,
      };
      article.heat = heatScore(article);
      return article;
    })
    .filter((item): item is Article => Boolean(item));
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      next: { revalidate: 180 },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function tokenize(title: string) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 8);
}

function clusterArticles(articles: Article[]): StoryCluster[] {
  const groups: Array<{ tokens: Set<string>; items: Article[] }> = [];
  for (const article of articles) {
    const tokens = new Set(tokenize(article.title));
    if (tokens.size < 2) continue;
    const found = groups.find((group) => {
      let overlap = 0;
      for (const token of tokens) if (group.tokens.has(token)) overlap += 1;
      return overlap >= 2;
    });
    if (found) {
      found.items.push(article);
      tokens.forEach((token) => found.tokens.add(token));
    } else {
      groups.push({ tokens, items: [article] });
    }
  }
  return groups
    .filter((group) => group.items.length >= 2)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 8)
    .map((group, index) => {
      const regions = [...new Set(group.items.map((item) => item.region))];
      const sources = [...new Set(group.items.map((item) => item.sourceName))];
      const missing = (["US", "KR", "JP", "CN", "RU"] as const).filter(
        (region) => !regions.includes(region),
      );
      return {
        id: `cluster-${index}`,
        title: group.items[0].title,
        count: group.items.length,
        regions,
        sources,
        heat: Math.round(
          group.items.reduce((sum, item) => sum + item.heat, 0) / group.items.length,
        ),
        gap:
          missing.length === 0
            ? "Полное покрытие пяти регионов"
            : `Слепая зона: ${missing.join(", ")}`,
      };
    });
}

export async function loadFeed(niche?: string, region?: string): Promise<FeedResponse> {
  const results = await Promise.all(
    SOURCES.map(async (source) => {
      const t0 = Date.now();
      try {
        const xml = await fetchText(source.rss);
        const articles = parseFeed(xml, source).slice(0, 18);
        return {
          source,
          articles,
          ok: true as const,
          error: undefined,
          latencyMs: Date.now() - t0,
        };
      } catch (error) {
        return {
          source,
          articles: [] as Article[],
          ok: false as const,
          error: error instanceof Error ? error.message : "fetch failed",
          latencyMs: Date.now() - t0,
        };
      }
    }),
  );

  let articles = results.flatMap((result) => result.articles);
  if (niche && niche !== "all") {
    articles = articles.filter((article) => article.niche === niche);
  }
  if (region && region !== "all") {
    articles = articles.filter((article) => article.region === region);
  }
  articles.sort((a, b) => {
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    return tb - ta || b.heat - a.heat;
  });

  return {
    generatedAt: new Date().toISOString(),
    articles: articles.slice(0, 80),
    sources: results.map((result) => ({
      id: result.source.id,
      name: result.source.name,
      region: result.source.region,
      ok: result.ok,
      count: result.articles.length,
      error: result.error,
      latencyMs: result.latencyMs,
    })),
    clusters: clusterArticles(articles),
  };
}
