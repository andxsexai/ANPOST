export function LiquidMetalBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="metal-dark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#120814" />
            <stop offset="45%" stopColor="#2a0f3d" />
            <stop offset="100%" stopColor="#050308" />
          </linearGradient>
          <linearGradient id="metal-violet" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4c1d95" />
            <stop offset="50%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
          <linearGradient id="metal-chrome" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8f5ff" />
            <stop offset="35%" stopColor="#a78bfa" />
            <stop offset="70%" stopColor="#3b0764" />
            <stop offset="100%" stopColor="#09040f" />
          </linearGradient>
          <filter id="goo-metal" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
        <rect width="1200" height="800" fill="url(#metal-dark)" />
        <g filter="url(#goo-metal)" className="metal-braid">
          <path
            className="metal-flow-a"
            d="M-80 120 C 180 40, 260 260, 520 180 S 860 60, 1280 220"
            fill="none"
            stroke="url(#metal-violet)"
            strokeWidth="78"
            strokeLinecap="round"
          />
          <path
            className="metal-flow-b"
            d="M-40 420 C 220 520, 380 240, 640 360 S 980 560, 1280 390"
            fill="none"
            stroke="url(#metal-chrome)"
            strokeWidth="64"
            strokeLinecap="round"
          />
          <path
            className="metal-flow-c"
            d="M-60 680 C 260 560, 420 760, 720 620 S 1020 700, 1300 560"
            fill="none"
            stroke="url(#metal-violet)"
            strokeWidth="90"
            strokeLinecap="round"
          />
          <ellipse className="metal-drop" cx="260" cy="240" rx="90" ry="70" fill="#f4f1ff" opacity="0.55" />
          <ellipse className="metal-drop-2" cx="880" cy="470" rx="120" ry="88" fill="#c026d3" opacity="0.45" />
        </g>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,2,10,0.35)_55%,rgba(2,0,6,0.92)_100%)]" />
    </div>
  );
}

export function LiquidLoader({ label = "Выгружаю сигнал…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-10">
      <svg width="180" height="120" viewBox="0 0 180 120">
        <defs>
          <filter id="loader-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            />
          </filter>
          <linearGradient id="drop-white" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c4b5fd" />
          </linearGradient>
          <linearGradient id="drop-violet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="100%" stopColor="#6b21a8" />
          </linearGradient>
        </defs>
        <g filter="url(#loader-goo)">
          <circle className="liquid-drop-white" cx="70" cy="60" r="28" fill="url(#drop-white)" />
          <circle className="liquid-drop-violet" cx="110" cy="60" r="28" fill="url(#drop-violet)" />
        </g>
      </svg>
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-fuchsia-200">{label}</p>
    </div>
  );
}
