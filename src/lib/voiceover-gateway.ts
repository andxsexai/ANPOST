import { fetchInstagramGraphql } from "./instagram-graphql";
import { fetchInstagramPost, isInstagramUrl } from "./instagram";
import { fetchTikTokPublic, isTikTokHomeOrFeed, isTikTokUrl } from "./tiktok";
import { apifyEnabled, apifyVoiceover } from "./apify-voiceover";
import { transcribeMediaUrl, whisperEnabled } from "./transcribe-audio";
import { analyzeVideo } from "./video";
import type { NicheId, TranscriptCue, VideoPlatform } from "./types";
import { wordCount } from "./utils";

export type VoiceoverHit = {
  text: string;
  title: string;
  author: string;
  thumbnail: string | null;
  description: string;
  platform: VideoPlatform;
  transcript: TranscriptCue[];
  method: string[];
};

const GATEWAY_MS = 14_000;
const LANE_MS = 9_000;

function host(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function detectPlatform(url: string): VideoPlatform {
  const h = host(url);
  if (h.includes("youtu")) return "youtube";
  if (h.includes("tiktok")) return "tiktok";
  if (h.includes("instagram") || h.includes("instagr.am")) return "instagram";
  if (h.includes("vk.com") || h.includes("vk.ru") || h.includes("vkvideo")) return "vk";
  if (h.includes("t.me") || h.includes("telegram")) return "telegram";
  return "unknown";
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms),
    ),
  ]);
}

function cuesFromText(text: string): TranscriptCue[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ start: index * 2, duration: 2, text: line }));
}

function score(hit: VoiceoverHit) {
  const words = wordCount(hit.text);
  const cues = hit.transcript.length;
  return words + cues * 3 + (hit.method.some((m) => m.includes("caption")) ? -5 : 0);
}

function mergeHits(a: VoiceoverHit, b: VoiceoverHit): VoiceoverHit {
  const best = score(a) >= score(b) ? a : b;
  const other = best === a ? b : a;
  const text = best.text.length >= other.text.length ? best.text : other.text;
  return {
    ...best,
    text,
    title: best.title || other.title,
    author: best.author || other.author,
    thumbnail: best.thumbnail || other.thumbnail,
    description: best.description || other.description,
    transcript: best.transcript.length ? best.transcript : other.transcript,
    method: [...new Set([...best.method, ...other.method, "gateway merge"])],
  };
}

async function laneRemoteGateway(url: string): Promise<VoiceoverHit | null> {
  const endpoint = process.env.ANPOST_VOICE_GATEWAY_URL || process.env.ANPOST_GATEWAY_URL;
  if (!endpoint) return null;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ url }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    text?: string;
    transcript?: string;
    title?: string;
    author?: string;
    thumbnail?: string | null;
  };
  const text = (data.text || data.transcript || "").trim();
  if (text.length < 12) return null;
  return {
    text,
    title: data.title || text.slice(0, 100),
    author: data.author || "gateway",
    thumbnail: data.thumbnail ?? null,
    description: text.slice(0, 280),
    platform: detectPlatform(url),
    transcript: cuesFromText(text),
    method: ["external voice gateway"],
  };
}

async function laneInstagram(url: string): Promise<VoiceoverHit | null> {
  const code = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([^/?#]+)/i)?.[1];
  const [postSettled, gqlSettled] = await Promise.allSettled([
    withTimeout(fetchInstagramPost(url), LANE_MS, "instagram card"),
    code
      ? withTimeout(fetchInstagramGraphql(code), LANE_MS, "instagram graphql")
      : Promise.resolve(null),
  ]);

  let caption = "";
  let voiceover = "";
  let title = "";
  let author = "instagram";
  let thumbnail: string | null = null;
  const method: string[] = ["gateway instagram"];

  if (postSettled.status === "fulfilled") {
    const post = postSettled.value;
    caption = post.caption;
    voiceover = post.voiceover;
    title = post.title;
    author = post.author;
    thumbnail = post.thumbnail;
    method.push(...post.method);
  }

  if (gqlSettled.status === "fulfilled" && gqlSettled.value) {
    const gql = gqlSettled.value;
    method.push(gql.method);
    if (gql.caption.length > caption.length) caption = gql.caption;
    if (gql.videoUrl && whisperEnabled()) {
      const spoken = await withTimeout(
        transcribeMediaUrl(gql.videoUrl),
        LANE_MS,
        "whisper",
      ).catch(() => null);
      if (spoken && spoken.length > voiceover.length) {
        voiceover = spoken;
        method.push("gateway whisper");
      }
    }
    if (!voiceover && gql.videoUrl && whisperEnabled()) {
      // already tried
    } else if (gql.videoUrl && !whisperEnabled()) {
      method.push("mp4 found (OPENAI for speech)");
    }
  }

  const text = voiceover.length > caption.length ? voiceover : caption;
  if (text.length < 8) return null;
  return {
    text,
    title: title || text.slice(0, 120),
    author,
    thumbnail,
    description: caption || text,
    platform: "instagram",
    transcript: cuesFromText(text),
    method,
  };
}

async function laneTikTok(url: string): Promise<VoiceoverHit | null> {
  if (isTikTokHomeOrFeed(url)) return null;
  const tiktok = await withTimeout(fetchTikTokPublic(url), LANE_MS, "tiktok");
  const text = tiktok.transcriptText;
  if (text.length < 8) return null;
  return {
    text,
    title: tiktok.title,
    author: tiktok.author,
    thumbnail: tiktok.thumbnail,
    description: tiktok.description,
    platform: "tiktok",
    transcript: cuesFromText(text),
    method: ["gateway tiktok", ...tiktok.method],
  };
}

async function laneAnalyzeVideo(url: string, niche: NicheId): Promise<VoiceoverHit | null> {
  const analysis = await withTimeout(analyzeVideo(url, niche), LANE_MS, "video");
  const text = analysis.transcriptText?.trim();
  if (!text || text.length < 8) return null;
  return {
    text,
    title: analysis.title,
    author: analysis.author,
    thumbnail: analysis.thumbnail,
    description: analysis.description,
    platform: analysis.platform,
    transcript: analysis.transcript.length ? analysis.transcript : cuesFromText(text),
    method: ["gateway video", ...analysis.method],
  };
}

async function laneApify(url: string): Promise<VoiceoverHit | null> {
  if (!apifyEnabled()) return null;
  const hit = await withTimeout(apifyVoiceover(url), 25_000, "apify");
  if (!hit?.text) return null;
  return {
    text: hit.text,
    title: hit.text.slice(0, 100),
    author: "apify",
    thumbnail: null,
    description: hit.text.slice(0, 280),
    platform: detectPlatform(url),
    transcript: cuesFromText(hit.text),
    method: ["gateway apify optional", hit.method],
  };
}

function lanesFor(url: string, niche: NicheId) {
  const list: Array<() => Promise<VoiceoverHit | null>> = [
    () => laneRemoteGateway(url),
    () => laneAnalyzeVideo(url, niche),
  ];
  if (isInstagramUrl(url)) list.unshift(() => laneInstagram(url));
  if (isTikTokUrl(url)) list.unshift(() => laneTikTok(url));
  list.push(() => laneApify(url));
  return list;
}

/**
 * Публичный шлюз: все дорожки параллельно, первый сильный ответ или лучший за GATEWAY_MS.
 * Токены Apify/OpenAI не обязательны.
 */
export async function voiceoverGateway(url: string, niche: NicheId = "news"): Promise<VoiceoverHit | null> {
  const lanes = lanesFor(url, niche);
  let best: VoiceoverHit | null = null;
  let settled = false;

  const finish = (hit: VoiceoverHit | null) => {
    if (!hit) return;
    best = best ? mergeHits(best, hit) : hit;
  };

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      settled = true;
      resolve();
    }, GATEWAY_MS);

    let pending = lanes.length;
    const checkEarly = () => {
      if (settled || !best) return;
      if (wordCount(best.text) >= 45 || best.transcript.length >= 8) {
        settled = true;
        clearTimeout(timer);
        resolve();
      }
    };

    for (const lane of lanes) {
      lane()
        .then((hit) => {
          finish(hit);
          checkEarly();
        })
        .catch(() => {})
        .finally(() => {
          pending -= 1;
          if (pending === 0 && !settled) {
            clearTimeout(timer);
            resolve();
          }
        });
    }
  });

  return best;
}
