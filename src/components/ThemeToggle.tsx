"use client";

import { useState, useEffect, useCallback } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("json-viewer-theme", next ? "dark" : "light");
    } catch {}
  }, [isDark]);

  return { isDark, toggle };
}

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2 h-full transition-colors"
      style={{ color: "var(--text-secondary)" }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="text-[14px] leading-none">
        {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
      </span>
      <span className="text-[11px] hidden sm:inline">
        {isDark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
