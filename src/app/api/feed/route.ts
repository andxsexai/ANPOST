import { NextResponse } from "next/server";
import { loadFeed } from "@/lib/rss";

export const revalidate = 180;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const feed = await loadFeed(
    searchParams.get("niche") || undefined,
    searchParams.get("region") || undefined,
  );
  return NextResponse.json(feed);
}
