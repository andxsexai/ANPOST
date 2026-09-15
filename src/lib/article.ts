import { stripHtml } from "./utils";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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
  const article = cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] || cleaned;
  const paragraphs = [...article.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripHtml(match[1]))
    .filter((line) => line.length > 40 && !/cookie|subscribe|подписк|advert/i.test(line));
  const unique = [...new Set(paragraphs)];
  const body = unique.join("\n\n");
  if (!body && !description) throw new Error("в источнике нет читаемого текста");
  return {
    title: title || "Источник",
    description,
    thumbnail,
    body: body || description,
  };
}

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
