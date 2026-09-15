import { FeedBoard } from "@/components/feed-board";
import { PageShell } from "@/components/site-chrome";
import { loadFeed } from "@/lib/rss";

export const dynamic = "force-dynamic";
export const revalidate = 180;

export default async function FeedPage() {
  const feed = await loadFeed();
  const live = feed.sources.filter((source) => source.ok).length;

  return (
    <PageShell
      eyebrow={`CONTOUR · ${live}/10 LIVE · ${feed.articles.length} SIGNALS`}
      title="Лента открытых источников."
      kicker={`Контур дня ${feed.day}. Лента живая: источники перечитываются сегодня и по кнопке «обновить».`}
    >
      <FeedBoard initial={feed} />
    </PageShell>
  );
}
