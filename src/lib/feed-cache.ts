import { unstable_cache } from "next/cache";
import { loadFeed } from "./rss";
import type { FeedResponse } from "./types";

function cacheKey(niche?: string, region?: string) {
  return `feed:${niche || "all"}:${region || "all"}`;
}

export function getCachedFeed(niche?: string, region?: string): Promise<FeedResponse> {
  return unstable_cache(
    async () => loadFeed(niche, region),
    [cacheKey(niche, region)],
    { revalidate: 900, tags: ["feed", cacheKey(niche, region)] },
  )();
}

export async function warmAllFeeds() {
  const niches = ["all", "news", "money", "innovation", "relations", "health", "spirit"] as const;
  await Promise.all(niches.map((niche) => getCachedFeed(niche === "all" ? undefined : niche)));
}
