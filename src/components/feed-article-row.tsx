"use client";

import Link from "next/link";
import { useState } from "react";
import { NICHES } from "@/lib/niches";
import type { Article } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

type ExpandPayload = {
  body: string;
  rewritten: string;
  telegramPost: string;
  threadsPost: string;
  error?: string;
};

export function FeedArticleRow({ article }: { article: Article }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ExpandPayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !detail && !loading) {
      setLoading(true);
      try {
        const response = await fetch(`/api/feed/expand?url=${encodeURIComponent(article.url)}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ExpandPayload;
        if (!response.ok) {
          setDetail({
            body: "",
            rewritten: "",
            telegramPost: "",
            threadsPost: "",
            error: payload.error || "не загрузилось",
          });
        } else {
          setDetail(payload);
        }
      } catch {
        setDetail({ body: "", rewritten: "", telegramPost: "", threadsPost: "", error: "не загрузилось" });
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li className="py-6">
      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
        <span className="text-fuchsia-300">{article.region}</span>
        <span>{article.sourceName}</span>
        <span>{relativeTime(article.publishedAt)}</span>
        <span>heat {article.heat}</span>
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        className="btn-tap mt-2 block w-full text-left"
      >
        <span className="font-display text-2xl font-light leading-tight text-white underline decoration-fuchsia-400/40 decoration-2 underline-offset-4">
          {article.title}
        </span>
        <span className="mt-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-300/90">
          {open ? "Свернуть ▲" : "Развернуть на ANPOST ▼"}
        </span>
      </button>
      {article.summary && !open ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50 line-clamp-2">{article.summary}</p>
      ) : null}
      {open ? (
        <div className="mt-4 space-y-4 rounded-2xl border border-fuchsia-400/25 bg-black/35 p-4 md:p-5">
          {loading ? (
            <p className="text-sm text-white/50">Собираю текст новости…</p>
          ) : detail?.error ? (
            <p className="text-sm text-rose-300">{detail.error}</p>
          ) : (
            <>
              <p className="text-sm leading-7 text-white/75 whitespace-pre-wrap">
                {detail?.body || article.summary || "Текст не пришёл — открой источник."}
              </p>
              {detail?.rewritten ? (
                <div className="border-t border-white/10 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-300">
                    Черновик ANPOST
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/70 whitespace-pre-wrap">{detail.rewritten}</p>
                </div>
              ) : null}
            </>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="btn-chip"
            >
              Источник
            </a>
            <Link
              href={`/analyze?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title)}&niche=${article.niche}`}
              className="btn-chip btn-chip-primary"
            >
              Озвучка / разбор
            </Link>
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em]">
        <Link href={`/niches/${article.niche}`} className="btn-chip">
          {NICHES.find((item) => item.id === article.niche)?.title}
        </Link>
        <Link
          href={`/studio?title=${encodeURIComponent(article.title)}&summary=${encodeURIComponent(article.summary)}&url=${encodeURIComponent(article.url)}&source=${encodeURIComponent(article.sourceName)}&niche=${article.niche}`}
          className="btn-chip"
        >
          В студию
        </Link>
      </div>
    </li>
  );
}
