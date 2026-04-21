"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "json-viewer-font-size";
export const DEFAULT_JSON_FONT_SIZE = 13;
export const MIN_JSON_FONT_SIZE = 10;
export const MAX_JSON_FONT_SIZE = 20;

function clamp(size: number) {
  return Math.max(MIN_JSON_FONT_SIZE, Math.min(MAX_JSON_FONT_SIZE, size));
}

export function useJsonFontSize() {
  const [fontSize, setFontSize] = useState(DEFAULT_JSON_FONT_SIZE);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = Number(window.localStorage.getItem(STORAGE_KEY));
        if (Number.isFinite(saved)) setFontSize(clamp(saved));
      } catch {}
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const updateFontSize = useCallback((next: number) => {
    const clamped = clamp(next);
    setFontSize(clamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    } catch {}
  }, []);

  return {
    fontSize,
    canDecrease: fontSize > MIN_JSON_FONT_SIZE,
    canIncrease: fontSize < MAX_JSON_FONT_SIZE,
    decrease: () => updateFontSize(fontSize - 1),
    increase: () => updateFontSize(fontSize + 1),
    reset: () => updateFontSize(DEFAULT_JSON_FONT_SIZE),
  };
}
