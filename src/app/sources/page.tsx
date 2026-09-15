import { PageShell } from "@/components/site-chrome";
import { RELATION_FORUMS } from "@/lib/forums";
import { SOURCES } from "@/lib/sources";

export default function SourcesPage() {
  return (
    <PageShell
      eyebrow="OPEN SOURCE MAP"
      title="Десять новостей. Десять женских форумов."
      kicker="США, Корея, Япония, Китай, Россия — плюс живые женские площадки про пару, семью и доверие. Только публичные ленты."
    >
      <h2 className="font-display text-3xl font-light text-white">Новости</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {SOURCES.map((source, index) => (
          <article key={source.id} className="border border-white/10 p-6">
            <p className="font-mono text-[10px] tracking-[0.22em] text-fuchsia-300">
              0{index + 1} · {source.region} · {source.affiliation}
            </p>
            <h3 className="mt-3 font-display text-3xl font-light text-white">{source.name}</h3>
            <p className="mt-2 text-sm text-white/45">
              {source.country} · {source.language}
            </p>
            <p className="mt-4 text-sm leading-6 text-white/60">{source.biasNote}</p>
            <a
              href={source.site}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-white/35"
            >
              {source.site.replace("https://", "")}
            </a>
          </article>
        ))}
      </div>
      <h2 className="mt-20 font-display text-3xl font-light text-white">Отношения · женские форумы</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {RELATION_FORUMS.map((source, index) => (
          <article key={source.id} className="border border-fuchsia-400/20 p-6">
            <p className="font-mono text-[10px] tracking-[0.22em] text-fuchsia-300">
              F{String(index + 1).padStart(2, "0")} · {source.country}
            </p>
            <h3 className="mt-3 font-display text-3xl font-light text-white">{source.name}</h3>
            <p className="mt-4 text-sm leading-6 text-white/60">{source.biasNote}</p>
            <a
              href={source.site}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-white/35"
            >
              {source.site.replace("https://", "")}
            </a>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
