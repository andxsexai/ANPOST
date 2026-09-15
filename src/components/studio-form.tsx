"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NICHES } from "@/lib/niches";
import type { NicheId } from "@/lib/types";

export function StudioForm() {
  const params = useSearchParams();
  const [title, setTitle] = useState(params.get("title") || "");
  const [summary, setSummary] = useState(params.get("summary") || "");
  const [url, setUrl] = useState(params.get("url") || "");
  const [source, setSource] = useState(params.get("source") || "ANPOST");
  const [niche, setNiche] = useState<NicheId>((params.get("niche") as NicheId) || "news");
  const [result, setResult] = useState<{
    instagram: string;
    facebook: string;
    threads: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const ready = useMemo(() => title.trim().length > 3, [title]);

  async function compose(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, summary, url, sourceName: source, niche }),
      });
      const payload = await response.json();
      setResult(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={compose} className="space-y-6">
        <Field label="Заголовок" value={title} onChange={setTitle} />
        <Field label="Суть" value={summary} onChange={setSummary} textarea />
        <Field label="Ссылка" value={url} onChange={setUrl} />
        <Field label="Источник" value={source} onChange={setSource} />
        <div className="flex flex-wrap gap-2">
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
          disabled={!ready || loading}
          className="rounded-full bg-white px-6 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-black disabled:opacity-40"
        >
          {loading ? "Сборка…" : "Собрать 3 платформы"}
        </button>
      </form>
      <div className="space-y-4">
        {result ? (
          Object.entries(result).map(([platform, text]) => (
            <article key={platform} className="border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-300">
                  {platform}
                </p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(text)}
                  className="text-[10px] uppercase tracking-[0.16em] text-white/40"
                >
                  copy
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">{text}</p>
            </article>
          ))
        ) : (
          <p className="text-white/40">
            Формула исходного toolkit: одна мысль — три нативных текста. Instagram, Facebook Page,
            Threads. Без кросс-постинга, потому что его не существует.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="mt-2 w-full border-b border-white/20 bg-transparent py-2 text-white outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 w-full border-b border-white/20 bg-transparent py-2 text-white outline-none"
        />
      )}
    </label>
  );
}
