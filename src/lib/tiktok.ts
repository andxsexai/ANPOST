import { decodeEntities, stripHtml } from "./utils";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

export function isTikTokUrl(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().includes("tiktok");
  } catch {
    return false;
  }
}

export function isTikTokHomeOrFeed(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("tiktok")) return false;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || path === "/foryou" || path === "/following" || path === "/explore") {
      return true;
    }
    return !/\/video\/|\/v\/|\/embed\//.test(path) && !parsed.searchParams.get("item_id");
  } catch {
    return false;
  }
}

export function tikTokVideoId(url: string) {
  const match =
    url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i) ||
    url.match(/tiktok\.com\/v\/(\d+)/i) ||
    url.match(/tiktok\.com\/embed\/v2\/(\d+)/i) ||
    url.match(/[?&]item_id=(\d+)/i);
  return match?.[1] || null;
}

export async function resolveTikTokUrl(url: string) {
  const short = /^(https?:\/\/)?(vm|vt)\.tiktok\.com\//i.test(url) || /tiktok\.com\/t\//i.test(url);
  if (!short && tikTokVideoId(url)) return url;
  const response = await fetch(url, {
    headers: { "User-Agent": MOBILE_UA, Accept: "text/html" },
    redirect: "follow",
    cache: "no-store",
  });
  return response.url || url;
}

type TikTokPayload = {
  title: string;
  author: string;
  description: string;
  thumbnail: string | null;
  transcriptText: string;
  method: string[];
};

function deepItemStruct(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || depth > 12) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.desc === "string" && (record.id || record.video)) return record;
  for (const child of Object.values(record)) {
    const found = deepItemStruct(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function scriptJson(html: string, id: string) {
  const re = new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`, "i");
  const raw = html.match(re)?.[1]?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function parseVttToText(vtt: string) {
  if (!/WEBVTT|-->/.test(vtt)) return "";
  const lines: string[] = [];
  for (const block of vtt.split(/\n\n+/)) {
    const text = block
      .split("\n")
      .filter((line) => line && !/^\d+$/.test(line) && !/-->/.test(line))
      .join(" ")
      .trim();
    if (text) lines.push(text);
  }
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

async function loadSubtitle(url: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://www.tiktok.com/" },
      cache: "no-store",
    });
    if (!response.ok) return "";
    return parseVttToText(await response.text());
  } catch {
    return "";
  }
}

function subtitleUrls(item: Record<string, unknown>) {
  const urls: string[] = [];
  const video = item.video as Record<string, unknown> | undefined;
  const cla = (item.claInfo || video?.claInfo) as Record<string, unknown> | undefined;
  const infos = (cla?.captionInfos || cla?.captions || video?.subtitleInfos) as
    | Array<{ url?: string; Url?: string; language?: string }>
    | undefined;
  for (const info of infos || []) {
    const url = info.url || info.Url;
    if (url) urls.push(url);
  }
  return urls;
}

export async function fetchTikTokPublic(url: string): Promise<TikTokPayload> {
  if (isTikTokHomeOrFeed(url)) {
    throw new Error(
      "Это главная TikTok, а не ролик. Вставь ссылку вида tiktok.com/@автор/video/123…",
    );
  }

  const resolved = await resolveTikTokUrl(url);
  const method: string[] = ["tiktok public page"];
  let html = "";

  for (const ua of [MOBILE_UA, UA]) {
    const response = await fetch(resolved, {
      headers: {
        "User-Agent": ua,
        "Accept-Language": "ru,en;q=0.8",
        Accept: "text/html,application/xhtml+xml",
        Referer: "https://www.tiktok.com/",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) continue;
    html = await response.text();
    if (html.length > 50_000) break;
  }

  if (!html) throw new Error("TikTok не отдал страницу ролика");

  const universal =
    scriptJson(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__") ||
    scriptJson(html, "SIGI_STATE");
  const item = universal ? deepItemStruct(universal) : null;

  let description =
    (typeof item?.desc === "string" ? item.desc : "") ||
    html.match(/property="og:description" content="([^"]+)"/i)?.[1] ||
    "";
  description = decodeEntities(stripHtml(description));

  let title =
    (typeof item?.title === "string" ? item.title : "") ||
    html.match(/property="og:title" content="([^"]+)"/i)?.[1] ||
    description.split("\n")[0] ||
    "TikTok";
  title = decodeEntities(stripHtml(title)).slice(0, 140);

  const authorMeta = item?.author as Record<string, unknown> | undefined;
  const author =
    (typeof authorMeta?.uniqueId === "string" ? `@${authorMeta.uniqueId}` : "") ||
    (typeof authorMeta?.nickname === "string" ? authorMeta.nickname : "") ||
    "tiktok";

  const thumbnail =
    html.match(/property="og:image" content="([^"]+)"/i)?.[1] ||
    (typeof (item?.video as Record<string, unknown> | undefined)?.cover === "string"
      ? ((item?.video as Record<string, string>).cover as string)
      : null);

  let transcriptText = "";
  for (const subUrl of subtitleUrls(item || {})) {
    transcriptText = await loadSubtitle(subUrl);
    if (transcriptText.length > 40) {
      method.push("tiktok public subtitles");
      break;
    }
  }

  if (!transcriptText && description) {
    transcriptText = description;
    method.push("tiktok caption as voiceover");
  }

  if (!description && !transcriptText) {
    throw new Error(
      "TikTok не отдал подпись и субтитры. Скопируй текст ролика в поле ниже — переработаем его.",
    );
  }

  return {
    title,
    author,
    description: description || transcriptText,
    thumbnail,
    transcriptText,
    method,
  };
}
