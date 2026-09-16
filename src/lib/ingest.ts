import { analogize, buildOriginalScript, buildScenes, summarizeAbout } from "./copywriter";
import { composePlatforms, packCopy, toVoiceover } from "./style";
import { extractArticle } from "./article";
import { fetchPublicTelegram, isTelegramUrl } from "./telegram";
import type { NicheId, VideoAnalysis } from "./types";
import { wordCount } from "./utils";
import { assertPublicHttpUrl } from "./operator";
import { analysisFromGateway } from "./ingest-from-gateway";
import { voiceoverGateway } from "./voiceover-gateway";

function emptyAnalysis(partial: Partial<VideoAnalysis> & { title: string }): VideoAnalysis {
  const description = partial.description || "";
  const transcriptText = partial.transcriptText || "";
  const about = summarizeAbout(partial.title, description, transcriptText);
  const voiceover = toVoiceover({
    title: partial.title,
    description,
    transcript: transcriptText,
  });
  const scenes = buildScenes(partial.transcript || []);
  return {
    url: partial.url || "",
    platform: partial.platform || "text",
    title: partial.title,
    author: partial.author || "ANPOST",
    thumbnail: partial.thumbnail || null,
    description,
    about,
    transcript: partial.transcript || [],
    transcriptText,
    scenes,
    originalScript: buildOriginalScript(partial.title, about, voiceover, scenes),
    analogous: analogize({
      title: partial.title,
      about,
      transcript: voiceover,
      niche: (partial.analogous?.niche as NicheId) || "news",
      scenes,
    }),
    painPoints: partial.painPoints || [],
    method: partial.method || ["pasted text"],
    confidence: partial.confidence ?? 0.7,
    voiceover,
    rewritten: "",
    telegramPost: "",
    threadsPost: "",
    telegramWords: 0,
    threadsWords: 0,
    packed: packCopy({
      title: partial.title,
      description: description || about,
      voiceover,
      rewritten: "",
    }),
  };
}

function finish(result: VideoAnalysis): VideoAnalysis {
  const voiceover =
    result.voiceover ||
    result.transcriptText ||
    result.description ||
    result.title;
  const transcript = result.transcript.length
    ? result.transcript
    : voiceover
      ? [{ start: 0, duration: 0, text: voiceover }]
      : [];
  const transcriptText = result.transcriptText || voiceover;
  const posts = composePlatforms({
    title: result.title,
    description: result.description,
    transcript: transcriptText,
    body: transcriptText,
  });
  return {
    ...result,
    transcript,
    transcriptText,
    voiceover,
    ...posts,
    packed: packCopy({
      title: result.title,
      description: result.description || result.about,
      voiceover,
      rewritten: posts.rewritten,
      telegramPost: posts.telegramPost,
      threadsPost: posts.threadsPost,
    }),
  };
}

function withExtra(result: VideoAnalysis, extra: string): VideoAnalysis {
  if (!extra.trim()) return result;
  const trimmed = extra.trim();
  if (result.transcriptText.includes(trimmed)) return result;
  const transcriptText =
    trimmed.length > result.transcriptText.length + 40
      ? trimmed
      : [result.transcriptText, trimmed].filter(Boolean).join("\n\n");
  const voiceover = toVoiceover({
    title: result.title,
    description: result.description,
    transcript: transcriptText,
  });
  return {
    ...result,
    transcriptText,
    voiceover,
    packed: packCopy({
      title: result.title,
      description: result.description || result.about,
      voiceover,
      rewritten: "",
    }),
  };
}

export async function ingestSignal(input: {
  url?: string;
  text?: string;
  niche?: NicheId;
}): Promise<VideoAnalysis> {
  return finish(await ingestCore(input));
}

async function ingestCore(input: {
  url?: string;
  text?: string;
  niche?: NicheId;
}): Promise<VideoAnalysis> {
  const niche = input.niche || "news";
  const url = (input.url || "").trim();
  const text = (input.text || "").trim();
  if (url) assertPublicHttpUrl(url);

  if (url && isTelegramUrl(url)) {
    try {
      const post = await fetchPublicTelegram(url);
      return withExtra(
        emptyAnalysis({
        url,
        platform: "telegram",
        title: post.title,
        author: post.author,
        description: post.description,
        transcriptText: post.text,
        thumbnail: post.thumbnail,
        method: ["telegram public embed"],
        analogous: {
          niche,
          hook: "",
          scenes: [],
          voiceover: "",
          captions: { instagram: "", threads: "", tiktok: "", vk: "" },
        },
      }),
        text,
      );
    } catch {
      return emptyAnalysis({
        url,
        platform: "telegram",
        title: "Пост Telegram",
        description: "Публичный embed закрыт. Вставь текст поста в поле ниже — выгрузим сценарий из него.",
        method: ["telegram fallback"],
        analogous: {
          niche,
          hook: "",
          scenes: [],
          voiceover: "",
          captions: { instagram: "", threads: "", tiktok: "", vk: "" },
        },
      });
    }
  }

  if (url) {
    try {
      const hit = await voiceoverGateway(url, niche);
      if (hit && wordCount(hit.text) >= 8) {
        return withExtra(analysisFromGateway(url, hit, niche), text);
      }
    } catch {
      // fall through to article
    }
    try {
      const article = await extractArticle(url);
      return withExtra(
        emptyAnalysis({
          url,
          title: article.title,
          description: article.description,
          transcriptText: article.body,
          thumbnail: article.thumbnail,
          method: ["gateway miss", "article extract"],
          analogous: {
            niche,
            hook: "",
            scenes: [],
            voiceover: "",
            captions: { instagram: "", threads: "", tiktok: "", vk: "" },
          },
        }),
        text,
      );
    } catch (error) {
      return emptyAnalysis({
        url,
        title: url,
        description: error instanceof Error ? error.message : "Шлюз не снял озвучку. Вставь текст вручную.",
        method: ["voice gateway empty"],
        analogous: {
          niche,
          hook: "",
          scenes: [],
          voiceover: "",
          captions: { instagram: "", threads: "", tiktok: "", vk: "" },
        },
      });
    }
  }

  if (text) {
    const title = text.split("\n").map((line) => line.trim()).find(Boolean) || "Пост";
    return emptyAnalysis({
      platform: "text",
      title,
      description: text,
      transcriptText: text,
      method: ["raw text"],
      analogous: { niche, hook: "", scenes: [], voiceover: "", captions: { instagram: "", threads: "", tiktok: "", vk: "" } },
    });
  }

  throw new Error("Нужна ссылка или текст");
}
