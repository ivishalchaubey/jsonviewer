"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import { IconInfo } from "@/components/ui/icons";

export type TabId = "viewer" | "text";

interface AppHeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onOpenAbout: () => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "viewer", label: "Viewer" },
  { id: "text", label: "Text" },
];

export function AppHeader({
  activeTab,
  onTabChange,
  isDark,
  onThemeToggle,
  onOpenAbout,
}: AppHeaderProps) {
  return (
    <header
      className="h-11 shrink-0 flex items-center px-4 gap-5 border-b"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span
          className="text-[14px] font-mono"
          style={{ color: "var(--accent)" }}
        >
          {"{ }"}
        </span>
        <h1
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          JSON Viewer
        </h1>
      </div>

      {/* Underline tabs */}
      <nav className="h-full flex items-end gap-5">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="h-full px-0.5 text-[12px] font-medium transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                borderBottom: active
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                paddingBottom: 1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
        <button
          onClick={onOpenAbout}
          className="flex items-center justify-center h-7 w-7 rounded-md transition-colors toolbar-btn"
          style={{ color: "var(--text-secondary)" }}
          title="About this tool"
          aria-label="About"
        >
          <IconInfo />
        </button>
      </div>
    </header>
  );
}
