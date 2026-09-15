import { NextResponse } from "next/server";
import { composePlatforms, packCopy } from "@/lib/style";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    transcript?: string;
    text?: string;
  };
  const source = {
    title: body.title,
    description: body.description,
    transcript: body.transcript || body.text,
    body: body.text,
  };
  const posts = composePlatforms(source);
  return NextResponse.json({
    ...posts,
    packed: packCopy({
      title: body.title || "Пост",
      description: body.description || "",
      voiceover: body.transcript || body.text || "",
      rewritten: posts.rewritten,
      telegramPost: posts.telegramPost,
      threadsPost: posts.threadsPost,
    }),
  });
}
