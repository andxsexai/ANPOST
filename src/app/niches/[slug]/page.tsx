import { notFound } from "next/navigation";
import { FeedBoard } from "@/components/feed-board";
import { PageShell } from "@/components/site-chrome";
import { NICHE_BY_ID } from "@/lib/niches";
import { loadFeed } from "@/lib/rss";
import type { NicheId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 180;

export default async function NichePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const niche = NICHE_BY_ID[slug as NicheId];
  if (!niche) notFound();
  const feed = await loadFeed(niche.id);

  return (
    <PageShell
      eyebrow={`NICHE · ${niche.id.toUpperCase()}`}
      title={niche.title}
      kicker={`${niche.need}. ${niche.promise}`}
    >
      <FeedBoard initial={feed} />
    </PageShell>
  );
}
