import { analogize, buildOriginalScript, buildScenes, summarizeAbout } from "./copywriter";
import { composePlatforms, packCopy, toVoiceover } from "./style";
import { extractArticle } from "./article";
import { fetchPublicTelegram, isTelegramUrl } from "./telegram";
import { fetchInstagramPost, isInstagramUrl } from "./instagram";
import type { NicheId, VideoAnalysis } from "./types";
import { analyzeVideo } from "./video";
import { wordCount } from "./utils";
import { apifyVoiceover } from "./apify-voiceover";
import { assertPublicHttpUrl } from "./operator";

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

async function boostVoiceover(result: VideoAnalysis, url: string): Promise<VideoAnalysis> {
  if (!url || wordCount(result.transcriptText) >= 120) return result;
  const apify = await apifyVoiceover(url);
  if (!apify?.text || apify.text.length <= result.transcriptText.length + 20) return result;
  const transcript = apify.text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ start: index * 2, duration: 2, text: line }));
  return {
    ...result,
    transcriptText: apify.text,
    transcript: transcript.length ? transcript : result.transcript,
    method: [...result.method, apify.method],
    description: result.description || apify.text.slice(0, 280),
  };
}

export async function ingestSignal(input: {
  url?: string;
  text?: string;
  niche?: NicheId;
}): Promise<VideoAnalysis> {
  const url = (input.url || "").trim();
  const core = await ingestCore(input);
  const boosted = url ? await boostVoiceover(core, url) : core;
  return finish(boosted);
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

  if (url && isInstagramUrl(url)) {
    try {
      const post = await fetchInstagramPost(url);
      return withExtra(
        emptyAnalysis({
          url,
          platform: "instagram",
          title: post.title,
          author: post.author,
          description: post.caption,
          transcriptText: post.voiceover,
          transcript: post.voiceover
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => ({ start: index * 2, duration: 2, text: line })),
          thumbnail: post.thumbnail,
          method: post.method,
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
        platform: "instagram",
        title: "Пост Instagram",
        description:
          error instanceof Error
            ? error.message
            : "Подпись не снялась. Вставь текст поста в поле ниже.",
        method: ["instagram fallback"],
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
      const analysis = await analyzeVideo(url, niche);
      const voiceover = toVoiceover({
        title: analysis.title,
        description: analysis.description,
        transcript: analysis.transcriptText,
      });
      let transcriptText = analysis.transcriptText;
      if (
        wordCount(transcriptText || analysis.description) < 120 &&
        !["youtube", "tiktok", "instagram", "telegram", "vk"].includes(analysis.platform)
      ) {
        try {
          const article = await extractArticle(url);
          transcriptText = article.body;
          return withExtra(
            emptyAnalysis({
            ...analysis,
            title: analysis.title || article.title,
            description: analysis.description || article.description,
            thumbnail: analysis.thumbnail || article.thumbnail,
            transcriptText,
            method: [...analysis.method, "article body"],
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
          // keep video/oembed result
        }
      }
      return withExtra(
        {
        ...analysis,
        voiceover: toVoiceover({
          title: analysis.title,
          description: analysis.description,
          transcript: transcriptText || voiceover,
        }),
        transcriptText: transcriptText || analysis.transcriptText,
        rewritten: "",
        telegramPost: "",
        threadsPost: "",
        telegramWords: 0,
        threadsWords: 0,
        packed: packCopy({
          title: analysis.title,
          description: analysis.description || analysis.about,
          voiceover: transcriptText || voiceover,
          rewritten: "",
        }),
      },
        text,
      );
    } catch (error) {
      try {
        const article = await extractArticle(url);
        return emptyAnalysis({
          url,
          title: article.title,
          description: article.description,
          transcriptText: article.body,
          thumbnail: article.thumbnail,
          method: ["article extract"],
          analogous: {
            niche,
            hook: "",
            scenes: [],
            voiceover: "",
            captions: { instagram: "", threads: "", tiktok: "", vk: "" },
          },
        });
      } catch {
        return emptyAnalysis({
          url,
          title: url,
          description: error instanceof Error ? error.message : "не удалось снять метаданные",
          method: ["fallback after fetch error"],
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
