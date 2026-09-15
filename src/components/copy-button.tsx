export function CopyButton({ text, label = "Копировать" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      className="rounded-full border border-white/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-200 transition hover:border-fuchsia-300"
      onClick={async () => {
        await navigator.clipboard.writeText(text || "");
        const node = document.activeElement as HTMLButtonElement | null;
        if (node) {
          const prev = node.textContent;
          node.textContent = "Скопировано";
          setTimeout(() => {
            node.textContent = prev;
          }, 1200);
        }
      }}
    >
      {label}
    </button>
  );
}
