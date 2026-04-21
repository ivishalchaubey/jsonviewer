"use client";

import { useCallback, useEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/ui/icons";

const THEME_STORAGE_KEY = "json-viewer-theme";

function getInitialIsDark() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

function getSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function useTheme() {
  // Lazy initializer reads the class that the inline script in layout.tsx
  // already set before hydration — no effect needed and no flash.
  const [isDark, setIsDark] = useState(getInitialIsDark);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (getSavedTheme()) return;
      setIsDark(event.matches);
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => media.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    applyTheme(next);
    setIsDark(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
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
      className="toolbar-btn flex items-center gap-1.5 h-7 px-2 rounded-md transition-colors"
      style={{ color: "var(--text-secondary)" }}
      aria-pressed={isDark}
      aria-label="Toggle theme"
      suppressHydrationWarning
      title="Toggle theme"
    >
      <span className="theme-toggle-icon shrink-0" aria-hidden>
        <span className="theme-toggle-sun">
          <IconSun />
        </span>
        <span className="theme-toggle-moon">
          <IconMoon />
        </span>
      </span>
      <span className="text-[11px] hidden sm:inline">Theme</span>
    </button>
  );
}
