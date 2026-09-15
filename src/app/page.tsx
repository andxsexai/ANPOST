import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { NICHES } from "@/lib/niches";
import { SOURCES } from "@/lib/sources";

const STEPS = [
  { n: "01", title: "Сбор", text: "Десять открытых RSS — США, Корея, Япония, Китай, Россия." },
  { n: "02", title: "Сверка", text: "Кластеры, слепые зоны, госнарратив против независимой рамки." },
  { n: "03", title: "Разбор", text: "Ссылка на YouTube / TikTok / VK / Instagram → сценарий и аналог." },
  { n: "04", title: "Посадка", text: "Три нативных текста. Без мифа про кросс-постинг." },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="relative z-10">
        <section className="mx-auto grid max-w-7xl gap-16 px-6 pb-8 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pt-24">
          <div>
            <p className="font-mono text-[10px] tracking-[0.42em] text-fuchsia-300/90">
              AUTOMATED OSINT SERVICE
            </p>
            <h1 className="mt-6 font-display text-5xl font-light leading-[0.95] tracking-tight text-white md:text-7xl lg:text-[5.6rem]">
              Мир говорит.
              <br />
              Мы снимаем
              <br />
              <span className="text-fuchsia-300">карту сигнала.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/55">
              ANPOST — контур безопасности смысла. Открытые источники, больные точки сюжета,
              автоматическая студия постинга. Сервис, который не знает границ, потому что читает
              публичные ленты целиком.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/feed"
                className="rounded-full bg-fuchsia-400 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-black shadow-[0_0_32px_rgba(232,121,249,0.45)]"
              >
                Открыть ленту
              </Link>
              <Link
                href="/analyze"
                className="rounded-full border border-white/20 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/80"
              >
                Ссылка на ролик
              </Link>
            </div>
          </div>
          <div className="relative border border-white/10 p-6 md:p-8">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <p className="font-mono text-[10px] tracking-[0.28em] text-white/35">LIVE CONTOUR</p>
            <p className="mt-6 font-display text-6xl font-light text-white">10</p>
            <p className="mt-1 text-sm text-white/50">открытых источников</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {SOURCES.map((source) => (
                <div
                  key={source.id}
                  className="border border-white/10 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/55"
                >
                  <span className="text-fuchsia-300">{source.region}</span>
                  <span className="mt-1 block text-white">{source.short}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden border-y border-white/10 py-4">
          <div className="animate-ticker flex gap-12 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.28em] text-white/35">
            {[...SOURCES, ...SOURCES].map((source, index) => (
              <span key={`${source.id}-${index}`}>
                {source.country} · {source.name} · {source.affiliation}
              </span>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24">
          <p className="font-mono text-[10px] tracking-[0.32em] text-fuchsia-300">PROTOCOL</p>
          <div className="mt-10 grid gap-px bg-white/10 md:grid-cols-4">
            {STEPS.map((step) => (
              <article key={step.n} className="bg-[#07040f] p-6 md:p-8">
                <p className="font-mono text-[10px] text-fuchsia-300">{step.n}</p>
                <h2 className="mt-6 font-display text-3xl font-light text-white">{step.title}</h2>
                <p className="mt-4 text-sm leading-6 text-white/50">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] tracking-[0.32em] text-fuchsia-300">HUMAN NEEDS</p>
              <h2 className="mt-3 font-display text-4xl font-light text-white md:text-5xl">
                Шесть ниш, которые
                <br />
                держат человека.
              </h2>
            </div>
            <Link href="/niches" className="hidden font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 md:block">
              все ниши →
            </Link>
          </div>
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {NICHES.map((niche, index) => (
              <Link
                key={niche.id}
                href={`/niches/${niche.id}`}
                className="group flex flex-col gap-3 py-8 md:flex-row md:items-baseline md:justify-between"
              >
                <span className="font-mono text-[10px] text-white/30">0{index + 1}</span>
                <span className="font-display text-4xl font-light text-white group-hover:text-fuchsia-200 md:text-5xl">
                  {niche.title}
                </span>
                <span className="max-w-md text-sm leading-6 text-white/45">{niche.need}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-28">
          <div className="grid gap-12 border border-white/10 p-8 md:grid-cols-2 md:p-14">
            <div>
              <p className="font-mono text-[10px] tracking-[0.32em] text-cyan-300">PAIN RADAR</p>
              <h2 className="mt-4 font-display text-4xl font-light text-white">
                Безопасность — это видеть дыры проекта до того, как они станут новостью.
              </h2>
            </div>
            <ul className="space-y-5 text-sm leading-6 text-white/55">
              <li>— CLI без интерфейса. Человек не видит контур.</li>
              <li>— Два источника вместо мира. Слепая зона континентов.</li>
              <li>— Instagram не зеркалит Facebook и Threads.</li>
              <li>— Ролик без расшифровки выдают за «полный разбор».</li>
              <li>— Секреты в .env, токены живут 60 дней, ComfyUI только дома.</li>
            </ul>
            <Link
              href="/osint"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-fuchsia-300"
            >
              полный бриф OSINT →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
