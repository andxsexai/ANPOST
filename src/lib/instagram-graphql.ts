const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const APP_ID = "936619743392459";

const DOC_IDS = [
  "27128499623469141",
  "8845758582119845",
  "10015901848480474",
];

function parseCookie(header: string | null) {
  if (!header) return "";
  const match = header.match(/csrftoken=([^;]+)/i);
  return match?.[1] || "";
}

function tokensFromHtml(html: string, cookieCsrf: string) {
  const csrf =
    html.match(/"csrf_token"\s*:\s*"([^"]+)"/)?.[1] ||
    html.match(/"csrf_token":\s*"([^"]+)"/)?.[1] ||
    cookieCsrf;
  const lsd =
    html.match(/"LSD",\[\],\{"token":"([^"]+)"/)?.[1] ||
    html.match(/name="lsd"\s+value="([^"]+)"/)?.[1] ||
    "";
  return { csrf, lsd };
}

async function reelPage(shortcode: string) {
  const response = await fetch(`https://www.instagram.com/reel/${shortcode}/`, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ru,en;q=0.8",
    },
    cache: "no-store",
  });
  const html = await response.text();
  const { csrf, lsd } = tokensFromHtml(html, parseCookie(response.headers.get("set-cookie")));
  return { html, csrf, lsd };
}

function pickString(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["text", "caption", "title", "description"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return "";
}

function deepFind(
  value: unknown,
  predicate: (key: string, val: unknown) => boolean,
  depth = 0,
): unknown {
  if (!value || typeof value !== "object" || depth > 14) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFind(item, predicate, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const [key, val] of Object.entries(record)) {
    if (predicate(key, val)) return val;
    const nested = deepFind(val, predicate, depth + 1);
    if (nested) return nested;
  }
  return null;
}

function mediaFromGraphql(json: unknown) {
  const videoUrl =
    (deepFind(json, (key, val) => key === "video_url" && typeof val === "string") as string) ||
    (deepFind(json, (key, val) => key === "url" && typeof val === "string" && String(val).includes(".mp4")) as string) ||
    "";

  const captionNode = deepFind(
    json,
    (key, val) => key === "edge_media_to_caption" || key === "caption",
  );
  const caption =
    pickString(captionNode) ||
    (deepFind(json, (key, val) => key === "text" && typeof val === "string" && String(val).length > 20) as string) ||
    "";

  const username =
    (deepFind(json, (key, val) => key === "username" && typeof val === "string") as string) || "";

  return { videoUrl, caption, username };
}

async function postGraphql(shortcode: string, docId: string, csrf: string, lsd: string) {
  const body = new URLSearchParams({
    variables: JSON.stringify({ shortcode }),
    doc_id: docId,
  });
  if (lsd) body.set("lsd", lsd);
  const response = await fetch("https://www.instagram.com/api/graphql", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-IG-App-ID": APP_ID,
      "X-CSRFToken": csrf,
      "X-FB-LSD": lsd,
      "X-ASBD-ID": "129477",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `https://www.instagram.com/reel/${shortcode}/`,
      Origin: "https://www.instagram.com",
    },
    body,
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

export async function fetchInstagramGraphql(shortcode: string) {
  const page = await reelPage(shortcode);
  const gqlVideos = videoUrlsFromEmbedHtml(page.html);
  for (const docId of DOC_IDS) {
    try {
      const json = await postGraphql(shortcode, docId, page.csrf, page.lsd);
      if (!json) continue;
      const media = mediaFromGraphql(json);
      const videoUrl = media.videoUrl || gqlVideos[0] || "";
      const caption = media.caption;
      if (videoUrl || caption.length > 20) {
        return { videoUrl, caption, username: media.username, method: `instagram graphql ${docId}` };
      }
    } catch {
      // try next doc_id
    }
  }

  for (const docId of DOC_IDS) {
    try {
      const variables = encodeURIComponent(JSON.stringify({ shortcode }));
      const endpoint = `https://www.instagram.com/graphql/query/?doc_id=${docId}&variables=${variables}`;
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": UA,
          "X-IG-App-ID": APP_ID,
          "X-CSRFToken": page.csrf,
          "X-Requested-With": "XMLHttpRequest",
          Referer: `https://www.instagram.com/reel/${shortcode}/`,
          Accept: "*/*",
        },
        cache: "no-store",
      });
      if (!response.ok) continue;
      const json = await response.json();
      const media = mediaFromGraphql(json);
      const videoUrl = media.videoUrl || gqlVideos[0] || "";
      if (videoUrl || media.caption.length > 20) {
        return { ...media, videoUrl, method: `instagram graphql get ${docId}` };
      }
    } catch {
      // try next doc_id
    }
  }

  try {
    const embed = await fetch(`https://www.instagram.com/reel/${shortcode}/embed/captioned/`, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      cache: "no-store",
    });
    const html = await embed.text();
    const block = html.match(/window\.__additionalDataLoaded\([^,]+,({[\s\S]+?})\);/);
    if (block?.[1]) {
      const json = JSON.parse(block[1]) as unknown;
      const media = mediaFromGraphql(json);
      if (media.videoUrl || media.caption.length > 8) {
        return { ...media, method: "instagram embed json" };
      }
    }
  } catch {
    // ignore
  }

  if (gqlVideos[0]) {
    return {
      videoUrl: gqlVideos[0],
      caption: "",
      username: "",
      method: "instagram reel html mp4",
    };
  }

  return null;
}

function parseJsonString(raw: string) {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\u0026/g, "&");
  }
}

function videoUrlsFromEmbedHtml(html: string) {
  const urls = new Set<string>();
  for (const match of html.matchAll(/"video_url"\s*:\s*"((?:\\.|[^"\\])*)"/g)) {
    const url = parseJsonString(match[1]);
    if (url.includes(".mp4")) urls.add(url);
  }
  for (const match of html.matchAll(/https:\\\/\\\/scontent[^"\\]+\.mp4[^"\\]*/g)) {
    urls.add(parseJsonString(match[0]));
  }
  return [...urls].sort((a, b) => b.length - a.length);
}
