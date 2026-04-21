"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { JSONValue } from "@/components/JsonTree";

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
        Loading editor...
      </div>
    ),
  },
);

type DiffKind = "added" | "removed" | "changed" | "type";
type DiffFilter = "all" | DiffKind;

interface DiffItem {
  path: string;
  kind: DiffKind;
  left: JSONValue | undefined;
  right: JSONValue | undefined;
}

interface JsonStats {
  nodes: number;
  objects: number;
  arrays: number;
  primitives: number;
  maxDepth: number;
}

interface JsonComparePaneProps {
  sourceJson: string;
  isDark: boolean;
}

const DEFAULT_LEFT_WIDTH = "50%";
const MIN_COMPARE_PANE_WIDTH = 320;
const MIN_EDITOR_HEIGHT = 220;
const MIN_DIFF_HEIGHT = 160;

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

function typeOf(value: JSONValue | undefined) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function preview(value: JSONValue | undefined) {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function prettyPreview(value: JSONValue | undefined) {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function textStats(input: string) {
  return {
    chars: input.length,
    lines: input ? input.split(/\r\n|\r|\n/).length : 0,
  };
}

function collectStats(value: JSONValue | undefined, depth = 1): JsonStats {
  if (value === undefined) {
    return { nodes: 0, objects: 0, arrays: 0, primitives: 0, maxDepth: 0 };
  }

  if (value === null || typeof value !== "object") {
    return { nodes: 1, objects: 0, arrays: 0, primitives: 1, maxDepth: depth };
  }

  const children = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, JSONValue>);
  const childStats = children.map((child) => collectStats(child, depth + 1));

  return childStats.reduce<JsonStats>(
    (acc, stat) => ({
      nodes: acc.nodes + stat.nodes,
      objects: acc.objects + stat.objects,
      arrays: acc.arrays + stat.arrays,
      primitives: acc.primitives + stat.primitives,
      maxDepth: Math.max(acc.maxDepth, stat.maxDepth),
    }),
    {
      nodes: 1,
      objects: Array.isArray(value) ? 0 : 1,
      arrays: Array.isArray(value) ? 1 : 0,
      primitives: 0,
      maxDepth: depth,
    },
  );
}

function parseJson(input: string) {
  if (!input.trim()) {
    return { value: undefined as JSONValue | undefined, error: null };
  }

  try {
    return {
      value: JSON.parse(input) as JSONValue,
      error: null,
    };
  } catch (error) {
    return {
      value: undefined as JSONValue | undefined,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function formatJsonText(input: string) {
  if (!input.trim()) return input;
  return JSON.stringify(JSON.parse(input), null, 2);
}

function minifyJsonText(input: string) {
  if (!input.trim()) return input;
  return JSON.stringify(JSON.parse(input));
}

function compareValues(
  left: JSONValue | undefined,
  right: JSONValue | undefined,
  path = "JSON",
): DiffItem[] {
  if (left === undefined && right === undefined) return [];
  if (left === undefined) return [{ path, kind: "added", left, right }];
  if (right === undefined) return [{ path, kind: "removed", left, right }];

  const leftType = typeOf(left);
  const rightType = typeOf(right);
  if (leftType !== rightType) {
    return [{ path, kind: "type", left, right }];
  }

  if (left === null || right === null || typeof left !== "object") {
    return Object.is(left, right) ? [] : [{ path, kind: "changed", left, right }];
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const max = Math.max(left.length, right.length);
    return Array.from({ length: max }).flatMap((_, index) =>
      compareValues(left[index], right[index], `${path}[${index}]`),
    );
  }

  const leftObject = left as Record<string, JSONValue>;
  const rightObject = right as Record<string, JSONValue>;
  const keys = Array.from(
    new Set([...Object.keys(leftObject), ...Object.keys(rightObject)]),
  ).sort();

  return keys.flatMap((key) =>
    compareValues(leftObject[key], rightObject[key], `${path}.${key}`),
  );
}

function kindLabel(kind: DiffKind) {
  if (kind === "added") return "Added";
  if (kind === "removed") return "Removed";
  if (kind === "type") return "Type";
  return "Changed";
}

function kindColor(kind: DiffKind) {
  if (kind === "added") return "var(--success)";
  if (kind === "removed") return "var(--error)";
  if (kind === "type") return "var(--json-bool)";
  return "var(--accent)";
}

export function JsonComparePane({ sourceJson, isDark }: JsonComparePaneProps) {
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
  const [diffQuery, setDiffQuery] = useState("");
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [leftWidth, setLeftWidth] = useState<number | null>(null);
  const [editorHeight, setEditorHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingRows, setIsResizingRows] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const compareBodyRef = useRef<HTMLDivElement | null>(null);

  const leftParsed = useMemo(() => parseJson(leftText), [leftText]);
  const rightParsed = useMemo(() => parseJson(rightText), [rightText]);

  const diffs = useMemo(() => {
    if (leftParsed.error || rightParsed.error) return [];
    if (leftParsed.value === undefined || rightParsed.value === undefined) {
      return [];
    }
    return compareValues(leftParsed.value, rightParsed.value);
  }, [leftParsed, rightParsed]);

  const diffCounts = useMemo(
    () =>
      diffs.reduce(
        (acc, diff) => {
          acc[diff.kind] += 1;
          return acc;
        },
        { added: 0, removed: 0, changed: 0, type: 0 },
      ),
    [diffs],
  );

  const filteredDiffs = useMemo(() => {
    const query = diffQuery.trim().toLowerCase();
    return diffs.filter((diff) => {
      if (diffFilter !== "all" && diff.kind !== diffFilter) return false;
      if (!query) return true;
      return (
        diff.path.toLowerCase().includes(query) ||
        preview(diff.left).toLowerCase().includes(query) ||
        preview(diff.right).toLowerCase().includes(query)
      );
    });
  }, [diffFilter, diffQuery, diffs]);

  const selectedDiff =
    filteredDiffs.find((diff) => diff.path === selectedDiffPath) ??
    filteredDiffs[0] ??
    null;

  const leftStats = useMemo(
    () => ({
      text: textStats(leftText),
      json: collectStats(leftParsed.value),
    }),
    [leftParsed.value, leftText],
  );
  const rightStats = useMemo(
    () => ({
      text: textStats(rightText),
      json: collectStats(rightParsed.value),
    }),
    [rightParsed.value, rightText],
  );

  const canCompare =
    !!leftText.trim() &&
    !!rightText.trim() &&
    !leftParsed.error &&
    !rightParsed.error;

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: MouseEvent) => {
      const rect = editorSplitRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nextWidth = Math.max(
        MIN_COMPARE_PANE_WIDTH,
        Math.min(
          event.clientX - rect.left,
          rect.width - MIN_COMPARE_PANE_WIDTH,
        ),
      );
      setLeftWidth(nextWidth);
    };
    const onUp = () => setIsResizing(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isResizingRows) return;

    const onMove = (event: MouseEvent) => {
      const rect = compareBodyRef.current?.getBoundingClientRect();
      if (!rect) return;

      const nextHeight = Math.max(
        MIN_EDITOR_HEIGHT,
        Math.min(event.clientY - rect.top, rect.height - MIN_DIFF_HEIGHT),
      );
      setEditorHeight(nextHeight);
    };
    const onUp = () => setIsResizingRows(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizingRows]);

  const copyReport = async () => {
    const report =
      diffs.length === 0
        ? "JSON compare: no differences"
        : [
            `JSON compare: ${diffs.length} differences`,
            `Added: ${diffCounts.added}, Removed: ${diffCounts.removed}, Changed: ${diffCounts.changed}, Type: ${diffCounts.type}`,
            "",
            ...diffs.map(
              (diff) =>
                `${kindLabel(diff.kind)} ${diff.path}: ${preview(diff.left)} -> ${preview(diff.right)}`,
            ),
          ].join("\n");

    await navigator.clipboard.writeText(report);
  };

  const updateSide = useCallback(
    (side: "left" | "right", transform: (input: string) => string) => {
      const setter = side === "left" ? setLeftText : setRightText;
      const value = side === "left" ? leftText : rightText;
      try {
        setter(transform(value));
      } catch {
        setter(value);
      }
    },
    [leftText, rightText],
  );

  const formatBoth = () => {
    updateSide("left", formatJsonText);
    updateSide("right", formatJsonText);
  };

  const minifyBoth = () => {
    updateSide("left", minifyJsonText);
    updateSide("right", minifyJsonText);
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div
        className="h-10 shrink-0 flex items-center gap-2 px-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => setLeftText(sourceJson)}
          disabled={!sourceJson.trim()}
        >
          Use current
        </button>
        <button
          className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => {
            setLeftText(SAMPLE_LEFT);
            setRightText(SAMPLE_RIGHT);
          }}
        >
          Sample
        </button>
        <button
          className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => {
            setLeftText(rightText);
            setRightText(leftText);
          }}
        >
          Swap
        </button>
        <button
          className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
          onClick={formatBoth}
        >
          Format
        </button>
        <button
          className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
          onClick={minifyBoth}
        >
          Minify
        </button>
        <button
          className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium"
          style={{ color: "var(--text-secondary)" }}
          onClick={() => {
            setLeftText("");
            setRightText("");
          }}
        >
          Clear
        </button>
        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span
            style={{
              color: canCompare
                ? "var(--text-secondary)"
                : "var(--text-tertiary)",
            }}
          >
            {canCompare
              ? `${filteredDiffs.length}/${diffs.length} difference${diffs.length === 1 ? "" : "s"}`
              : "Waiting for valid JSON"}
          </span>
          <button
            className="toolbar-btn h-7 px-2.5 rounded-md text-[12px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ color: "var(--text-secondary)" }}
            onClick={copyReport}
            disabled={!canCompare}
          >
            Copy report
          </button>
        </div>
      </div>

      <CompareMonitor
        canCompare={canCompare}
        diffCounts={diffCounts}
        filter={diffFilter}
        query={diffQuery}
        leftStats={leftStats}
        rightStats={rightStats}
        onFilterChange={setDiffFilter}
        onQueryChange={setDiffQuery}
      />

      <div ref={compareBodyRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          ref={editorSplitRef}
          className="flex shrink-0 overflow-hidden"
          style={{
            height: editorHeight ?? "46%",
            minHeight: MIN_EDITOR_HEIGHT,
          }}
        >
          <CompareEditorPanel
            label="Left JSON"
            value={leftText}
            error={leftParsed.error}
            isDark={isDark}
            style={{
              flexBasis: leftWidth ?? DEFAULT_LEFT_WIDTH,
              minWidth: MIN_COMPARE_PANE_WIDTH,
            }}
            onChange={setLeftText}
            onFormat={() => updateSide("left", formatJsonText)}
            onMinify={() => updateSide("left", minifyJsonText)}
          />

          <div
            className="w-0.5 shrink-0 cursor-col-resize transition-colors"
            style={{
              backgroundColor: isResizing ? "var(--accent)" : "var(--border)",
            }}
            onMouseDown={() => setIsResizing(true)}
          />

          <CompareEditorPanel
            label="Right JSON"
            value={rightText}
            error={rightParsed.error}
            isDark={isDark}
            style={{
              flex: 1,
              minWidth: MIN_COMPARE_PANE_WIDTH,
            }}
            onChange={setRightText}
            onFormat={() => updateSide("right", formatJsonText)}
            onMinify={() => updateSide("right", minifyJsonText)}
          />
        </div>

        <div
          className="h-1.5 shrink-0 cursor-row-resize transition-colors"
          style={{
            backgroundColor: isResizingRows
              ? "var(--accent)"
              : "var(--border)",
          }}
          onMouseDown={() => setIsResizingRows(true)}
          title="Resize compare results"
          aria-label="Resize compare results"
        />

        <div className="flex-1 min-h-[160px] overflow-hidden">
          <DiffExplorer
            diffs={filteredDiffs}
            selectedDiff={selectedDiff}
            canCompare={canCompare}
            onSelect={(diff) => setSelectedDiffPath(diff.path)}
          />
        </div>
      </div>
    </div>
  );
}

function CompareMonitor({
  canCompare,
  diffCounts,
  filter,
  query,
  leftStats,
  rightStats,
  onFilterChange,
  onQueryChange,
}: {
  canCompare: boolean;
  diffCounts: Record<DiffKind, number>;
  filter: DiffFilter;
  query: string;
  leftStats: { text: ReturnType<typeof textStats>; json: JsonStats };
  rightStats: { text: ReturnType<typeof textStats>; json: JsonStats };
  onFilterChange: (filter: DiffFilter) => void;
  onQueryChange: (query: string) => void;
}) {
  const filters: { id: DiffFilter; label: string; count: number }[] = [
    {
      id: "all",
      label: "All",
      count:
        diffCounts.added +
        diffCounts.removed +
        diffCounts.changed +
        diffCounts.type,
    },
    { id: "added", label: "Added", count: diffCounts.added },
    { id: "removed", label: "Removed", count: diffCounts.removed },
    { id: "changed", label: "Changed", count: diffCounts.changed },
    { id: "type", label: "Type", count: diffCounts.type },
  ];

  return (
    <div
      className="h-12 shrink-0 flex items-center gap-3 px-3 border-b overflow-hidden"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-secondary)",
      }}
    >
      <div className="flex items-center gap-1">
        {filters.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              className="h-7 px-2 rounded text-[11px] font-medium border"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                backgroundColor: active ? "var(--selection)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              onClick={() => onFilterChange(item.id)}
            >
              {item.label} {item.count}
            </button>
          );
        })}
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        className="h-7 w-64 rounded-md border bg-transparent px-2 text-[12px] outline-none"
        style={{
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
        placeholder="Filter paths or values..."
      />

      <div
        className="ml-auto flex items-center gap-4 text-[11px] whitespace-nowrap"
        style={{ color: "var(--text-secondary)" }}
      >
        <Metric label="Left" value={`${leftStats.text.lines}L / ${leftStats.text.chars}C / ${leftStats.json.nodes}N`} />
        <Metric label="Right" value={`${rightStats.text.lines}L / ${rightStats.text.chars}C / ${rightStats.json.nodes}N`} />
        <Metric
          label="Depth"
          value={`${leftStats.json.maxDepth}:${rightStats.json.maxDepth}`}
        />
        <span style={{ color: canCompare ? "var(--success)" : "var(--text-tertiary)" }}>
          {canCompare ? "Ready" : "Needs valid JSON"}
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span style={{ color: "var(--text-tertiary)" }}>{label}</span>{" "}
      <span className="font-mono">{value}</span>
    </span>
  );
}

function CompareEditorPanel({
  label,
  value,
  error,
  isDark,
  style,
  onChange,
  onFormat,
  onMinify,
}: {
  label: string;
  value: string;
  error: string | null;
  isDark: boolean;
  style: CSSProperties;
  onChange: (value: string) => void;
  onFormat: () => void;
  onMinify: () => void;
}) {
  return (
    <div className="flex min-h-0 shrink-0 flex-col overflow-hidden" style={style}>
      <div
        className="h-7 shrink-0 flex items-center justify-between gap-2 px-3 border-b text-[11px] font-medium"
        style={{
          borderColor: "var(--border-light)",
          backgroundColor: "var(--surface-secondary)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{label}</span>
          {error && <span style={{ color: "var(--error)" }}>Invalid</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="toolbar-btn h-5 px-2 rounded text-[11px] disabled:opacity-40"
            style={{ color: "var(--text-secondary)" }}
            onClick={onFormat}
            disabled={!value.trim()}
          >
            Format
          </button>
          <button
            className="toolbar-btn h-5 px-2 rounded text-[11px] disabled:opacity-40"
            style={{ color: "var(--text-secondary)" }}
            onClick={onMinify}
            disabled={!value.trim()}
          >
            Minify
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <JsonCodeEditor value={value} onChange={onChange} isDark={isDark} />
      </div>
    </div>
  );
}

function DiffExplorer({
  diffs,
  selectedDiff,
  canCompare,
  onSelect,
}: {
  diffs: DiffItem[];
  selectedDiff: DiffItem | null;
  canCompare: boolean;
  onSelect: (diff: DiffItem) => void;
}) {
  if (!canCompare) {
    return (
      <div
        className="flex h-full items-center justify-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Add valid JSON on both sides
      </div>
    );
  }

  if (diffs.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center text-[12px] font-medium"
        style={{ color: "var(--success)" }}
      >
        No differences
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="min-w-[980px]">
          <div
            className="grid grid-cols-[110px_1.15fr_90px_90px_1fr_1fr] border-b text-[11px] font-medium"
            style={{
              backgroundColor: "var(--surface-secondary)",
              borderColor: "var(--border-light)",
              color: "var(--text-primary)",
            }}
          >
            <div className="px-3 py-2">Type</div>
            <div className="px-3 py-2">Path</div>
            <div className="px-3 py-2">Left Type</div>
            <div className="px-3 py-2">Right Type</div>
            <div className="px-3 py-2">Left</div>
            <div className="px-3 py-2">Right</div>
          </div>
          {diffs.map((diff) => {
            const active = selectedDiff?.path === diff.path;
            return (
              <button
                key={`${diff.kind}-${diff.path}`}
                className="grid w-full grid-cols-[110px_1.15fr_90px_90px_1fr_1fr] border-b text-left text-[11px]"
                style={{
                  borderColor: "var(--border-light)",
                  backgroundColor: active ? "var(--selection)" : "transparent",
                }}
                onClick={() => onSelect(diff)}
              >
                <div
                  className="px-3 py-2 font-medium"
                  style={{ color: kindColor(diff.kind) }}
                >
                  {kindLabel(diff.kind)}
                </div>
                <div
                  className="px-3 py-2 font-mono"
                  style={{ color: "var(--text-primary)" }}
                >
                  {diff.path}
                </div>
                <div
                  className="px-3 py-2 font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {typeOf(diff.left)}
                </div>
                <div
                  className="px-3 py-2 font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {typeOf(diff.right)}
                </div>
                <div
                  className="px-3 py-2 font-mono truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {preview(diff.left)}
                </div>
                <div
                  className="px-3 py-2 font-mono truncate"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {preview(diff.right)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <DiffInspector diff={selectedDiff} />
    </div>
  );
}

function DiffInspector({ diff }: { diff: DiffItem | null }) {
  return (
    <aside
      className="hidden w-[360px] shrink-0 border-l lg:flex lg:flex-col"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
      }}
    >
      <div
        className="h-9 shrink-0 border-b px-3 flex items-center justify-between text-[11px] font-medium"
        style={{
          borderColor: "var(--border-light)",
          backgroundColor: "var(--surface-secondary)",
          color: "var(--text-primary)",
        }}
      >
        <span>Diff Inspector</span>
        {diff && (
          <span style={{ color: kindColor(diff.kind) }}>
            {kindLabel(diff.kind)}
          </span>
        )}
      </div>

      {diff ? (
        <div className="flex-1 min-h-0 overflow-auto p-3 text-[11px]">
          <div className="space-y-2">
            <InspectorRow label="Path" value={diff.path} />
            <InspectorRow label="Left Type" value={typeOf(diff.left)} />
            <InspectorRow label="Right Type" value={typeOf(diff.right)} />
          </div>

          <InspectorValue label="Left Value" value={prettyPreview(diff.left)} />
          <InspectorValue label="Right Value" value={prettyPreview(diff.right)} />
        </div>
      ) : (
        <div
          className="flex flex-1 items-center justify-center text-[12px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Select a diff row
        </div>
      )}
    </aside>
  );
}

function InspectorRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div
        className="rounded border px-2 py-1 font-mono"
        style={{
          borderColor: "var(--border-light)",
          color: "var(--text-primary)",
          backgroundColor: "var(--surface-secondary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InspectorValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <pre
        className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border p-2 font-mono text-[11px]"
        style={{
          borderColor: "var(--border-light)",
          color: "var(--text-secondary)",
          backgroundColor: "var(--surface-secondary)",
        }}
      >
        {value || "undefined"}
      </pre>
    </div>
  );
}
