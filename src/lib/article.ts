import { decodeEntities, stripHtml } from "./utils";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function attr(html: string, name: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
    "i",
  );
  return stripHtml((html.match(re)?.[1] || html.match(re2)?.[1] || "").replace(/&amp;/g, "&"));
}

function jsonLdBody(html: string) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const texts: string[] = [];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]) as Record<string, unknown> | unknown[];
      const nodes = Array.isArray(data)
        ? data
        : [data, ...(((data as { "@graph"?: unknown[] })["@graph"] as unknown[]) || [])];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const record = node as Record<string, unknown>;
        for (const key of ["articleBody", "text", "description"]) {
          const value = record[key];
          if (typeof value === "string" && value.trim().length > 40) texts.push(value.trim());
        }
      }
    } catch {
      // ignore broken json-ld
    }
  }
  return texts.sort((a, b) => b.length - a.length)[0] || "";
}

export async function extractArticle(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ru,en;q=0.9",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`статья HTTP ${response.status}`);
  const html = await response.text();
  const title =
    attr(html, "og:title") ||
    stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "")
      .replace(/\s+/g, " ")
      .trim();
  const description = attr(html, "og:description") || attr(html, "description");
  const thumbnail = attr(html, "og:image");
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const article =
    cleaned.match(/itemprop=["']articleBody["'][\s\S]{80,20000}?<\/(?:div|article|section)>/i)?.[0] ||
    cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    cleaned;
  const paragraphs = [...article.matchAll(/<(?:p|li|h2|h3)[^>]*>([\s\S]*?)<\/(?:p|li|h2|h3)>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((line) => line.length > 40 && !/cookie|subscribe|подписк|advert|javascript/i.test(line));
  const unique = [...new Set(paragraphs)];
  const body = jsonLdBody(html) || unique.join("\n\n") || decodeEntities(description);
  if (!body && !description) throw new Error("в источнике нет читаемого текста");
  return {
    title: title || "Источник",
    description,
    thumbnail,
    body: body || description,
  };
}
