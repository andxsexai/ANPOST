import { limitWords, wordCount } from "./utils";

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function sentences(text: string) {
  return text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?…])\s+/)
    .map((part) => part.replace(/^[•\-\u2022]\s*/, "• ").trim())
    .filter((part) => part.length > 3);
}

function sourcePack(input: {
  title?: string;
  description?: string;
  transcript?: string;
  body?: string;
}) {
  const chunks = [input.transcript, input.body, input.description]
    .map((part) => part?.trim() || "")
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  const unique: string[] = [];
  for (const chunk of chunks) {
    if (unique.some((item) => item.includes(chunk) || chunk.includes(item))) continue;
    unique.push(chunk);
  }
  const raw = unique[0] || input.title || "";
  const lines = sentences(raw);
  const first = (input.title || lines[0] || "Пост").trim();
  const title = clean(first.replace(/^#+\s*/, "")).slice(0, 110);
  return { raw: raw || first, lines, title };
}

function clarify(line: string) {
  const simple = line
    .replace(/👉/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (simple.startsWith("•")) {
    return `Коротко: ${simple.replace(/^•\s*/, "").replace(/;$/, ".")}`;
  }
  if (simple.length < 40) return "";
  return `Проще: ${simple.charAt(0).toLowerCase()}${simple.slice(1)}`;
}

export function rewriteEditorial(input: {
  title?: string;
  description?: string;
  transcript?: string;
  body?: string;
}) {
  const { lines, title } = sourcePack(input);
  const body = lines
    .filter((line) => !/^#/.test(line))
    .map((line) => line.replace(/👉/g, "").trim())
    .join("\n\n");
  return `🌿 ${title}

${body}`.trim();
}

export function toVoiceover(input: {
  title: string;
  description: string;
  transcript: string;
}) {
  if (input.transcript.trim()) {
    return input.transcript.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  const base = sentences(input.description || input.title);
  if (!base.length) return input.title;
  return [input.title, ...base].join("\n\n");
}

export function composeTelegramPost(input: {
  title?: string;
  description?: string;
  transcript?: string;
  body?: string;
}) {
  const { lines, title } = sourcePack(input);
  const blocks: string[] = [`🌿 ${title}`, ""];
  for (const line of lines) {
    const cleanLine = line.replace(/👉/g, "").trim();
    if (!cleanLine) continue;
    blocks.push(cleanLine);
    const extra = clarify(cleanLine);
    if (extra && extra.length < 280 && extra !== cleanLine) blocks.push(extra);
  }
  blocks.push("");
  blocks.push("Текст собран из источника. Смысл тот же, только легче читается.");
  return limitWords(blocks.join("\n\n"), 1500);
}

export function composeThreadsPost(input: {
  title?: string;
  description?: string;
  transcript?: string;
  body?: string;
}) {
  const { lines, title } = sourcePack(input);
  const core = lines
    .slice(0, 10)
    .map((line) => line.replace(/👉/g, "").trim())
    .filter(Boolean)
    .join("\n\n");
  return limitWords(`${title}\n\n${core}`, 500);
}

export function composePlatforms(input: {
  title?: string;
  description?: string;
  transcript?: string;
  body?: string;
}) {
  const telegramPost = composeTelegramPost(input);
  const threadsPost = composeThreadsPost(input);
  const rewritten = rewriteEditorial(input);
  return {
    rewritten,
    telegramPost,
    threadsPost,
    telegramWords: wordCount(telegramPost),
    threadsWords: wordCount(threadsPost),
  };
}

export function packCopy(input: {
  title: string;
  description: string;
  voiceover: string;
  rewritten: string;
  telegramPost?: string;
  threadsPost?: string;
}) {
  return [
    `ЗАГОЛОВОК\n${input.title}`,
    `ОПИСАНИЕ\n${input.description}`,
    `ПОЛНЫЙ ТЕКСТ / ОЗВУЧКА\n${input.voiceover}`,
    input.telegramPost ? `TELEGRAM ≤1500 слов\n${input.telegramPost}` : "",
    input.threadsPost ? `THREADS ≤500 слов\n${input.threadsPost}` : "",
    input.rewritten ? `ДОРАБОТКА\n${input.rewritten}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
