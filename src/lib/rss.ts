import { classifyNiche, extractSignals, heatScore } from "./classify";
import { SOURCES } from "./sources";
import { RELATION_FORUMS } from "./forums";
import type { Article, FeedResponse, NicheId, Source, StoryCluster } from "./types";
import { hashId, stripHtml } from "./utils";

const UA =
  "Mozilla/5.0 (compatible; ANPOST/1.0; +https://github.com/andxsexai/ANPOST) AppleWebKit/537.36";

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

function titleFromUrl(url: string) {
  try {
    const path = decodeURIComponent(new URL(url).pathname);
    const thread = path.match(/thread-([a-z0-9-]+)-id\d+/i)?.[1];
    const talk = path.match(/\/talk\/relationships\/\d+-([^/?#]+)/i)?.[1];
    const last =
      thread ||
      talk ||
      path
        .split("/")
        .filter(Boolean)
        .at(-1) ||
      "";
    const cleaned = last.replace(/[-_]/g, " ").replace(/\.(html|php)$/i, "").trim();
    if (!cleaned) return url;
    return cleaned.replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 140);
  } catch {
    return url;
  }
}

function toArticle(
  source: Source,
  title: string,
  url: string,
  summary: string,
  publishedAt: string | null,
): Article {
  const classified = classifyNiche(title, summary);
  const niche: NicheId = source.niches.includes(classified)
    ? classified
    : source.niches[0] || classified;
  const iso = publishedAt ? new Date(publishedAt).toISOString() : null;
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
    signals: extractSignals(title, summary),
  };
  article.heat = heatScore(article);
  return article;
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
      const summary = pickTag(block, ["description", "summary", "content", "content:encoded"]).slice(
        0,
        420,
      );
      const publishedAt = pickTag(block, ["pubDate", "published", "updated", "dc:date"]) || null;
      return toArticle(source, title, url, summary, publishedAt);
    })
    .filter((item): item is Article => Boolean(item));
}

function parseSitemap(xml: string, source: Source): Article[] {
  const locs = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
  const mods = [...xml.matchAll(/<lastmod>\s*([^<]+)\s*<\/lastmod>/gi)].map((match) =>
    match[1].trim(),
  );
  const articles: Article[] = [];
  for (let index = 0; index < locs.length; index += 1) {
    const url = locs[index];
    if (source.keepPath && !url.includes(source.keepPath)) continue;
    articles.push(
      toArticle(source, titleFromUrl(url), url, `Тред ${source.short}`, mods[index] || null),
    );
    if (articles.length >= 18) break;
  }
  return articles;
}

function parseHtmlForum(html: string, source: Source): Article[] {
  const pattern = source.hrefPattern ? new RegExp(source.hrefPattern, "i") : /./;
  const origin = new URL(source.site).origin;
  const seen = new Set<string>();
  const articles: Article[] = [];
  for (const match of html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = match[1];
    if (href.startsWith("//")) href = `https:${href}`;
    else if (href.startsWith("/")) href = `${origin}${href}`;
    if (!pattern.test(href) && !pattern.test(match[1])) continue;
    const title = stripHtml(match[2]).replace(/\s+/g, " ").trim();
    const finalTitle = title.length >= 12 ? title : titleFromUrl(href);
    if (finalTitle.length < 8) continue;
    const key = href.split("#")[0].split("?")[0];
    if (seen.has(key) || seen.has(finalTitle)) continue;
    seen.add(key);
    seen.add(finalTitle);
    articles.push(toArticle(source, finalTitle, href, `Тема с ${source.short}`, null));
    if (articles.length >= 18) break;
  }
  return articles;
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/xml, text/xml, text/html, */*",
        "Accept-Language": "ru,en;q=0.8",
      },
      cache: "no-store",
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

async function loadSource(source: Source) {
  const t0 = Date.now();
  try {
    const body = await fetchText(source.rss);
    const kind = source.listKind || "rss";
    const articles = (
      kind === "sitemap"
        ? parseSitemap(body, source)
        : kind === "html"
          ? parseHtmlForum(body, source)
          : parseFeed(body, source)
    ).slice(0, 18);
    if (!articles.length) throw new Error("пусто");
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
}

export async function loadFeed(niche?: string, region?: string): Promise<FeedResponse> {
  const includeForums = !niche || niche === "all" || niche === "relations";
  const catalog = includeForums ? [...SOURCES, ...RELATION_FORUMS] : SOURCES;
  const results = await Promise.all(catalog.map((source) => loadSource(source)));

  let articles = results.flatMap((result) => result.articles);
  const forumIds = new Set(RELATION_FORUMS.map((forum) => forum.id));
  if (niche === "relations") {
    articles = articles.filter(
      (article) => article.niche === "relations" || forumIds.has(article.sourceId),
    );
  } else if (niche && niche !== "all") {
    articles = articles.filter((article) => article.niche === niche);
  } else {
    const news = articles.filter((article) => !forumIds.has(article.sourceId));
    const forums = articles.filter((article) => forumIds.has(article.sourceId)).slice(0, 24);
    articles = [...news, ...forums];
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
    day: new Date().toISOString().slice(0, 10),
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
