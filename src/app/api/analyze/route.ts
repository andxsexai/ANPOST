import { NextResponse } from "next/server";
import type { NicheId } from "@/lib/types";
import { analyzeVideo } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; niche?: NicheId };
    if (!body.url) {
      return NextResponse.json({ error: "Нужна ссылка" }, { status: 400 });
    }
    const analysis = await analyzeVideo(body.url.trim(), body.niche || "news");
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось прочитать ссылку" },
      { status: 400 },
    );
  }
}
