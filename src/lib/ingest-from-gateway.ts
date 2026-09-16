import { analogize, buildOriginalScript, buildScenes, summarizeAbout } from "./copywriter";
import type { VoiceoverHit } from "./voiceover-gateway";
import type { NicheId, VideoAnalysis } from "./types";
import { packCopy, toVoiceover } from "./style";

export function analysisFromGateway(
  url: string,
  hit: VoiceoverHit,
  niche: NicheId,
): VideoAnalysis {
  const about = summarizeAbout(hit.title, hit.description, hit.text);
  const voiceover = toVoiceover({
    title: hit.title,
    description: hit.description,
    transcript: hit.text,
  });
  const scenes = buildScenes(hit.transcript);
  return {
    url,
    platform: hit.platform,
    title: hit.title,
    author: hit.author,
    thumbnail: hit.thumbnail,
    description: hit.description,
    about,
    transcript: hit.transcript,
    transcriptText: hit.text,
    scenes,
    originalScript: buildOriginalScript(hit.title, about, hit.text, scenes),
    analogous: analogize({
      title: hit.title,
      about,
      transcript: hit.text,
      niche,
      scenes,
    }),
    painPoints: [],
    method: hit.method,
    confidence: hit.text.length > 120 ? 0.82 : 0.62,
    voiceover,
    rewritten: "",
    telegramPost: "",
    threadsPost: "",
    telegramWords: 0,
    threadsWords: 0,
    packed: packCopy({
      title: hit.title,
      description: hit.description,
      voiceover,
      rewritten: "",
    }),
  };
}
