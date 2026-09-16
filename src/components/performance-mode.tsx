"use client";

import { useEffect } from "react";

export function PerformanceMode() {
  useEffect(() => {
    const root = document.documentElement;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || narrow || reduce) {
      root.dataset.motion = "lite";
    }
    return () => {
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
