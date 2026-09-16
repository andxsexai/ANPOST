import { getCachedFeed } from "./feed-cache";
import { extractArticle } from "./article";
import { composePlatforms } from "./style";
import { sendMessage } from "./telegram";
import type { Article } from "./types";

export function channelId() {
  return process.env.TELEGRAM_CHANNEL_ID?.trim() || "";
}

export async function listNews(limit = 12) {
  const feed = await getCachedFeed();
  return feed.articles.slice(0, limit);
}

export function formatNewsList(articles: Article[]) {
  if (!articles.length) return "Лента пуста. Попробуй позже или /news снова.";
  return articles
    .map(
      (item, index) =>
        `${index + 1}. [${item.region}] ${item.sourceName}\n${item.title}\n${item.url}`,
    )
    .join("\n\n");
}

export async function publishNewsItem(index: number, fallbackChatId?: number | string) {
  const articles = await listNews(20);
  const article = articles[index - 1];
  if (!article) throw new Error(`Нет новости №${index}. Сначала /news`);

  let body = article.summary;
  try {
    const extracted = await extractArticle(article.url);
    body = extracted.body || extracted.description || body;
  } catch {
    // keep summary
  }

  const posts = composePlatforms({
    title: article.title,
    description: article.summary,
    transcript: body,
    body,
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://anpost.vercel.app";
  const text = `${posts.telegramPost}\n\nИсточник: ${article.url}\nРазбор: ${site}/analyze?url=${encodeURIComponent(article.url)}`;

  const target = channelId() || fallbackChatId;
  if (!target) throw new Error("Задай TELEGRAM_CHANNEL_ID или пиши из канала, где бот админ");

  await sendMessage(target, text);
  return { article, target: String(target) };
}
