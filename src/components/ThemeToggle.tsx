"use client";

import { useState, useCallback } from "react";

export function useTheme() {
  // Lazy initializer reads the class that the inline script in layout.tsx
  // already set before hydration — no effect needed and no flash.
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("json-viewer-theme", next ? "dark" : "light");
      } catch {}
      return next;
    });
  }, []);

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
