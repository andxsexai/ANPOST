import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getUpdates,
  messageText,
  rewriteTelegram,
  sendMessage,
  type TgUpdate,
} from "./telegram";

const STORE = path.join(process.cwd(), ".data", "telegram-posts.json");
const OFFSET = path.join(process.cwd(), ".data", "telegram-offset.json");

export type StoredPost = {
  id: string;
  chatId: number;
  chat: string;
  text: string;
  rewritten: string;
  at: string;
};

async function loadPosts(): Promise<StoredPost[]> {
  try {
    return JSON.parse(await readFile(STORE, "utf8")) as StoredPost[];
  } catch {
    return [];
  }
}

async function savePost(post: StoredPost) {
  await mkdir(path.dirname(STORE), { recursive: true });
  const posts = [post, ...(await loadPosts())].slice(0, 80);
  await writeFile(STORE, JSON.stringify(posts, null, 2));
  return posts;
}

export async function listTelegramPosts() {
  return loadPosts();
}

export async function handleUpdate(update: TgUpdate) {
  const message = update.message || update.channel_post;
  if (!message) return null;
  const text = messageText(message);
  if (!text) {
    if (update.message) {
      await sendMessage(
        message.chat.id,
        "Пришли текст, подпись к клипу или ссылку — перепишу в стиль канала.",
      );
    }
    return null;
  }
  if (text.startsWith("/start") || text.startsWith("/help")) {
    await sendMessage(
      message.chat.id,
      "Кинь любой текст или перешли пост. Верну тот же смысл, только легче читать. Без чужих шаблонов.",
    );
    return null;
  }
  const rewritten = rewriteTelegram(text);
  if (update.message) {
    await sendMessage(message.chat.id, rewritten);
  }
  const stored = await savePost({
    id: `${message.chat.id}:${message.message_id}`,
    chatId: message.chat.id,
    chat: message.chat.title || message.chat.username || String(message.chat.id),
    text,
    rewritten,
    at: new Date().toISOString(),
  });
  return stored[0];
}

async function loadOffset() {
  try {
    const data = JSON.parse(await readFile(OFFSET, "utf8")) as { offset: number };
    return data.offset || 0;
  } catch {
    return 0;
  }
}

async function saveOffset(offset: number) {
  await mkdir(path.dirname(OFFSET), { recursive: true });
  await writeFile(OFFSET, JSON.stringify({ offset }));
}

export async function drainUpdates() {
  const offset = await loadOffset();
  const updates = await getUpdates(offset, 0);
  const handled = [];
  let last = offset;
  for (const update of updates) {
    last = update.update_id + 1;
    handled.push(await handleUpdate(update));
  }
  if (last !== offset) await saveOffset(last);
  return { last, handled: handled.filter(Boolean), count: updates.length };
}
