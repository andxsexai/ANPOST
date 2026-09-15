import Link from "next/link";
import { PageShell } from "@/components/site-chrome";
import { NICHES } from "@/lib/niches";

export default function NichesPage() {
  return (
    <PageShell
      eyebrow="HUMAN OPERATING SYSTEM"
      title="Пять потребностей. Шесть контуров."
      kicker="Деньги, новости, инновации, отношения, здоровье и духовность — карта того, зачем человек вообще открывает телефон."
    >
      <div className="divide-y divide-white/10 border-y border-white/10">
        {NICHES.map((niche, index) => (
          <Link
            key={niche.id}
            href={`/niches/${niche.id}`}
            className="grid gap-4 py-10 md:grid-cols-[80px_1fr_1fr]"
          >
            <span className="font-mono text-xs text-fuchsia-300">0{index + 1}</span>
            <div>
              <h2 className="font-display text-4xl font-light text-white">{niche.title}</h2>
              <p className="mt-2 text-white/50">{niche.need}</p>
            </div>
            <p className="text-sm leading-7 text-white/45">{niche.promise}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
