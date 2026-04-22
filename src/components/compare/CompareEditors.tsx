"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { computeLineDiff } from "@/components/compare/diff";
import { IconLock, IconSwap, IconUnlock } from "@/components/ui/icons";

const JsonCodeEditor = dynamic(
  () =>
    import("@/components/JsonCodeEditor").then((mod) => mod.JsonCodeEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex-1 flex items-center justify-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Loading editor…
      </div>
    ),
  },
);

// Stable empty set reused when there are no diff lines — keeps the prop
// reference stable so CodeMirror doesn't re-dispatch every keystroke.
const EMPTY_LINES: Set<number> = new Set();

const DEFAULT_LEFT = "50%";
const MIN_PANE = 320;

interface CompareEditorsProps {
  leftText: string;
  rightText: string;
  leftError: string | null;
  rightError: string | null;
  isDark: boolean;
  fontSize: number;
  style?: React.CSSProperties;
  onLeftChange: (val: string) => void;
  onRightChange: (val: string) => void;
  onSwap: () => void;
}

export function CompareEditors({
  leftText,
  rightText,
  leftError,
  rightError,
  isDark,
  fontSize,
  style,
  onLeftChange,
  onRightChange,
  onSwap,
}: CompareEditorsProps) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Mid-column state
  const [scrollLocked, setScrollLocked] = useState(true);
  const [swapRotation, setSwapRotation] = useState(0);

  // We need each CodeMirror scroll element for the lock-scroll feature.
  // The editor's EditorView holds scrollDOM; we only need the DOM element,
  // so we stash it in a ref (escape hatch for DOM mutation).
  const leftScrollerRef = useRef<HTMLElement | null>(null);
  const rightScrollerRef = useRef<HTMLElement | null>(null);
  // Bumped when a view mounts so the scroll-sync effect re-runs.
  const [viewsReady, setViewsReady] = useState(0);
  // Feedback-loop guard used across the two scroll listeners.
  const syncingRef = useRef(false);

  const handleLeftView = useCallback((view: EditorView) => {
    leftScrollerRef.current = view.scrollDOM;
    setViewsReady((n) => n + 1);
  }, []);
  const handleRightView = useCallback((view: EditorView) => {
    rightScrollerRef.current = view.scrollDOM;
    setViewsReady((n) => n + 1);
  }, []);

  // Resize drag
  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = Math.max(
        MIN_PANE,
        Math.min(e.clientX - rect.left, rect.width - MIN_PANE),
      );
      setLeftWidth(next);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  // Scroll sync between the two CodeMirror scrollers when the lock is on.
  // `syncingRef` prevents feedback loops between the two listeners.
  useEffect(() => {
    if (!scrollLocked) return;
    const leftEl = leftScrollerRef.current;
    const rightEl = rightScrollerRef.current;
    if (!leftEl || !rightEl) return;
    const guard = syncingRef;

    const onLeft = () => {
      if (guard.current) return;
      guard.current = true;
      rightEl.scrollTop = leftEl.scrollTop;
      rightEl.scrollLeft = leftEl.scrollLeft;
      requestAnimationFrame(() => {
        guard.current = false;
      });
    };
    const onRight = () => {
      if (guard.current) return;
      guard.current = true;
      leftEl.scrollTop = rightEl.scrollTop;
      leftEl.scrollLeft = rightEl.scrollLeft;
      requestAnimationFrame(() => {
        guard.current = false;
      });
    };

    // Align once on enable so both sides start from the same position.
    onLeft();

    leftEl.addEventListener("scroll", onLeft, { passive: true });
    rightEl.addEventListener("scroll", onRight, { passive: true });
    return () => {
      leftEl.removeEventListener("scroll", onLeft);
      rightEl.removeEventListener("scroll", onRight);
    };
  }, [scrollLocked, viewsReady]);

  // Line-level diff highlights
  const { leftLines, rightLines } = useMemo(
    () => computeLineDiff(leftText, rightText),
    [leftText, rightText],
  );
  const leftHL = leftLines.size === 0 ? EMPTY_LINES : leftLines;
  const rightHL = rightLines.size === 0 ? EMPTY_LINES : rightLines;

  const handleSwap = useCallback(() => {
    onSwap();
    setSwapRotation((r) => r + 180);
  }, [onSwap]);

  return (
    <div
      ref={splitRef}
      className="min-h-0 flex overflow-hidden relative"
      style={style}
    >
      <EditorColumn
        label="Left JSON"
        value={leftText}
        error={leftError}
        isDark={isDark}
        fontSize={fontSize}
        diffLines={leftHL}
        onChange={onLeftChange}
        onViewReady={handleLeftView}
        style={{
          flexBasis: leftWidth ?? DEFAULT_LEFT,
          minWidth: MIN_PANE,
        }}
      />

      <SplitterColumn
        isResizing={isResizing}
        onBeginResize={() => setIsResizing(true)}
        scrollLocked={scrollLocked}
        onToggleLock={() => setScrollLocked((v) => !v)}
        onSwap={handleSwap}
        swapRotation={swapRotation}
      />

      <EditorColumn
        label="Right JSON"
        value={rightText}
        error={rightError}
        isDark={isDark}
        fontSize={fontSize}
        diffLines={rightHL}
        onChange={onRightChange}
        onViewReady={handleRightView}
        style={{ flex: 1, minWidth: MIN_PANE }}
      />
    </div>
  );
}

// ─── Mid-column: splitter line + stacked Swap/Lock buttons ──────────

function SplitterColumn({
  isResizing,
  onBeginResize,
  scrollLocked,
  onToggleLock,
  onSwap,
  swapRotation,
}: {
  isResizing: boolean;
  onBeginResize: () => void;
  scrollLocked: boolean;
  onToggleLock: () => void;
  onSwap: () => void;
  swapRotation: number;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: 1 }}
    >
      {/* Drag handle — 1px line, full height */}
      <div
        className="absolute inset-y-0 left-0 w-px cursor-col-resize transition-colors"
        style={{
          backgroundColor: isResizing ? "var(--accent)" : "var(--border)",
        }}
        onMouseDown={onBeginResize}
        aria-label="Drag to resize panes"
        role="separator"
      />

      {/* Centered stacked buttons */}
      <div
        className="absolute z-10 flex flex-col items-center gap-1.5"
        // Stop drag from starting when interacting with buttons.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <MidButton
          label="Swap left and right"
          onClick={onSwap}
        >
          <span
            className="swap-icon inline-flex"
            style={{ transform: `rotate(${swapRotation}deg)` }}
          >
            <IconSwap />
          </span>
        </MidButton>

        <MidButton
          label={
            scrollLocked
              ? "Unlock scroll — scroll each side independently"
              : "Lock scroll — scroll both sides together"
          }
          onClick={onToggleLock}
          active={scrollLocked}
        >
          {scrollLocked ? <IconLock /> : <IconUnlock />}
        </MidButton>
      </div>
    </div>
  );
}

function MidButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active ? true : undefined}
      className="mid-btn h-7 w-7 rounded-full border flex items-center justify-center shadow-sm"
      style={{
        backgroundColor: active ? "var(--accent-soft)" : "var(--surface)",
        borderColor: active ? "var(--accent)" : "var(--border)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Editor column ──────────────────────────────────────────────────

function EditorColumn({
  label,
  value,
  error,
  isDark,
  fontSize,
  diffLines,
  onChange,
  onViewReady,
  style,
}: {
  label: string;
  value: string;
  error: string | null;
  isDark: boolean;
  fontSize: number;
  diffLines: Set<number>;
  onChange: (val: string) => void;
  onViewReady: (view: EditorView) => void;
  style: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col min-h-0 min-w-0 overflow-hidden" style={style}>
      <div
        className="h-9 shrink-0 flex items-center justify-between px-3 border-b text-[11px] font-medium"
        style={{
          borderColor: "var(--border-light)",
          backgroundColor: "var(--surface-secondary)",
          color: "var(--text-primary)",
          fontSize: Math.max(11, fontSize - 2),
        }}
      >
        <span className="text-[12px]">{label}</span>
        {error ? (
          <Status label="Invalid" color="var(--error)" />
        ) : value.trim() ? (
          <Status label="Valid" color="var(--success)" />
        ) : (
          <Status label="Empty" color="var(--text-tertiary)" />
        )}
      </div>
      <div className="flex-1 min-h-0">
        <JsonCodeEditor
          value={value}
          onChange={onChange}
          isDark={isDark}
          fontSize={fontSize}
          diffLines={diffLines}
          onViewReady={onViewReady}
        />
      </div>
    </div>
  );
}

function Status({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" style={{ color }}>
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
