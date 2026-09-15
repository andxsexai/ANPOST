import { analogize, buildOriginalScript, buildScenes, summarizeAbout } from "./copywriter";
import { packCopy, toVoiceover } from "./style";
import type { NicheId, TranscriptCue, VideoAnalysis, VideoPlatform } from "./types";
import { stripHtml } from "./utils";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function detectPlatform(url: string): VideoPlatform {
  const host = safeHost(url);
  if (host.includes("youtu")) return "youtube";
  if (host.includes("tiktok")) return "tiktok";
  if (host.includes("vk.com") || host.includes("vk.ru") || host.includes("vkvideo")) return "vk";
  if (host.includes("instagram") || host.includes("instagr.am")) return "instagram";
  if (host.includes("t.me") || host.includes("telegram")) return "telegram";
  return "unknown";
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "").split("?")[0];
    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") return parts[1];
  } catch {
    return null;
  }
  return null;
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!response.ok) throw new Error(`oEmbed ${response.status}`);
  return response.json() as Promise<Record<string, string>>;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "ru,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/json,text/xml,*/*",
      Referer: "https://www.youtube.com/",
    },
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) return "";
  return response.text();
}

function og(html: string, prop: string) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  );
  const raw = stripHtml((html.match(re)?.[1] || html.match(re2)?.[1] || "").replace(/&amp;/g, "&"));
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function extractBalanced(source: string, start: number) {
  const open = source[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function parsePlayer(html: string) {
  const marker = "ytInitialPlayerResponse";
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return null;
  const braceAt = html.indexOf("{", markerAt);
  if (braceAt < 0) return null;
  const raw = extractBalanced(html, braceAt);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      videoDetails?: { title?: string; shortDescription?: string; author?: string };
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{ baseUrl?: string; languageCode?: string; kind?: string }>;
        };
      };
    };
  } catch {
    return null;
  }
}

function parseJson3(payload: string): TranscriptCue[] {
  try {
    const data = JSON.parse(payload) as {
      events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }>;
    };
    return (data.events || [])
      .map((event) => ({
        start: (event.tStartMs || 0) / 1000,
        duration: (event.dDurationMs || 0) / 1000,
        text: (event.segs || []).map((seg) => seg.utf8 || "").join("").trim(),
      }))
      .filter((cue) => cue.text && cue.text !== "\n");
  } catch {
    return [];
  }
}

function parseVtt(vtt: string): TranscriptCue[] {
  if (!/WEBVTT|->/.test(vtt)) return [];
  const cues: TranscriptCue[] = [];
  const blocks = vtt.split(/\n\n+/);
  for (const block of blocks) {
    const match = block.match(
      /(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3}).*?-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})[\s\S]*?\n([\s\S]+)/,
    );
    if (!match) continue;
    const start =
      Number(match[2] || 0) * 3600 +
      Number(match[3]) * 60 +
      Number(match[4]) +
      Number(match[5]) / 1000;
    const text = stripHtml(match[10] || match[9] || "").replace(/\n/g, " ");
    if (text) cues.push({ start, duration: 2, text });
  }
  return cues;
}

function parseTimedText(xml: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  const re = /<text[^>]*start="([^"]+)"[^>]*(?:dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) {
    const text = stripHtml(match[3]);
    if (!text) continue;
    cues.push({
      start: Number(match[1]),
      duration: Number(match[2] || 2),
      text,
    });
  }
  return cues;
}

async function youtubeTranscript(videoId: string): Promise<{
  cues: TranscriptCue[];
  method: string;
  description: string;
}> {
  const methods: string[] = [];
  let description = "";
  try {
    const html = await fetchHtml(`https://www.youtube.com/watch?v=${videoId}`);
    const player = parsePlayer(html);
    description = player?.videoDetails?.shortDescription || "";
    let tracks =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    if (!tracks.length) {
      const capAt = html.indexOf('"captionTracks":');
      const bracketAt = capAt >= 0 ? html.indexOf("[", capAt) : -1;
      const raw = bracketAt >= 0 ? extractBalanced(html, bracketAt) : null;
      if (raw) {
        try {
          tracks = JSON.parse(raw);
        } catch {
          tracks = [];
        }
      }
    }
    const preferred =
      tracks.find((track) => track.languageCode?.startsWith("ru")) ||
      tracks.find((track) => track.languageCode?.startsWith("en")) ||
      tracks.find((track) => !track.kind) ||
      tracks[0];
    if (preferred?.baseUrl || tracks.length) {
      const ordered = preferred ? [preferred, ...tracks.filter((track) => track !== preferred)] : tracks;
      for (const track of ordered) {
        if (!track?.baseUrl) continue;
        const base = track.baseUrl.replace(/\\u0026/g, "&");
        for (const extra of ["", "&fmt=json3", "&fmt=srv1", "&fmt=vtt"]) {
          const body = await fetchHtml(`${base}${extra}`);
          const cues =
            parseJson3(body).length
              ? parseJson3(body)
              : parseTimedText(body).length
                ? parseTimedText(body)
                : parseVtt(body);
          if (cues.length) {
            methods.push(`youtube captions (${track.languageCode || "auto"})`);
            return { cues, method: methods.join(", "), description };
          }
        }
      }
      methods.push("caption URL gated");
    } else if (description) {
      methods.push("player description, no captionTracks");
    } else {
      methods.push("watch page without captionTracks");
    }
  } catch {
    methods.push("watch page blocked");
  }

  try {
    const list = await fetchHtml(
      `https://www.youtube.com/api/timedtext?type=list&v=${videoId}`,
    );
    const lang =
      list.match(/lang_code="(ru[^"]*)"/)?.[1] ||
      list.match(/lang_code="(en[^"]*)"/)?.[1] ||
      list.match(/lang_code="([^"]+)"/)?.[1];
    if (lang) {
      const xml = await fetchHtml(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`,
      );
      const jsonCues = parseJson3(xml);
      const cues = jsonCues.length ? jsonCues : parseTimedText(xml);
      if (cues.length) {
        methods.push(`timedtext ${lang}`);
        return { cues, method: methods.join(", "), description };
      }
    }
  } catch {
    methods.push("timedtext unavailable");
  }

  return { cues: [], method: methods.join(" · ") || "no public captions", description };
}

async function oembedMeta(platform: VideoPlatform, url: string) {
  if (platform === "youtube") {
    return fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  }
  if (platform === "tiktok") {
    return fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
  }
  if (platform === "vk") {
    return fetchJson(`https://vk.com/oembed/?url=${encodeURIComponent(url)}`);
  }
  if (platform === "instagram") {
    return fetchJson(
      `https://api.instagram.com/oembed?url=${encodeURIComponent(url)}&omitscript=true`,
    );
  }
  throw new Error("no oEmbed");
}

function painFromText(text: string) {
  const rules: Array<[string, RegExp]> = [
    ["слабый хук", /^(hi|привет|hello|ну что)/i],
    ["нет оффера", /подпис|subscribe|like/i],
    ["перегруз фактами", /.{400,}/],
    ["размытый CTA", /смотреть|watch|more/i],
  ];
  const hits = rules.filter(([, re]) => re.test(text)).map(([label]) => label);
  if (!text) hits.push("нет публичной расшифровки — сценарий строится по метаданным");
  if (text.split(" ").length < 40) hits.push("короткий сигнал, мало опоры для копирования структуры");
  return hits.slice(0, 6);
}

export async function analyzeVideo(url: string, niche: NicheId = "news"): Promise<VideoAnalysis> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Нужна полная ссылка на ролик");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Только публичные http(s) ссылки");
  }

  const platform = detectPlatform(url);
  const method: string[] = ["public metadata"];
  let title = "";
  let author = "";
  let thumbnail: string | null = null;
  let description = "";

  try {
    const meta = await oembedMeta(platform, url);
    title = meta.title || "";
    author = meta.author_name || "";
    thumbnail = meta.thumbnail_url || null;
    method.push(`${platform} oEmbed`);
  } catch {
    method.push("oEmbed unavailable");
  }

  if (!title) {
    try {
      const html = await fetchHtml(url);
      title = og(html, "og:title") || stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
      description = og(html, "og:description") || description;
      thumbnail = og(html, "og:image") || thumbnail;
      author = og(html, "og:site_name") || author;
      method.push("open graph");
    } catch {
      method.push("page fetch blocked");
    }
  }

  let cues: TranscriptCue[] = [];
  if (platform === "youtube") {
    const id = youtubeId(url);
    if (id) {
      const result = await youtubeTranscript(id);
      cues = result.cues;
      if (result.description) description = result.description;
      method.push(result.method);
    }
  } else {
    method.push("captions API есть только у YouTube; остальные платформы — публичные метаданные");
  }

  const transcriptText = cues.map((cue) => cue.text).join(" ").trim();
  const about = summarizeAbout(title || url, description, transcriptText);
  const scenes = buildScenes(cues);
  const originalScript = buildOriginalScript(title, about, transcriptText, scenes);
  const analogous = analogize({
    title,
    about,
    transcript: transcriptText,
    niche,
    scenes,
  });
  const confidence = cues.length
    ? Math.min(0.95, 0.45 + cues.length * 0.02)
    : title
      ? 0.55
      : 0.2;
  const finalTitle = title || "Без публичного заголовка";
  const voiceover = toVoiceover({
    title: finalTitle,
    description,
    transcript: transcriptText,
  });
  const rewritten = "";
  const telegramPost = "";
  const threadsPost = "";

  return {
    url,
    platform,
    title: finalTitle,
    author: author || "неизвестно",
    thumbnail,
    description,
    about,
    transcript: cues,
    transcriptText,
    scenes,
    originalScript,
    analogous,
    painPoints: painFromText(transcriptText || description || title),
    method,
    confidence,
    voiceover,
    rewritten,
    telegramPost,
    threadsPost,
    telegramWords: 0,
    threadsWords: 0,
    packed: packCopy({
      title: finalTitle,
      description: description || about,
      voiceover,
      rewritten,
    }),
  };
}
