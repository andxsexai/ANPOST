import { transcribeMediaUrl } from "./transcribe-audio";

type ApifyHit = {
  text: string;
  videoUrl?: string;
  method: string;
};

function token() {
  return process.env.APIFY_TOKEN?.trim() || "";
}

function host(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function pickText(item: Record<string, unknown>): string {
  const keys = [
    "transcript",
    "transcription",
    "subtitle",
    "subtitles",
    "text",
    "caption",
    "description",
    "title",
  ];
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim().length > 30) return value.trim();
  }
  const nested = item.video as Record<string, unknown> | undefined;
  if (nested && typeof nested.subtitle === "string") return nested.subtitle;
  return "";
}

function pickVideo(item: Record<string, unknown>): string {
  const keys = ["videoUrl", "video_url", "downloadUrl", "videoDownloadUrl", "mp4"];
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.includes("http")) return value;
  }
  const versions = item.videoVersions as Array<{ url?: string }> | undefined;
  if (versions?.[0]?.url) return versions[0].url;
  return "";
}

async function runActor(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  const api = token();
  if (!api) return [];
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(api)}&timeout=180&memory=1024`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    },
  );
  if (!response.ok) return [];
  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

export function apifyEnabled() {
  return Boolean(token());
}

export async function apifyVoiceover(url: string): Promise<ApifyHit | null> {
  if (!token()) return null;
  const h = host(url);
  const attempts: Array<{ actor: string; input: Record<string, unknown>; label: string }> = [];

  if (h.includes("instagram")) {
    attempts.push({
      actor: "apify~instagram-scraper",
      label: "apify instagram",
      input: { directUrls: [url], resultsType: "posts", resultsLimit: 1 },
    });
    attempts.push({
      actor: "shlee~instagram-post-scraper",
      label: "apify instagram post",
      input: { postUrls: [url] },
    });
  }
  if (h.includes("tiktok")) {
    attempts.push({
      actor: "clockworks~tiktok-scraper",
      label: "apify tiktok",
      input: { postURLs: [url], resultsPerPage: 1 },
    });
  }
  if (h.includes("youtu")) {
    attempts.push({
      actor: "pintostudio~youtube-transcript-scraper",
      label: "apify youtube transcript",
      input: { videoUrls: [url] },
    });
    attempts.push({
      actor: "topaz_sharingan~youtube-transcript-scraper",
      label: "apify youtube transcript alt",
      input: { urls: [url] },
    });
  }

  for (const attempt of attempts) {
    try {
      const items = await runActor(attempt.actor, attempt.input);
      for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        let text = pickText(item);
        const videoUrl = pickVideo(item);
        if (!text && videoUrl) {
          const spoken = await transcribeMediaUrl(videoUrl);
          if (spoken) text = spoken;
        }
        if (text.length > 40) {
          return { text, videoUrl: videoUrl || undefined, method: attempt.label };
        }
      }
    } catch {
      // next actor
    }
  }

  return null;
}
