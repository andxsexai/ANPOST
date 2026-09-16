import { NextResponse } from "next/server";
import { voiceoverGateway } from "@/lib/voiceover-gateway";
import { assertPublicHttpUrl } from "@/lib/operator";
import type { NicheId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; niche?: NicheId };
    const url = body.url?.trim();
    if (!url) return NextResponse.json({ error: "Нужна url" }, { status: 400 });
    assertPublicHttpUrl(url);
    const hit = await voiceoverGateway(url, body.niche || "news");
    if (!hit) {
      return NextResponse.json({ error: "Шлюз не получил озвучку. Попробуй текст вручную." }, { status: 404 });
    }
    return NextResponse.json(hit);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "gateway error" },
      { status: 400 },
    );
  }
}
