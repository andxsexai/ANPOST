import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/feed", label: "Лента" },
  { href: "/niches", label: "Ниши" },
  { href: "/analyze", label: "Анализ" },
  { href: "/studio", label: "Студия" },
  { href: "/telegram", label: "Telegram" },
  { href: "/osint", label: "OSINT" },
  { href: "/sources", label: "Источники" },
];

export function SiteHeader({ dim }: { dim?: boolean }) {
  return (
    <header className={cn("relative z-30 border-b border-white/10", dim && "bg-black/40 backdrop-blur-md")}>
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-6 py-5">
        <Link href="/" className="group">
          <p className="font-mono text-[10px] tracking-[0.38em] text-violet-300/80">
            OSINT · NO BORDERS
          </p>
          <p className="font-display text-3xl font-light tracking-[0.18em] text-white">
            AN<span className="text-fuchsia-400">POST</span>
          </p>
        </Link>
        <nav className="hidden flex-wrap items-center justify-end gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-white/55 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-fuchsia-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/analyze"
          className="hidden rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fuchsia-200 shadow-[0_0_24px_rgba(232,121,249,0.25)] md:inline-flex"
        >
          Разбор ссылки
        </Link>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-white/5 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white/50 md:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="whitespace-nowrap">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-[11px] uppercase tracking-[0.18em] text-white/35 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-2xl tracking-[0.2em] text-white/80">ANPOST</p>
          <p className="mt-2 max-w-md normal-case tracking-normal text-white/45">
            Открытые источники. Понимание изнутри. Автоматизация без границ.
          </p>
        </div>
        <p>MIT · 2026 · Public RSS · Public oEmbed</p>
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  eyebrow,
  title,
  kicker,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  kicker?: string;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader dim />
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-6 py-12">
        <p className="font-mono text-[10px] tracking-[0.32em] text-fuchsia-300/80">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-light leading-[1.05] tracking-tight text-white md:text-6xl">
          {title}
        </h1>
        {kicker ? (
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">{kicker}</p>
        ) : null}
        <div className="mt-12">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
