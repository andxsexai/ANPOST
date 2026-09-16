import { analogize, buildOriginalScript, buildScenes, summarizeAbout } from "./copywriter";
import { fetchTikTokPublic, isTikTokHomeOrFeed } from "./tiktok";
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
    cache: "no-store",
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

function parseCaptionXml(xml: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  const modern = /<p\b[^>]*\bt="(\d+)"[^>]*(?:\bd="(\d+)")?[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = modern.exec(xml))) {
    const text = stripHtml(match[3]).replace(/\s+/g, " ").trim();
    if (!text) continue;
    cues.push({
      start: Number(match[1]) / 1000,
      duration: Number(match[2] || 2000) / 1000,
      text,
    });
  }
  if (cues.length) return cues;
  return parseTimedText(xml);
}

function parseCaptionBody(body: string): TranscriptCue[] {
  const json3 = parseJson3(body);
  if (json3.length) return json3;
  const xml = parseCaptionXml(body);
  if (xml.length) return xml;
  return parseVtt(body);
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

type CaptionTrack = { baseUrl?: string; languageCode?: string; kind?: string };

async function innertubePlayer(videoId: string) {
  const clients = [
    {
      clientName: "ANDROID",
      clientVersion: "20.10.38",
      ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip",
    },
    {
      clientName: "WEB",
      clientVersion: "2.20250313.01.00",
      ua: UA,
    },
  ];
  for (const client of clients) {
    try {
      const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": client.ua,
          "Accept-Language": "ru,en;q=0.8",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: client.clientName,
              clientVersion: client.clientVersion,
              hl: "ru",
              gl: "RU",
            },
          },
          videoId,
        }),
        cache: "no-store",
      });
      if (!response.ok) continue;
      return (await response.json()) as {
        videoDetails?: { title?: string; shortDescription?: string; author?: string };
        captions?: {
          playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] };
        };
      };
    } catch {
      // try next client
    }
  }
  return null;
}

function rankTracks(tracks: CaptionTrack[]) {
  const score = (track: CaptionTrack) => {
    const lang = (track.languageCode || "").toLowerCase();
    let value = 0;
    if (lang.startsWith("ru")) value += 8;
    else if (lang.startsWith("en")) value += 4;
    if (!track.kind) value += 2;
    if (track.kind === "asr") value += 1;
    return value;
  };
  return [...tracks].filter((track) => track.baseUrl).sort((a, b) => score(b) - score(a));
}

async function loadCaptionTracks(tracks: CaptionTrack[]) {
  for (const track of rankTracks(tracks)) {
    const base = track.baseUrl!.replace(/\\u0026/g, "&");
    for (const extra of ["", "&fmt=json3", "&fmt=srv3", "&fmt=vtt"]) {
      const body = await fetchHtml(`${base}${extra}`);
      const cues = parseCaptionBody(body);
      if (cues.length) {
        return {
          cues,
          method: `youtube captions (${track.languageCode || "auto"}${track.kind ? ` ${track.kind}` : ""})`,
        };
      }
    }
  }
  return null;
}

async function youtubeTranscript(videoId: string): Promise<{
  cues: TranscriptCue[];
  method: string;
  description: string;
  title?: string;
  author?: string;
}> {
  const methods: string[] = [];
  let description = "";
  let title = "";
  let author = "";

  const player = await innertubePlayer(videoId);
  if (player?.videoDetails?.shortDescription) description = player.videoDetails.shortDescription;
  if (player?.videoDetails?.title) title = player.videoDetails.title;
  if (player?.videoDetails?.author) author = player.videoDetails.author;
  const innertubeTracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (innertubeTracks.length) {
    const loaded = await loadCaptionTracks(innertubeTracks);
    if (loaded) return { ...loaded, description, title, author };
    methods.push("innertube tracks empty");
  } else {
    methods.push("innertube without captionTracks");
  }

  try {
    const html = await fetchHtml(`https://www.youtube.com/watch?v=${videoId}`);
    const watchPlayer = parsePlayer(html);
    description = description || watchPlayer?.videoDetails?.shortDescription || "";
    title = title || watchPlayer?.videoDetails?.title || "";
    author = author || watchPlayer?.videoDetails?.author || "";
    let tracks = watchPlayer?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
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
    const loaded = await loadCaptionTracks(tracks);
    if (loaded) return { ...loaded, description, title, author };
    methods.push(tracks.length ? "watch caption URL gated" : "watch page without captionTracks");
  } catch {
    methods.push("watch page blocked");
  }

  try {
    const list = await fetchHtml(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
    const langs = [...list.matchAll(/lang_code="([^"]+)"/g)].map((item) => item[1]);
    const ordered = langs.sort((a, b) => Number(b.startsWith("ru")) - Number(a.startsWith("ru")));
    for (const lang of ordered.slice(0, 4)) {
      for (const extra of ["", "&kind=asr", "&fmt=json3", "&kind=asr&fmt=json3"]) {
        const xml = await fetchHtml(
          `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${encodeURIComponent(lang)}${extra}`,
        );
        const cues = parseCaptionBody(xml);
        if (cues.length) {
          methods.push(`timedtext ${lang}`);
          return { cues, method: methods.join(" · "), description, title, author };
        }
      }
    }
  } catch {
    methods.push("timedtext unavailable");
  }

  return {
    cues: [],
    method: methods.join(" · ") || "no public captions",
    description,
    title,
    author,
  };
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

function jsonString(html: string, keys: string[]) {
  for (const key of keys) {
    const match = html.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
    if (!match?.[1]) continue;
    try {
      return JSON.parse(`"${match[1]}"`) as string;
    } catch {
      return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  }
  return "";
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

  if (platform === "tiktok" && isTikTokHomeOrFeed(url)) {
    throw new Error(
      "Это главная TikTok, а не ролик. Вставь ссылку вида tiktok.com/@автор/video/123…",
    );
  }

  if (platform === "tiktok") {
    try {
      const tiktok = await fetchTikTokPublic(url);
      title = tiktok.title;
      author = tiktok.author;
      thumbnail = tiktok.thumbnail;
      description = tiktok.description;
      method.push(...tiktok.method);
      const cues: TranscriptCue[] = tiktok.transcriptText
        ? tiktok.transcriptText
            .split(/(?<=[.!?…])\s+/)
            .map((line, index) => ({ start: index * 2, duration: 2, text: line.trim() }))
            .filter((cue) => cue.text)
        : [];
      const transcriptText = tiktok.transcriptText;
      const about = summarizeAbout(title, description, transcriptText);
      const scenes = buildScenes(cues);
      const originalScript = buildOriginalScript(title, about, transcriptText, scenes);
      const analogous = analogize({
        title,
        about,
        transcript: transcriptText,
        niche,
        scenes,
      });
      const voiceover = toVoiceover({ title, description, transcript: transcriptText });
      return {
        url,
        platform,
        title,
        author,
        thumbnail,
        description,
        about,
        transcript: cues.length ? cues : [{ start: 0, duration: 0, text: transcriptText }],
        transcriptText,
        scenes,
        originalScript,
        analogous,
        painPoints: painFromText(transcriptText),
        method,
        confidence: transcriptText.length > 120 ? 0.72 : 0.58,
        voiceover,
        rewritten: "",
        telegramPost: "",
        threadsPost: "",
        telegramWords: 0,
        threadsWords: 0,
        packed: packCopy({
          title,
          description: description || about,
          voiceover,
          rewritten: "",
        }),
      };
    } catch (error) {
      method.push(error instanceof Error ? error.message : "tiktok fetch failed");
    }
  }

  try {
    const meta = await oembedMeta(platform, url);
    title = meta.title || "";
    author = meta.author_name || "";
    thumbnail = meta.thumbnail_url || null;
    method.push(`${platform} oEmbed`);
  } catch {
    method.push("oEmbed unavailable");
  }

  let pageHtml = "";
  try {
    pageHtml = await fetchHtml(url);
    if (!title) {
      title = og(pageHtml, "og:title") || stripHtml(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
    }
    description =
      description ||
      og(pageHtml, "og:description") ||
      jsonString(pageHtml, ["desc", "description", "caption", "videoDesc"]);
    thumbnail = thumbnail || og(pageHtml, "og:image");
    author = author || og(pageHtml, "og:site_name") || jsonString(pageHtml, ["nickname", "authorName", "ownerName"]);
    method.push("open graph");
  } catch {
    method.push("page fetch blocked");
  }

  let cues: TranscriptCue[] = [];
  if (platform === "youtube") {
    const id = youtubeId(url);
    if (id) {
      const result = await youtubeTranscript(id);
      cues = result.cues;
      if (result.description) description = result.description;
      if (result.title && (!title || title.length < result.title.length)) title = result.title;
      if (result.author) author = result.author;
      method.push(result.method);
    }
  } else if (platform === "tiktok" || platform === "vk") {
    const caption =
      jsonString(pageHtml, ["desc", "description", "caption", "text"]) ||
      og(pageHtml, "og:description") ||
      title;
    if (caption) {
      description = description || caption;
      method.push(`${platform} public caption`);
    }
  }

  let transcriptText = cues.map((cue) => cue.text).join(" ").trim();
  if (!transcriptText) {
    transcriptText = (description || title).trim();
    if (transcriptText) {
      cues = [{ start: 0, duration: 0, text: transcriptText }];
      method.push("voiceover from public description");
    }
  }
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
