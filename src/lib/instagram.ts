import { decodeEntities } from "./utils";

const SHARE_UA = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

export function isInstagramUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.includes("instagram.com") || host.includes("instagr.am");
  } catch {
    return false;
  }
}

function keepNewlines(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function meta(html: string, names: string[]) {
  for (const name of names) {
    const a = html.match(
      new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    );
    const b = html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${name}["']`, "i"),
    );
    const raw = a?.[1] || b?.[1];
    if (raw) return keepNewlines(raw);
  }
  return "";
}

function peelShareCard(text: string) {
  return text
    .replace(/^\d[\d\s,.]*\s*(likes?|views?|comments?)[^.]*?:\s*/i, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^«|»$/g, "")
    .trim();
}

function captionFromBody(html: string) {
  const chunk =
    html.match(/line-height:18px[^>]*>([\s\S]{80,4000}?)(?:<\/span>|<\/div>)/i)?.[1] ||
    html.match(/class="[^"]*Caption[^"]*"[^>]*>([\s\S]{80,4000}?)<(?:div|ul) class="CaptionComments"/i)?.[1] ||
    "";
  if (!chunk) return "";
  const text = keepNewlines(chunk.replace(/<a[^>]*>/gi, "").replace(/<\/a>/gi, ""));
  return peelShareCard(text);
}

function isBlockedCaption(text: string) {
  return /зарегистрируйтесь|sign up to see|log in to instagram|создайте аккаунт|чтобы быть в курсе|see photos and videos/i.test(
    text,
  );
}

export async function fetchInstagramPost(url: string) {
  const code = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([^/?#]+)/i)?.[1];
  if (!code) throw new Error("Нужна ссылка вида instagram.com/p/…");
  const candidates = [
    `https://www.instagram.com/reel/${encodeURIComponent(code)}/`,
    `https://www.instagram.com/p/${encodeURIComponent(code)}/`,
    `https://www.instagram.com/reels/${encodeURIComponent(code)}/`,
  ];

  let lastError = "Instagram не отдал карточку";
  for (const postUrl of candidates) {
    for (const ua of SHARE_UA) {
      try {
        const response = await fetch(postUrl, {
          headers: {
            "User-Agent": ua,
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "ru,en;q=0.8",
          },
          cache: "no-store",
          redirect: "follow",
        });
        if (!response.ok) {
          lastError = `Instagram ${response.status}`;
          continue;
        }
        const html = await response.text();
        const caption = peelShareCard(
          captionFromBody(html) || meta(html, ["og:description", "description", "twitter:description"]),
        );
        if (caption.length < 40 || isBlockedCaption(caption)) {
          lastError = "Instagram показал экран входа вместо подписи";
          continue;
        }
        const author =
          html.match(/instagram\.com\/([A-Za-z0-9._]+)\/reel\//i)?.[1] ||
          html.match(/\(@([A-Za-z0-9._]+)\)/)?.[1] ||
          html.match(/comments? - ([A-Za-z0-9._]+) on /i)?.[1] ||
          "instagram";
        const titleMeta = meta(html, ["og:title", "twitter:title"]);
        const title =
          caption.split("\n").map((line) => line.trim()).find((line) => line.length > 12)?.slice(0, 140) ||
          titleMeta.slice(0, 120) ||
          `Пост @${author}`;
        const thumbnail =
          html.match(/property="og:image" content="([^"]+)"/i)?.[1] ||
          html.match(/content="(https:\/\/scontent[^"]+)"/i)?.[1] ||
          null;
        return { author, title, caption, thumbnail };
      } catch (error) {
        lastError = error instanceof Error ? error.message : lastError;
      }
    }
  }

  throw new Error(`${lastError}. Вставь подпись поста в поле текста — переработаем её как есть.`);
}
