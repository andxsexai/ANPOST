import { NextResponse } from "next/server";
import { analogize } from "@/lib/copywriter";
import type { NicheId } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    about?: string;
    transcript?: string;
    niche?: NicheId;
  };
  const result = analogize({
    title: body.title || "",
    about: body.about || "",
    transcript: body.transcript || "",
    niche: body.niche || "news",
    scenes: [],
  });
  return NextResponse.json(result);
}
