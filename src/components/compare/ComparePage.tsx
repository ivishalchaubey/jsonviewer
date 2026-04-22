"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTheme } from "@/components/ThemeToggle";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { AboutModal } from "@/components/modals/AboutModal";
import { ToastStack } from "@/components/ui/Toast";
import { useJsonFontSize } from "@/hooks/useJsonFontSize";
import { useToast } from "@/hooks/useToast";

import { CompareEditors } from "@/components/compare/CompareEditors";
import { DiffList } from "@/components/compare/DiffList";
import {
  compareValues,
  countByKind,
  formatJsonText,
  minifyJsonText,
  parseJson,
  preview,
  type DiffFilter,
} from "@/components/compare/diff";

const SAMPLE_LEFT = JSON.stringify(
  {
    statusCode: 200,
    data: { name: "Seeker", symbol: "SKR", chain: "solana" },
    success: true,
  },
  null,
  2,
);

const SAMPLE_RIGHT = JSON.stringify(
  {
    statusCode: 200,
    data: { name: "Seeker", symbol: "SEEK", chain: "solana", verified: true },
    success: true,
  },
  null,
  2,
);

const DEFAULT_EDITOR_HEIGHT = "52%";
const MIN_EDITOR_HEIGHT = 260;
const MIN_DIFF_HEIGHT = 180;

export function ComparePage() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const { toasts, show: showToast } = useToast();
  const jsonFont = useJsonFontSize();
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [filter, setFilter] = useState<DiffFilter>("all");
  const [query, setQuery] = useState("");
  const [editorHeight, setEditorHeight] = useState<number | null>(null);
  const [isResizingRows, setIsResizingRows] = useState(false);
  const splitBodyRef = useRef<HTMLDivElement | null>(null);

  const left = useMemo(() => parseJson(leftText), [leftText]);
  const right = useMemo(() => parseJson(rightText), [rightText]);

  const diffs = useMemo(() => {
    if (left.error || right.error) return [];
    if (left.value === undefined || right.value === undefined) return [];
    return compareValues(left.value, right.value);
  }, [left, right]);

  const counts = useMemo(() => countByKind(diffs), [diffs]);
  const canCompare =
    !!leftText.trim() &&
    !!rightText.trim() &&
    !left.error &&
    !right.error;

  useEffect(() => {
    if (!isResizingRows) return;

    const onMove = (event: MouseEvent) => {
      const rect = splitBodyRef.current?.getBoundingClientRect();
      if (!rect) return;

      setEditorHeight(
        Math.max(
          MIN_EDITOR_HEIGHT,
          Math.min(event.clientY - rect.top, rect.height - MIN_DIFF_HEIGHT),
        ),
      );
    };
    const onUp = () => setIsResizingRows(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingRows]);

  const applyToBoth = useCallback(
    (transform: (input: string) => string, toastMsg: string) => {
      if (!leftText.trim() && !rightText.trim()) return;
      try {
        setLeftText(leftText.trim() ? transform(leftText) : leftText);
        setRightText(rightText.trim() ? transform(rightText) : rightText);
      } catch {
        showToast("Can't format invalid JSON");
        return;
      }
      showToast(toastMsg);
    },
    [leftText, rightText, showToast],
  );

  const swap = useCallback(() => {
    setLeftText(rightText);
    setRightText(leftText);
    showToast("Swapped");
  }, [leftText, rightText, showToast]);

  const clear = useCallback(() => {
    setLeftText("");
    setRightText("");
    setQuery("");
    setFilter("all");
  }, []);

  const loadSample = useCallback(() => {
    setLeftText(SAMPLE_LEFT);
    setRightText(SAMPLE_RIGHT);
    showToast("Sample loaded");
  }, [showToast]);

  const copyReport = useCallback(async () => {
    if (!canCompare) return;
    const lines =
      diffs.length === 0
        ? ["JSON compare: no differences"]
        : [
            `JSON compare: ${diffs.length} difference${diffs.length === 1 ? "" : "s"}`,
            `+${counts.added} added · -${counts.removed} removed · ~${counts.changed} changed · ≠${counts.type} type`,
            "",
            ...diffs.map(
              (d) =>
                `${d.kind.toUpperCase().padEnd(8)} ${d.path}  ${preview(d.left)} -> ${preview(d.right)}`,
            ),
          ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      showToast("Report copied");
    } catch {
      showToast("Copy failed");
    }
  }, [canCompare, diffs, counts, showToast]);

  return (
    <div
      className="flex flex-col h-screen font-sans text-[11px]"
      style={{ color: "var(--text-primary)" }}
    >
      <AppHeader
        activeTab="compare"
        isDark={isDark}
        jsonFontSize={jsonFont.fontSize}
        canDecreaseFontSize={jsonFont.canDecrease}
        canIncreaseFontSize={jsonFont.canIncrease}
        onDecreaseFontSize={jsonFont.decrease}
        onIncreaseFontSize={jsonFont.increase}
        onResetFontSize={jsonFont.reset}
        onThemeToggle={toggleTheme}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{ backgroundColor: "var(--surface)" }}
      >
        {/* Compare toolbar */}
        <div
          className="h-12 shrink-0 flex items-center gap-3 px-3 border-b overflow-x-auto"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="flex items-center gap-1">
            <TextBtn onClick={loadSample} label="Sample" />
          </div>

          <Divider />

          <div className="flex items-center gap-1">
            <TextBtn
              onClick={() => applyToBoth(formatJsonText, "Formatted both")}
              label="Format"
              disabled={!leftText.trim() && !rightText.trim()}
            />
            <TextBtn
              onClick={() => applyToBoth(minifyJsonText, "Minified both")}
              label="Minify"
              disabled={!leftText.trim() && !rightText.trim()}
            />
            <TextBtn onClick={clear} label="Clear" disabled={!leftText && !rightText} />
          </div>

          <div
            className="ml-auto flex items-center gap-3 text-[11px] pr-1 whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            <DiffSummary
              canCompare={canCompare}
              total={diffs.length}
              added={counts.added}
              removed={counts.removed}
              changed={counts.changed}
              type={counts.type}
            />
            {canCompare ? (
              <TextBtn
                onClick={copyReport}
                label="Copy report"
                disabled={!canCompare}
              />
            ) : (
              <span style={{ color: "var(--text-tertiary)" }}>Paste both sides</span>
            )}
          </div>
        </div>

        <div
          ref={splitBodyRef}
          className="flex-1 min-h-0 flex flex-col overflow-hidden"
        >
          <CompareEditors
            leftText={leftText}
            rightText={rightText}
            leftError={left.error}
            rightError={right.error}
            isDark={isDark}
            fontSize={jsonFont.fontSize}
            style={{
              height: editorHeight ?? DEFAULT_EDITOR_HEIGHT,
              minHeight: MIN_EDITOR_HEIGHT,
              flexShrink: 0,
            }}
            onLeftChange={setLeftText}
            onRightChange={setRightText}
            onSwap={swap}
          />

          <div
            className="group h-2 shrink-0 cursor-row-resize flex items-center justify-center transition-colors"
            style={{
              backgroundColor: isResizingRows
                ? "var(--selection)"
                : "var(--surface-secondary)",
            }}
            onMouseDown={() => setIsResizingRows(true)}
            title="Drag to resize compare results"
            aria-label="Drag to resize compare results"
            role="separator"
          >
            <span
              className="h-0.5 w-12 rounded-full transition-colors"
              style={{
                backgroundColor: isResizingRows
                  ? "var(--accent)"
                  : "var(--border)",
              }}
            />
          </div>

          <DiffList
            diffs={diffs}
            counts={counts}
            filter={filter}
            onFilterChange={setFilter}
            query={query}
            onQueryChange={setQuery}
            canCompare={canCompare}
            fontSize={jsonFont.fontSize}
          />
        </div>
      </main>

      <Footer />
      <ToastStack toasts={toasts} />
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}

function DiffSummary({
  canCompare,
  total,
  added,
  removed,
  changed,
  type,
}: {
  canCompare: boolean;
  total: number;
  added: number;
  removed: number;
  changed: number;
  type: number;
}) {
  return (
    <div className="hidden md:flex items-center gap-2">
      <span
        className="h-7 inline-flex items-center rounded-md border px-2 font-medium"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-secondary)",
          color: canCompare
            ? total === 0
              ? "var(--success)"
              : "var(--text-primary)"
            : "var(--text-tertiary)",
        }}
      >
        {canCompare
          ? total === 0
            ? "Identical"
            : `${total} diff${total === 1 ? "" : "s"}`
          : "Waiting"}
      </span>
      <span style={{ color: "var(--success)" }}>+{added}</span>
      <span style={{ color: "var(--error)" }}>-{removed}</span>
      <span style={{ color: "var(--accent)" }}>~{changed}</span>
      <span style={{ color: "var(--json-bool)" }}>≠{type}</span>
    </div>
  );
}

function Divider() {
  return (
    <div
      className="h-5 w-px shrink-0"
      style={{ backgroundColor: "var(--border)" }}
    />
  );
}

function TextBtn({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: "var(--text-secondary)" }}
    >
      {label}
    </button>
  );
}
