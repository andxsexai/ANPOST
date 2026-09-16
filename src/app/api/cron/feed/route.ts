import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { warmAllFeeds } from "@/lib/feed-cache";
import { loadFeed } from "@/lib/rss";
import { authorizeCron } from "@/lib/operator";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const gate = authorizeCron(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  revalidateTag("feed", "max");
  const feed = await loadFeed();
  await warmAllFeeds();

  return NextResponse.json({
    ok: true,
    day: feed.day,
    generatedAt: feed.generatedAt,
    articles: feed.articles.length,
    liveSources: feed.sources.filter((source) => source.ok).length,
  });
}
