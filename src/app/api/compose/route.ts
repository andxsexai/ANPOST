import { NextResponse } from "next/server";
import { composeFromNews } from "@/lib/copywriter";
import type { NicheId } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    summary?: string;
    url?: string;
    sourceName?: string;
    niche?: NicheId;
  };
  if (!body.title) {
    return NextResponse.json({ error: "Нужен заголовок" }, { status: 400 });
  }
  return NextResponse.json(
    composeFromNews({
      title: body.title,
      summary: body.summary || "",
      url: body.url || "",
      sourceName: body.sourceName || "ANPOST",
      niche: body.niche || "news",
    }),
  );
}
