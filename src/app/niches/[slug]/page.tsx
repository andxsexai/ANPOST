import { notFound } from "next/navigation";
import { FeedBoard } from "@/components/feed-board";
import { PageShell } from "@/components/site-chrome";
import { RELATION_FORUMS } from "@/lib/forums";
import { NICHE_BY_ID } from "@/lib/niches";
import { getCachedFeed } from "@/lib/feed-cache";
import type { NicheId } from "@/lib/types";

export const revalidate = 900;

export default async function NichePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const niche = NICHE_BY_ID[slug as NicheId];
  if (!niche) notFound();
  const feed = await getCachedFeed(niche.id);

  return (
    <PageShell
      eyebrow={`NICHE · ${niche.id.toUpperCase()}`}
      title={niche.title}
      kicker={`${niche.need}. ${niche.promise}`}
    >
      {niche.id === "relations" ? (
        <section className="mb-12 grid gap-4 md:grid-cols-2">
          {RELATION_FORUMS.map((forum, index) => (
            <article key={forum.id} className="border border-white/10 p-5">
              <p className="font-mono text-[10px] tracking-[0.2em] text-fuchsia-300">
                {String(index + 1).padStart(2, "0")} · {forum.country}
              </p>
              <h2 className="mt-2 font-display text-2xl font-light text-white">{forum.name}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">{forum.biasNote}</p>
              <a
                href={forum.site}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.16em] text-white/35"
              >
                {forum.site.replace("https://", "")}
              </a>
            </article>
          ))}
        </section>
      ) : null}
      <FeedBoard initial={feed} />
    </PageShell>
  );
}
