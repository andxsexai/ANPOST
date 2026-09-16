"use client";

import { useEffect, useState } from "react";

export function InstallOnPhone() {
  const [standalone, setStandalone] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const iosStandalone =
      "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setStandalone(media.matches || iosStandalone);
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  if (standalone) return null;

  return (
    <aside className="mx-6 mb-8 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-950/30 px-5 py-4 text-sm leading-6 text-white/75 md:mx-auto md:max-w-3xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fuchsia-200">На телефоне</p>
      <p className="mt-2">
        Добавь ANPOST на экран — откроется как приложение без адресной строки.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-1 text-white/60">
        {ios ? (
          <>
            <li>Safari → «Поделиться» → «На экран Домой»</li>
            <li>Иконка «A» появится рядом с другими приложениями</li>
          </>
        ) : (
          <>
            <li>Chrome → меню ⋮ → «Установить приложение» или «Добавить на главный экран»</li>
          </>
        )}
      </ul>
    </aside>
  );
}
