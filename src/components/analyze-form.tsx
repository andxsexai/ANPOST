"use client";

import { useState } from "react";
import { NICHES } from "@/lib/niches";
import type { NicheId, VideoAnalysis } from "@/lib/types";
import { formatTime } from "@/lib/utils";

export function AnalyzeForm() {
  const [url, setUrl] = useState("");
  const [niche, setNiche] = useState<NicheId>("innovation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VideoAnalysis | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, niche }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось разобрать ссылку");
      setData(payload as VideoAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="border border-white/10 p-6 md:p-8">
        <label className="font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-300">
          Публичная ссылка
        </label>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="YouTube · TikTok · VK · Instagram"
          className="mt-3 w-full border-b border-white/20 bg-transparent py-4 font-display text-2xl font-light text-white outline-none placeholder:text-white/20"
          required
        />
        <div className="mt-6 flex flex-wrap gap-2">
          {NICHES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNiche(item.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                niche === item.id
                  ? "border-fuchsia-400 text-fuchsia-100"
                  : "border-white/15 text-white/45"
              }`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-8 rounded-full bg-fuchsia-400 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-black shadow-[0_0_30px_rgba(232,121,249,0.45)] disabled:opacity-50"
        >
          {loading ? "Читаю открытый контур…" : "Выгрузить сценарий"}
        </button>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </form>

      {data ? (
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section>
            <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">SIGNAL</p>
            <h2 className="mt-3 font-display text-3xl font-light text-white">{data.title}</h2>
            <p className="mt-2 text-sm text-white/45">
              {data.platform} · {data.author} · confidence {Math.round(data.confidence * 100)}%
            </p>
            {data.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnail}
                alt=""
                className="mt-6 aspect-video w-full object-cover opacity-90"
              />
            ) : null}
            <p className="mt-6 text-base leading-7 text-white/70">{data.about}</p>
            <ul className="mt-6 space-y-2 font-mono text-[11px] text-white/35">
              {data.method.map((item) => (
                <li key={item}>▸ {item}</li>
              ))}
            </ul>
          </section>
          <section className="space-y-8">
            <div className="border border-white/10 p-5">
              <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">
                ОРИГИНАЛЬНЫЙ СЦЕНАРИЙ
              </p>
              <p className="mt-4 text-lg text-white">{data.originalScript.hook}</p>
              <ol className="mt-4 space-y-2 text-sm text-white/55">
                {data.originalScript.body.map((line, index) => (
                  <li key={index}>
                    {index + 1}. {line}
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-fuchsia-200">{data.originalScript.cta}</p>
            </div>
            <div className="border border-fuchsia-400/30 bg-fuchsia-500/5 p-5">
              <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">
                АНАЛОГ · {data.analogous.niche}
              </p>
              <p className="mt-4 text-lg text-white">{data.analogous.hook}</p>
              <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-6 text-white/70">
                {data.analogous.voiceover}
              </pre>
            </div>
          </section>
          <section>
            <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">
              РАСШИФРОВКА
            </p>
            <div className="mt-4 max-h-[420px] overflow-auto border border-white/10 p-4 text-sm leading-6 text-white/65">
              {data.transcript.length ? (
                data.transcript.map((cue, index) => (
                  <p key={`${cue.start}-${index}`}>
                    <span className="mr-3 font-mono text-[10px] text-fuchsia-300/70">
                      {formatTime(cue.start)}
                    </span>
                    {cue.text}
                  </p>
                ))
              ) : (
                <p>
                  Публичных субтитров нет. Текст собран из открытых метаданных — так честнее, чем
                  притворяться, что мы взломали плеер.
                </p>
              )}
            </div>
          </section>
          <section className="space-y-4">
            <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">
              ПОСАДКА НА ПЛАТФОРМЫ
            </p>
            {Object.entries(data.analogous.captions).map(([platform, text]) => (
              <article key={platform} className="border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                    {platform}
                  </p>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-[0.16em] text-fuchsia-300"
                    onClick={() => navigator.clipboard.writeText(text)}
                  >
                    copy
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">{text}</p>
              </article>
            ))}
            <div>
              <p className="font-mono text-[10px] tracking-[0.24em] text-rose-300">PAIN POINTS</p>
              <ul className="mt-3 space-y-2 text-sm text-white/55">
                {data.painPoints.map((item) => (
                  <li key={item}>— {item}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
