"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { LiquidLoader } from "@/components/liquid-metal";

type Post = {
  id: string;
  chat: string;
  text: string;
  rewritten: string;
  at: string;
};

export function TelegramDesk() {
  const [bot, setBot] = useState("@andxshop_bot");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [rewritten, setRewritten] = useState("");
  const [secret, setSecret] = useState("");

  function headers(json?: boolean) {
    const next: Record<string, string> = {};
    if (json) next["Content-Type"] = "application/json";
    if (secret.trim()) next["x-anpost-secret"] = secret.trim();
    return next;
  }

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/telegram/sync", { headers: headers() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setBot(payload.bot);
      setPosts(payload.posts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "бот недоступен");
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/telegram/sync", {
        method: "POST",
        headers: headers(),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setPosts(payload.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function rewriteLocal(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft }),
    });
    const payload = await response.json();
    setRewritten(payload.telegramPost || payload.rewritten);
  }

  useEffect(() => {
    const stored = sessionStorage.getItem("anpost-operator") || "";
    if (stored) setSecret(stored);
  }, []);

  useEffect(() => {
    if (secret) sessionStorage.setItem("anpost-operator", secret);
    void load();
  }, [secret]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="border border-white/10 bg-black/30 p-6">
        <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">CONNECT</p>
        <h2 className="mt-3 font-display text-3xl font-light text-white">{bot}</h2>
        <label className="mt-5 block font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
          Ключ оператора
        </label>
        <input
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          placeholder="ANPOST_OPERATOR_SECRET"
          className="mt-2 w-full border-b border-white/20 bg-transparent py-2 text-sm text-white outline-none"
        />
        <ol className="mt-5 space-y-3 text-sm leading-6 text-white/60">
          <li>1. Открой бота и нажми Start.</li>
          <li>2. Добавь бота админом в свой канал/страницу.</li>
          <li>3. Перешли любой пост боту — он вернёт тот же смысл, только легче.</li>
          <li>4. Ключ оператора нужен, чтобы чужие не читали ленту бота.</li>
        </ol>
        <button
          type="button"
          onClick={() => void sync()}
          className="mt-6 rounded-full bg-fuchsia-400 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black"
        >
          Снять посты из Telegram
        </button>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        {loading || syncing ? <LiquidLoader label="Металл тянется к Telegram…" /> : null}
        <ul className="mt-8 space-y-5">
          {posts.map((post) => (
            <li key={post.id} className="border border-white/10 p-4">
              <p className="font-mono text-[10px] text-white/35">
                {post.chat} · {new Date(post.at).toLocaleString("ru-RU")}
              </p>
              <p className="mt-2 text-sm text-white/55">{post.text.slice(0, 240)}</p>
              <div className="mt-3 flex gap-2">
                <CopyButton text={post.text} label="Исходник" />
                <CopyButton text={post.rewritten} label="Переработка" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-white/10 bg-black/30 p-6">
        <p className="font-mono text-[10px] tracking-[0.24em] text-fuchsia-300">REWORK</p>
        <form onSubmit={rewriteLocal} className="mt-4">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={10}
            placeholder="Вставь текст из Telegram"
            className="w-full border border-white/10 bg-transparent p-4 text-sm text-white outline-none"
          />
          <button className="mt-4 rounded-full bg-white px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-black">
            Переработать
          </button>
        </form>
        {rewritten ? (
          <div className="mt-6">
            <CopyButton text={rewritten} />
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/75">{rewritten}</pre>
          </div>
        ) : null}
      </section>
    </div>
  );
}
