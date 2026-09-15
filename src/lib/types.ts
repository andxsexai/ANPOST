export type Region = "US" | "KR" | "JP" | "CN" | "RU";

export type NicheId =
  | "money"
  | "news"
  | "innovation"
  | "relations"
  | "health"
  | "spirit";

export type SourceId =
  | "npr"
  | "cnn"
  | "techcrunch"
  | "yonhap"
  | "nhk"
  | "cgtn"
  | "tass"
  | "ria"
  | "interfax"
  | "lenta";

export type Source = {
  id: SourceId;
  name: string;
  short: string;
  region: Region;
  country: string;
  language: string;
  rss: string;
  site: string;
  affiliation: "independent" | "public" | "state" | "agency";
  biasNote: string;
  niches: NicheId[];
};

export type Article = {
  id: string;
  sourceId: SourceId;
  sourceName: string;
  region: Region;
  title: string;
  summary: string;
  url: string;
  publishedAt: string | null;
  niche: NicheId;
  heat: number;
  signals: string[];
};

export type FeedResponse = {
  generatedAt: string;
  articles: Article[];
  sources: Array<{
    id: SourceId;
    name: string;
    region: Region;
    ok: boolean;
    count: number;
    error?: string;
    latencyMs: number;
  }>;
  clusters: StoryCluster[];
};

export type StoryCluster = {
  id: string;
  title: string;
  count: number;
  regions: Region[];
  sources: string[];
  heat: number;
  gap: string;
};

export type VideoPlatform = "youtube" | "tiktok" | "vk" | "instagram" | "unknown";

export type TranscriptCue = {
  start: number;
  duration: number;
  text: string;
};

export type VideoAnalysis = {
  url: string;
  platform: VideoPlatform;
  title: string;
  author: string;
  thumbnail: string | null;
  description: string;
  about: string;
  transcript: TranscriptCue[];
  transcriptText: string;
  scenes: Array<{ start: number; end: number; voice: string; onScreen: string }>;
  originalScript: {
    hook: string;
    body: string[];
    cta: string;
  };
  analogous: {
    niche: NicheId;
    hook: string;
    scenes: string[];
    voiceover: string;
    captions: {
      instagram: string;
      threads: string;
      tiktok: string;
      vk: string;
    };
  };
  painPoints: string[];
  method: string[];
  confidence: number;
};
