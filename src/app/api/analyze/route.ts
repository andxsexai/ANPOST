import { NextResponse } from "next/server";
import { ingestSignal } from "@/lib/ingest";
import type { NicheId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      text?: string;
      niche?: NicheId;
    };
    if (!body.url?.trim() && !body.text?.trim()) {
      return NextResponse.json({ error: "Нужна ссылка или текст" }, { status: 400 });
    }
    const analysis = await ingestSignal({
      url: body.url,
      text: body.text,
      niche: body.niche || "news",
    });
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось выгрузить сигнал" },
      { status: 400 },
    );
  }
}
