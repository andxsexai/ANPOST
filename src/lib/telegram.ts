import { rewriteEditorial } from "./style";
import { stripHtml } from "./utils";

const API = "https://api.telegram.org";

export function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  return token;
}

async function tg<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API}/bot${botToken()}/${method}`, {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
  const data = (await response.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result;
}

export type TgMessage = {
  message_id: number;
  text?: string;
  caption?: string;
  chat: { id: number; type: string; title?: string; username?: string };
  from?: { username?: string; first_name?: string };
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  channel_post?: TgMessage;
};

export async function getMe() {
  return tg<{ username: string; first_name: string; id: number }>("getMe");
}

export async function sendMessage(chatId: number | string, text: string) {
  const chunks = text.match(/[\s\S]{1,3900}/g) || [text];
  let last = null;
  for (const chunk of chunks) {
    last = await tg("sendMessage", {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true,
    });
  }
  return last;
}

export async function getUpdates(offset?: number, timeout = 0) {
  return tg<TgUpdate[]>("getUpdates", {
    offset,
    timeout,
    allowed_updates: ["message", "channel_post"],
  });
}

export async function deleteWebhook() {
  return tg("deleteWebhook", { drop_pending_updates: false });
}

export function messageText(message: TgMessage) {
  return (message.text || message.caption || "").trim();
}

export function rewriteTelegram(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  return rewriteEditorial({
    title: lines[0],
    body: lines.slice(1).join("\n") || text,
    description: text,
  });
}

export async function fetchPublicTelegram(url: string) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (!parts.length) throw new Error("Нужна ссылка вида t.me/channel/123");
  const embed = `https://t.me/${parts.join("/")}?embed=1&mode=tme`;
  const html = await fetch(embed, {
    headers: { "User-Agent": "ANPOST/1.0", Accept: "text/html" },
    cache: "no-store",
  }).then((response) => response.text());
  const text = stripHtml(
    html.match(/class="[^"]*tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "",
  );
  const title = stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "")
    .replace(/ – Telegram$/i, "")
    .trim();
  const image =
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ||
    html.match(/background-image:url\('([^']+)'\)/)?.[1] ||
    null;
  return {
    title: title || parts[0],
    author: parts[0],
    description: text || title,
    thumbnail: image,
    text: text || title,
  };
}

export function isTelegramUrl(value: string) {
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    return host === "t.me" || host === "telegram.me";
  } catch {
    return false;
  }
}
