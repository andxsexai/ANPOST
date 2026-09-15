export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function decodeEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );
}

export function stripHtml(value: string) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashId(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function limitWords(text: string, max: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return text.trim();
  return `${words.slice(0, max).join(" ")}…`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function relativeTime(iso: string | null) {
  if (!iso) return "без даты";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "без даты";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.round(hours / 24);
  return `${days} д`;
}
