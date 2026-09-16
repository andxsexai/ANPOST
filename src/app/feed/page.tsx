import { FeedBoard } from "@/components/feed-board";
import { PageShell } from "@/components/site-chrome";
import { getCachedFeed } from "@/lib/feed-cache";

export const revalidate = 900;

export default async function FeedPage() {
  const feed = await getCachedFeed();
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
