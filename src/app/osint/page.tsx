import Link from "next/link";
import { PageShell } from "@/components/site-chrome";
import { buildOsintBrief } from "@/lib/osint";
import { getCachedFeed } from "@/lib/feed-cache";
import { SOURCES } from "@/lib/sources";

export const revalidate = 900;

export default async function OsintPage() {
  const feed = await getCachedFeed();
  const brief = buildOsintBrief(feed);

  return (
    <PageShell
      eyebrow="INNER SURFACE"
      title="Понимание проекта изнутри."
      kicker="OSINT здесь — не шпионаж. Это дисциплина открытых источников: кто говорит, кто молчит, где дыра покрытия и какие боли исходного софта мы закрыли."
    >
      <div className="grid gap-6 md:grid-cols-4">
        {[
          ["LIVE", `${brief.liveSources}/10`],
          ["DARK", String(brief.darkSources)],
          ["COVERAGE", brief.coverage],
          ["VELOCITY", brief.velocity],
        ].map(([label, value]) => (
          <div key={label} className="border border-white/10 p-5">
            <p className="font-mono text-[10px] tracking-[0.22em] text-fuchsia-300">{label}</p>
            <p className="mt-3 font-display text-2xl font-light text-white">{value}</p>
          </div>
        ))}
      </div>

      <section className="mt-16 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-light text-white">Больные точки</h2>
          <ul className="mt-6 space-y-6">
            {brief.pains.map((pain) => (
              <li key={pain.title} className="border-l border-fuchsia-400/40 pl-5">
                <p className="text-white">{pain.title}</p>
                <p className="mt-2 text-sm leading-6 text-white/50">{pain.detail}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-display text-3xl font-light text-white">Слепые зоны</h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-white/55">
            {brief.topGaps.map((gap) => (
              <li key={gap}>— {gap}</li>
            ))}
          </ul>
          {brief.contradictions.length ? (
            <>
              <h3 className="mt-12 font-mono text-[10px] tracking-[0.22em] text-cyan-300">
                NARRATIVE TENSION
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-white/55">
                {brief.contradictions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-display text-3xl font-light text-white">
          Что было больно в daily-social-autopost
        </h2>
        <div className="mt-8 grid gap-px bg-white/10 md:grid-cols-3">
          {[
            ["Нет UI", "Python CLI. Чтобы увидеть мир, нужно открыть терминал."],
            ["Два входа", "GitHub Search + Hacker News. Азия и русская лента отсутствуют."],
            ["ComfyUI localhost", "Картинка живёт только на домашней машине."],
            ["ImgBB SPOF", "Публичный URL картинки — чужой бесплатный хостинг."],
            ["Meta tokens", "PAGE_TOKEN и THREADS_TOKEN истекают. Пайплайн падает тихо."],
            ["Нет видео", "Клип нельзя разобрать. Trendsee-контур отсутствовал полностью."],
          ].map(([title, text]) => (
            <article key={title} className="bg-[#07040f] p-6">
              <p className="text-fuchsia-200">{title}</p>
              <p className="mt-3 text-sm leading-6 text-white/50">{text}</p>
            </article>
          ))}
        </div>
        <p className="mt-10 max-w-3xl text-sm leading-7 text-white/45">
          ANPOST оставляет публикацию в официальные Graph API на совести оператора (токены ваши),
          а интеллект — на открытых источниках. Так сервис остаётся автоматизированным и не
          переходит границу чужого аккаунта. Подробный разбор исходного репозитория — в README.
        </p>
        <Link
          href="/sources"
          className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-fuchsia-300"
        >
          карта 10 источников →
        </Link>
        <p className="mt-6 font-mono text-[10px] text-white/25">
          {SOURCES.map((source) => source.short).join(" · ")}
        </p>
      </section>
    </PageShell>
  );
}
