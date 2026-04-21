"use client";

import { ToolbarButton } from "@/components/ui/ToolbarButton";
import {
  IconArrowDown,
  IconArrowUp,
  IconClose,
  IconCopy,
  IconFormat,
  IconMinify,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@/components/ui/icons";
import type { TabId } from "@/components/layout/AppHeader";

interface ToolbarProps {
  activeTab: TabId;
  onCopy: () => void;
  onFormat: () => void;
  onMinify: () => void;
  onLoad: () => void;
  onClear: () => void;

  // Search
  searchValue: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder: string;
  totalMatches: number;
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
}

export function Toolbar({
  activeTab,
  onCopy,
  onFormat,
  onMinify,
  onLoad,
  onClear,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  totalMatches,
  currentIndex,
  onNext,
  onPrevious,
}: ToolbarProps) {
  const hasQuery = searchValue.trim().length > 0;
  const hasMatches = totalMatches > 0;
  const isTextTab = activeTab === "text";

  return (
    <div
      className="flex items-center h-10 border-b px-2 gap-0.5"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      {/* ── Primary actions (tab-aware) ─────────────────────── */}
      <ToolbarButton
        onClick={onCopy}
        icon={<IconCopy />}
        label="Copy"
        title="Copy JSON to clipboard"
      />
      {isTextTab && (
        <>
          <ToolbarButton
            onClick={onFormat}
            icon={<IconFormat />}
            label="Format"
            title="Pretty-print JSON"
          />
          <ToolbarButton
            onClick={onMinify}
            icon={<IconMinify />}
            label="Minify"
            title="Remove all whitespace"
          />
        </>
      )}
      <Divider />
      <ToolbarButton
        onClick={onLoad}
        icon={<IconUpload />}
        label="Load"
        title="Load file, URL, or sample"
      />
      <ToolbarButton
        onClick={onClear}
        icon={<IconTrash />}
        label="Clear"
        title="Clear editor"
      />

      {/* ── Search (right-aligned) ──────────────────────────── */}
      <div className="ml-auto flex items-center gap-1">
        <div
          className="flex items-center gap-2 h-7 pl-2 pr-1.5 rounded-md w-56 search-field"
          style={{ backgroundColor: "var(--surface-secondary)" }}
        >
          <span
            className="shrink-0"
            style={{ color: "var(--text-tertiary)" }}
            aria-hidden
          >
            <IconSearch />
          </span>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (e.shiftKey) onPrevious();
                else onNext();
              }
            }}
            placeholder={searchPlaceholder}
            aria-label="Search"
            className="flex-1 h-full outline-none text-[12px] bg-transparent min-w-0"
            style={{ color: "var(--text-primary)" }}
          />
          {hasQuery && (
            <>
              <span
                className="text-[10px] tabular-nums shrink-0"
                style={{
                  color: hasMatches
                    ? "var(--text-secondary)"
                    : "var(--text-tertiary)",
                }}
              >
                {hasMatches ? `${currentIndex + 1}/${totalMatches}` : "0/0"}
              </span>
              <button
                onClick={() => onSearchChange("")}
                title="Clear search"
                className="shrink-0 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Clear search"
              >
                <IconClose />
              </button>
            </>
          )}
        </div>

        <button
          onClick={onPrevious}
          disabled={!hasMatches}
          title="Previous match (Shift+Enter)"
          aria-label="Previous match"
          className="toolbar-btn h-7 w-7 rounded-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "var(--text-secondary)" }}
        >
          <IconArrowUp />
        </button>
        <button
          onClick={onNext}
          disabled={!hasMatches}
          title="Next match (Enter)"
          aria-label="Next match"
          className="toolbar-btn h-7 w-7 rounded-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "var(--text-secondary)" }}
        >
          <IconArrowDown />
        </button>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="h-4 w-px mx-1.5 shrink-0"
      style={{ backgroundColor: "var(--border)" }}
    />
  );
}
