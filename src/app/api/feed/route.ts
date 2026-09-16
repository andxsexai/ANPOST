import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { getCachedFeed } from "@/lib/feed-cache";
import { loadFeed } from "@/lib/rss";
export const revalidate = 900;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const niche = searchParams.get("niche") || undefined;
  const region = searchParams.get("region") || undefined;
  const bust = searchParams.has("day") || searchParams.get("refresh") === "1";

  if (bust) {
    revalidateTag("feed", "max");
    const feed = await loadFeed(niche, region);
    return NextResponse.json(feed);
  }

  const feed = await getCachedFeed(niche, region);
  return NextResponse.json(feed);
}
