import { NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";
import type { TgUpdate } from "@/lib/telegram";
import { authorizeOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = authorizeOperator(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  const update = (await request.json()) as TgUpdate;
  const stored = await handleUpdate(update);
  return NextResponse.json({ ok: true, stored });
}
