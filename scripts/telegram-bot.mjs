import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(resolve(file), "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const idx = trimmed.indexOf("=");
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // missing env file is fine
    }
  }
}

loadEnv();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is missing");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
const APP = process.env.ANPOST_URL || "http://localhost:3000";
const SECRET = process.env.ANPOST_OPERATOR_SECRET || "";

function rewrite(text) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = (lines[0] || "Пост").slice(0, 110);
  const body = lines.join("\n\n");
  return `🌿 ${title}

${body}

Смысл источника сохранён. Текст только вычищен для чтения.`;
}

async function tg(method, payload) {
  try {
    const response = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return await response.json();
  } catch (error) {
    return { ok: false, description: String(error) };
  }
}

async function send(chatId, text) {
  for (const chunk of text.match(/[\s\S]{1,3900}/g) || [text]) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true,
    });
  }
}

async function mirror(update) {
  try {
    const response = await fetch(`${APP}/api/telegram/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SECRET ? { "x-anpost-secret": SECRET } : {}),
      },
      body: JSON.stringify(update),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const me = await tg("getMe", {});
if (!me.ok) {
  console.error(me);
  process.exit(1);
}
await tg("deleteWebhook", { drop_pending_updates: false });
await tg("setMyCommands", {
  commands: [
    { command: "start", description: "Как работает переработка" },
    { command: "news", description: "12 новостей ANPOST" },
    { command: "post", description: "Выложить новость: /post 3" },
    { command: "style", description: "Напомни стиль канала" },
  ],
});
console.log(`ANPOST bot live as @${me.result.username}`);

let offset = 0;
while (true) {
  const data = await tg("getUpdates", {
    offset,
    timeout: 25,
    allowed_updates: ["message", "channel_post"],
  });
  if (!data.ok) {
    console.error("telegram lag", data.description || data);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    continue;
  }
  for (const update of data.result) {
    offset = update.update_id + 1;
    const message = update.message || update.channel_post;
    const text = (message?.text || message?.caption || "").trim();
    const mirrored = await mirror(update);
    if (mirrored) continue;
    if (update.message) {
      if (!text || text.startsWith("/start") || text.startsWith("/help") || text.startsWith("/style")) {
        await send(
          message.chat.id,
          text?.startsWith("/style")
            ? "Стиль: оставляем факты источника, чистим абзацы, не подменяем чужой рамкой. Кинь любой текст."
            : "Кинь любой текст, подпись клипа или перешли пост. Верну тот же смысл, только легче читать.",
        );
      } else {
        await send(message.chat.id, rewrite(text));
      }
    }
  }
}
