"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

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
}: CompareEditorsProps) {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

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

  return (
    <div
      ref={splitRef}
      className="min-h-0 flex overflow-hidden"
      style={style}
    >
      <EditorColumn
        label="Left JSON"
        value={leftText}
        error={leftError}
        isDark={isDark}
        fontSize={fontSize}
        onChange={onLeftChange}
        style={{
          flexBasis: leftWidth ?? DEFAULT_LEFT,
          minWidth: MIN_PANE,
        }}
      />

      <div
        className="w-0.5 shrink-0 cursor-col-resize transition-colors"
        style={{
          backgroundColor: isResizing ? "var(--accent)" : "var(--border)",
        }}
        onMouseDown={() => setIsResizing(true)}
        aria-label="Drag to resize panes"
        role="separator"
      />

      <EditorColumn
        label="Right JSON"
        value={rightText}
        error={rightError}
        isDark={isDark}
        fontSize={fontSize}
        onChange={onRightChange}
        style={{ flex: 1, minWidth: MIN_PANE }}
      />
    </div>
  );
}

function EditorColumn({
  label,
  value,
  error,
  isDark,
  fontSize,
  onChange,
  style,
}: {
  label: string;
  value: string;
  error: string | null;
  isDark: boolean;
  fontSize: number;
  onChange: (val: string) => void;
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
