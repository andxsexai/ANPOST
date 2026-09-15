"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { LiquidLoader } from "@/components/liquid-metal";
import { NICHES } from "@/lib/niches";
import type { NicheId, VideoAnalysis } from "@/lib/types";
import { formatTime, wordCount } from "@/lib/utils";

export function AnalyzeForm() {
  return (
    <Suspense fallback={<LiquidLoader label="Открываю контур…" />}>
      <AnalyzeFormInner />
    </Suspense>
  );
}

function AnalyzeFormInner() {
  const params = useSearchParams();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [niche, setNiche] = useState<NicheId>("news");
  const [loading, setLoading] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VideoAnalysis | null>(null);

  useEffect(() => {
    const nextUrl = params.get("url") || "";
    const nextTitle = params.get("title") || "";
    const nextSummary = params.get("summary") || "";
    const nextNiche = params.get("niche") as NicheId | null;
    if (nextUrl) setUrl(nextUrl);
    if (nextTitle || nextSummary) {
      setText([nextTitle, nextSummary].filter(Boolean).join("\n\n"));
    }
    if (nextNiche) setNiche(nextNiche);
  }, [params]);

  async function extract(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text, niche }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Не удалось забрать текст");
      setData(payload as VideoAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function rework() {
    if (!data) return;
    setRewriting(true);
    try {
      const response = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          transcript: data.transcriptText || data.voiceover,
          text: data.transcriptText || data.voiceover,
        }),
      });
      const payload = await response.json();
      setData({
        ...data,
        rewritten: payload.rewritten,
        telegramPost: payload.telegramPost,
        threadsPost: payload.threadsPost,
        telegramWords: payload.telegramWords,
        threadsWords: payload.threadsWords,
        packed: payload.packed || data.packed,
      });
    } finally {
      setRewriting(false);
    }
  }

  const fullText = data ? data.transcriptText || data.voiceover || data.description : "";

  return (
    <div>
      <form onSubmit={extract} className="border border-white/10 bg-black/30 p-6 backdrop-blur-sm md:p-8">
        <label className="font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-300">
          Ссылка с ленты / YouTube / TikTok / VK / Instagram / Telegram / статья
        </label>
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Вставь ссылку источника"
          className="mt-3 w-full border-b border-white/20 bg-transparent py-4 font-display text-2xl font-light text-white outline-none placeholder:text-white/20"
        />
        <label className="mt-8 block font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-300">
          Дополнительный текст, если есть
        </label>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          placeholder="Не обязательно. Если ссылка не отдаст тело — оставь заголовок и лид сюда."
          className="mt-3 w-full border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none"
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
          disabled={loading || (!url.trim() && !text.trim())}
          className="mt-8 rounded-full bg-fuchsia-400 px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-black shadow-[0_0_30px_rgba(232,121,249,0.45)] disabled:opacity-50"
        >
          1. Забрать текст и переписать
        </button>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        {loading ? <LiquidLoader label="Забираю текст целиком…" /> : null}
      </form>

      {data && !loading ? (
        <div className="mt-12 space-y-6">
          <div className="flex flex-wrap gap-3">
            <CopyButton text={data.title} label="Заголовок" />
            <CopyButton text={data.description || data.about} label="Описание" />
            <CopyButton text={fullText} label="Полный текст" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Заголовок" text={data.title} />
            <Card title="Описание" text={data.description || data.about} />
            <Card title={`Озвучка · ${wordCount(fullText)} слов`} text={fullText} tall />
          </div>

          {data.transcript.length ? (
            <section>
              <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">
                ОЗВУЧКА ПО ТАЙМКОДАМ · {data.transcript.length} кусков
              </p>
              <p className="mt-2 font-mono text-[10px] text-white/35">{data.method.join(" · ")}</p>
              <div className="mt-4 max-h-[360px] overflow-auto border border-white/10 p-4 text-sm leading-6 text-white/65">
                {data.transcript.map((cue, index) => (
                  <p key={`${cue.start}-${index}`}>
                    <span className="mr-3 font-mono text-[10px] text-fuchsia-300/70">
                      {formatTime(cue.start)}
                    </span>
                    {cue.text}
                  </p>
                ))}
              </div>
            </section>
          ) : (
            <p className="text-sm text-white/40">Озвучка не пришла. Проверь ссылку или вставь текст вручную.</p>
          )}

          <section className="border border-fuchsia-400/30 bg-fuchsia-500/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">
                2. КОМАНДА НА ПЕРЕРАБОТКУ
              </p>
              <button
                type="button"
                onClick={rework}
                disabled={rewriting || !fullText}
                className="rounded-full bg-white px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-black disabled:opacity-50"
              >
                {rewriting ? "Собираю посты…" : "Переработать → Telegram 1500 / Threads 500"}
              </button>
            </div>
            <p className="mt-3 text-sm text-white/45">
              Ссылка отдаёт озвучку и сразу черновик постов. Кнопка ниже пересобирает текст ещё раз.
            </p>
            {rewriting ? <LiquidLoader label="Белая и фиолетовая капли пишут лёгкий смысл…" /> : null}
          </section>

          {data.telegramPost ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="border border-white/10 bg-black/35 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">
                    Telegram · {data.telegramWords}/1500 слов
                  </p>
                  <CopyButton text={data.telegramPost} />
                </div>
                <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">
                  {data.telegramPost}
                </pre>
              </article>
              <article className="border border-white/10 bg-black/35 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">
                    Threads · {data.threadsWords}/500 слов
                  </p>
                  <CopyButton text={data.threadsPost} />
                </div>
                <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">
                  {data.threadsPost}
                </pre>
              </article>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, text, tall }: { title: string; text: string; tall?: boolean }) {
  return (
    <article className="border border-white/10 bg-black/35 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">{title}</p>
        <CopyButton text={text} />
      </div>
      <p
        className={`mt-4 whitespace-pre-wrap text-sm leading-6 text-white/75 ${tall ? "max-h-[420px] overflow-auto" : ""}`}
      >
        {text || "—"}
      </p>
    </article>
  );
}
