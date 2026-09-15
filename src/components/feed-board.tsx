"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NICHES } from "@/lib/niches";
import { SOURCES } from "@/lib/sources";
import type { FeedResponse } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

const REGIONS = ["all", "US", "KR", "JP", "CN", "RU"] as const;

export function FeedBoard({ initial }: { initial: FeedResponse }) {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("all");
  const [niche, setNiche] = useState("all");
  const [query, setQuery] = useState("");

  const articles = useMemo(() => {
    return initial.articles.filter((article) => {
      if (region !== "all" && article.region !== region) return false;
      if (niche !== "all" && article.niche !== niche) return false;
      if (query) {
        const hay = `${article.title} ${article.summary}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [initial.articles, region, niche, query]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRegion(item)}
              className={`rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                region === item
                  ? "border-fuchsia-400 text-fuchsia-100 shadow-[0_0_18px_rgba(232,121,249,0.25)]"
                  : "border-white/15 text-white/45"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setNiche("all")}
            className={`rounded-full px-3 py-1 text-xs ${niche === "all" ? "bg-white text-black" : "text-white/50"}`}
          >
            все ниши
          </button>
          {NICHES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNiche(item.id)}
              className={`rounded-full px-3 py-1 text-xs ${
                niche === item.id ? "bg-white text-black" : "text-white/50"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по открытому контуру…"
          className="mt-6 w-full border-b border-white/20 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/25"
        />
        <ul className="mt-8 divide-y divide-white/10">
          {articles.map((article) => (
            <li key={article.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
                <span className="text-fuchsia-300">{article.region}</span>
                <span>{article.sourceName}</span>
                <span>{relativeTime(article.publishedAt)}</span>
                <span>heat {article.heat}</span>
                {article.signals.map((signal) => (
                  <span key={signal} className="text-violet-200">
                    {signal}
                  </span>
                ))}
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block font-display text-2xl font-light leading-tight text-white hover:text-fuchsia-200"
              >
                {article.title}
              </a>
              {article.summary ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">{article.summary}</p>
              ) : null}
              <div className="mt-3 flex gap-4 text-[11px] uppercase tracking-[0.16em] text-white/40">
                <Link href={`/niches/${article.niche}`}>
                  {NICHES.find((item) => item.id === article.niche)?.title}
                </Link>
                <Link
                  href={`/studio?title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}&url=${encodeURIComponent(article.url)}&source=${encodeURIComponent(article.sourceName)}&niche=${article.niche}`}
                >
                  в студию →
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {!articles.length ? (
          <p className="mt-10 text-white/40">В этом срезе пусто. Снимите фильтр или обновите контур.</p>
        ) : null}
      </div>
      <aside className="space-y-8">
        <section className="border border-white/10 p-5">
          <p className="font-mono text-[10px] tracking-[0.22em] text-fuchsia-300">SOURCES</p>
          <ul className="mt-4 space-y-3 text-sm">
            {initial.sources.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-3">
                <span className="text-white/70">{source.name}</span>
                <span className={source.ok ? "text-emerald-300" : "text-rose-300"}>
                  {source.ok ? `${source.count}` : "dark"}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-white/10 p-5">
          <p className="font-mono text-[10px] tracking-[0.22em] text-fuchsia-300">CLUSTERS</p>
          <ul className="mt-4 space-y-4">
            {initial.clusters.map((cluster) => (
              <li key={cluster.id}>
                <p className="text-sm leading-5 text-white">{cluster.title}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                  {cluster.count} · {cluster.regions.join(" ")} · {cluster.gap}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-white/10 p-5 text-xs leading-5 text-white/45">
          {SOURCES.length} открытых RSS. Никакого обхода авторизации — только публичный контур.
        </section>
      </aside>
    </div>
  );
}
