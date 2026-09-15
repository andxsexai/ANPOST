import { NextResponse } from "next/server";
import { drainUpdates, listTelegramPosts } from "@/lib/telegram-bot";
import { deleteWebhook, getMe } from "@/lib/telegram";
import { authorizeOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const gate = authorizeOperator(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    const me = await getMe();
    const posts = await listTelegramPosts();
    return NextResponse.json({
      bot: `@${me.username}`,
      name: me.first_name,
      posts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "bot offline" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const gate = authorizeOperator(request);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  try {
    await deleteWebhook();
    const result = await drainUpdates();
    const posts = await listTelegramPosts();
    return NextResponse.json({ ...result, posts });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "sync failed" },
      { status: 500 },
    );
  }
}
