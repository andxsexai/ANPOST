const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const MAX_BYTES = 24 * 1024 * 1024;

export function whisperEnabled() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function transcribeMediaUrl(mediaUrl: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const media = await fetch(mediaUrl, {
    headers: { "User-Agent": UA, Referer: "https://www.instagram.com/" },
    cache: "no-store",
  });
  if (!media.ok) return null;

  const buffer = Buffer.from(await media.arrayBuffer());
  if (buffer.length > MAX_BYTES || buffer.length < 8_000) return null;

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: "video/mp4" }), "clip.mp4");
  form.append("model", "whisper-1");
  form.append("language", "ru");
  form.append("response_format", "text");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!response.ok) return null;
  const text = (await response.text()).trim();
  return text.length > 20 ? text : null;
}
