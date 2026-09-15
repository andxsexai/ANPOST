import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-[10px] tracking-[0.32em] text-fuchsia-300">404</p>
      <h1 className="mt-4 font-display text-4xl font-light text-white">Сигнал не найден.</h1>
      <Link href="/" className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
        на базу →
      </Link>
    </div>
  );
}
