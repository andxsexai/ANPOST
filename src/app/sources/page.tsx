import { PageShell } from "@/components/site-chrome";
import { SOURCES } from "@/lib/sources";

export default function SourcesPage() {
  return (
    <PageShell
      eyebrow="OPEN SOURCE MAP"
      title="Десять входов в мир."
      kicker="Три американских, корейский, японский, китайский, остальные — русские. У каждого — affiliation, чтобы не спутать агентство с независимым изданием."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {SOURCES.map((source, index) => (
          <article key={source.id} className="border border-white/10 p-6">
            <p className="font-mono text-[10px] tracking-[0.22em] text-fuchsia-300">
              0{index + 1} · {source.region} · {source.affiliation}
            </p>
            <h2 className="mt-3 font-display text-3xl font-light text-white">{source.name}</h2>
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
    </PageShell>
  );
}
