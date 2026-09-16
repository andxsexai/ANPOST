import { decodeEntities } from "./utils";

const SHARE_UA = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
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
    if (raw) return keepNewlines(decodeEntities(raw));
  }
  return "";
}

function peelShareCard(text: string) {
  const decoded = decodeEntities(text);
  const quoted =
    decoded.match(/:\s*"([^"]{8,})"/)?.[1] ||
    decoded.match(/:\s*«([^»]{8,})»/)?.[1] ||
    decoded.match(/:\s*'([^']{8,})'/)?.[1];
  const core = quoted || decoded;
  return core
    .replace(/^\d[\d\s,.]*\s*(likes?|views?|comments?)[^.]*?(?:-\s*[\w._]+\s+on\s+[^:"]+)?[:\s]*/i, "")
    .replace(/^"+|"+$/g, "")
    .replace(/^«|»$/g, "")
    .trim();
}

function captionFromJson(html: string) {
  const blocks = [
    ...html.matchAll(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/g),
  ].map((match) => {
    try {
      return JSON.parse(`"${match[1]}"`) as string;
    } catch {
      return match[1].replace(/\\n/g, "\n");
    }
  });
  const ranked = blocks
    .map((text) => peelShareCard(text.trim()))
    .filter((text) => text.length > 20 && !isBlockedCaption(text))
    .sort((a, b) => b.length - a.length);
  return ranked[0] || "";
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
  return /зарегистрируйтесь|sign up to see|log in to instagram|создайте аккаунт|чтобы быть в курсе|see photos and videos|meta ai|используя meta ai|using meta ai|улучшения ии/i.test(
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
        const fromMeta = meta(html, ["og:description", "description", "twitter:description"]);
        const fromJson = captionFromJson(html);
        const caption = peelShareCard(
          captionFromBody(html) ||
            (!isBlockedCaption(fromMeta) ? fromMeta : "") ||
            fromJson,
        );
        const minLen = isBlockedCaption(caption) ? 9999 : 12;
        if (caption.length < minLen || isBlockedCaption(caption)) {
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
