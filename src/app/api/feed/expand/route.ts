import { NextResponse } from "next/server";
import { extractArticle } from "@/lib/article";
import { composePlatforms } from "@/lib/style";
import { assertPublicHttpUrl } from "@/lib/operator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) return NextResponse.json({ error: "Нужен url" }, { status: 400 });
  try {
    assertPublicHttpUrl(url);
    const article = await extractArticle(url);
    const title = article.title || url;
    const body = article.body || article.description || "";
    const posts = composePlatforms({
      title,
      description: article.description,
      transcript: body,
      body,
    });
    return NextResponse.json({
      title,
      description: article.description,
      body,
      thumbnail: article.thumbnail,
      rewritten: posts.rewritten,
      telegramPost: posts.telegramPost,
      threadsPost: posts.threadsPost,
      siteLink: `/analyze?url=${encodeURIComponent(url)}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось развернуть новость" },
      { status: 400 },
    );
  }
}
