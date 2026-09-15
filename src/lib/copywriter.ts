import { NICHES, NICHE_BY_ID } from "./niches";
import type { NicheId, TranscriptCue } from "./types";

function sentences(text: string) {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12)
    .slice(0, 24);
}

function firstHook(text: string) {
  const line = sentences(text)[0] || text.slice(0, 90);
  return line.replace(/^["«]+|["»]+$/g, "").slice(0, 140);
}

function nicheLexicon(niche: NicheId) {
  const map: Record<NicheId, { you: string; prize: string; cta: string }> = {
    money: {
      you: "тот, кто считает деньги как воздух",
      prize: "контроль над потоком, а не над чужим хайпом",
      cta: "Сохрани. Завтра это уже цена.",
    },
    news: {
      you: "тот, кто хочет карту мира, а не ленту страха",
      prize: "понимание раньше заголовка",
      cta: "Проверь источник. Потом говори.",
    },
    innovation: {
      you: "тот, кто собирает будущее по деталям",
      prize: "сигнал до того, как он станет рекламой",
      cta: "Возьми паттерн. Сделай свой ход.",
    },
    relations: {
      you: "тот, кто читает людей, а не статусы",
      prize: "язык, который сближает, а не продаёт",
      cta: "Напиши человеку. Не алгоритму.",
    },
    health: {
      you: "тот, кто бережёт тело как инфраструктуру",
      prize: "ясность вместо паники",
      cta: "Одно действие сегодня. Не десять советов.",
    },
    spirit: {
      you: "тот, кто ищет ось в шуме",
      prize: "тишина, которую нельзя скачать",
      cta: "Выключи. Останься. Услышь.",
    },
  };
  return map[niche];
}

export function summarizeAbout(title: string, description: string, transcript: string) {
  const body = transcript || description || title;
  const lines = sentences(body);
  if (!lines.length) return `Ролик «${title}» — публичный сигнал без расшифровки.`;
  const core = lines.slice(0, 3).join(" ");
  return `О чём видео: ${core}`;
}

export function buildScenes(cues: TranscriptCue[]) {
  if (!cues.length) return [];
  const scenes: Array<{ start: number; end: number; voice: string; onScreen: string }> = [];
  let bucket: TranscriptCue[] = [];
  let start = cues[0].start;
  const flush = () => {
    if (!bucket.length) return;
    const voice = bucket.map((cue) => cue.text).join(" ").trim();
    scenes.push({
      start,
      end: bucket[bucket.length - 1].start + bucket[bucket.length - 1].duration,
      voice,
      onScreen: voice.split(" ").slice(0, 6).join(" ").toUpperCase(),
    });
    bucket = [];
  };
  for (const cue of cues) {
    if (!bucket.length) start = cue.start;
    bucket.push(cue);
    const span = cue.start + cue.duration - start;
    if (span >= 8 || bucket.length >= 4) flush();
  }
  flush();
  return scenes.slice(0, 12);
}

export function buildOriginalScript(
  title: string,
  about: string,
  transcript: string,
  scenes: ReturnType<typeof buildScenes>,
) {
  const hook = firstHook(transcript || about || title);
  const body = scenes.length
    ? scenes.map((scene) => scene.voice)
    : sentences(transcript || about).slice(0, 6);
  const cta =
    sentences(transcript || about).at(-1) ||
    "Подпишись, если хочешь следующий разбор.";
  return { hook, body, cta };
}

function rewriteLine(line: string, niche: NicheId) {
  const voice = nicheLexicon(niche);
  const clean = line
    .replace(/\bI\b/g, "ты")
    .replace(/\bwe\b/gi, "мы")
    .replace(/subscribe|подпис/gi, "останься рядом")
    .replace(/link in bio|ссылк/gi, "карта в профиле");
  return `${clean} — для ${voice.you}.`;
}

export function analogize(input: {
  title: string;
  about: string;
  transcript: string;
  niche: NicheId;
  scenes: ReturnType<typeof buildScenes>;
}) {
  const niche = NICHE_BY_ID[input.niche] ? input.niche : "news";
  const voice = nicheLexicon(niche);
  const sourceLines = input.scenes.length
    ? input.scenes.map((scene) => scene.voice)
    : sentences(input.transcript || input.about || input.title);
  const hook = `Стоп. ${firstHook(input.transcript || input.about || input.title)} А если это про ${NICHE_BY_ID[niche].title.toLowerCase()}?`;
  const scenes = sourceLines.slice(0, 6).map((line, index) => {
    if (index === 0) return `Кадр 1. Хук: ${hook}`;
    return `Кадр ${index + 1}. ${rewriteLine(line, niche).slice(0, 180)}`;
  });
  const voiceover = [
    hook,
    `Ты — ${voice.you}.`,
    ...sourceLines.slice(1, 4).map((line) => rewriteLine(line, niche)),
    `Приз: ${voice.prize}.`,
    voice.cta,
  ].join("\n");

  const tags = NICHES.find((item) => item.id === niche)?.title ?? "новости";
  const ig = `${hook}\n\n${sourceLines.slice(0, 2).join("\n")}\n\n${voice.cta}\n\n#ANPOST #${tags.replace(/\s/g, "")} #OSINT`;
  const threads = `${hook}\n\n${voice.prize}\n\n${voice.cta}`;
  const tiktok = `${hook}\n\n${voice.cta} #fyp #${tags}`;
  const vk = `${hook}\n\nРазбор паттерна ролика и оригинальный сценарий под нишу «${tags}».\n\n${voice.cta}`;

  return {
    niche,
    hook,
    scenes,
    voiceover,
    captions: {
      instagram: ig.slice(0, 2100),
      threads: threads.slice(0, 480),
      tiktok: tiktok.slice(0, 900),
      vk: vk.slice(0, 1500),
    },
  };
}

export function composeFromNews(input: {
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  niche: NicheId;
}) {
  const voice = nicheLexicon(input.niche);
  const hook = firstHook(input.title);
  const ig = `${hook}\n\n${input.summary.slice(0, 220)}\n\nИсточник: ${input.sourceName}\n${voice.cta}\n\n#ANPOST #${NICHE_BY_ID[input.niche].title}`;
  const fb = `${input.title}\n\n${input.summary}\n\nОткрытый источник: ${input.sourceName}\n${input.url}`;
  const threads = `${hook}\n\n${voice.prize}\n\n${input.url}`;
  return { instagram: ig, facebook: fb, threads };
}
