"use client";

import { useMemo } from "react";
import {
  kindColor,
  kindLabel,
  kindSymbol,
  preview,
  typeOf,
  type DiffCounts,
  type DiffFilter,
  type DiffItem,
} from "@/components/compare/diff";
import { IconClose, IconSearch } from "@/components/ui/icons";

interface DiffListProps {
  diffs: DiffItem[];
  counts: DiffCounts;
  filter: DiffFilter;
  onFilterChange: (filter: DiffFilter) => void;
  query: string;
  onQueryChange: (q: string) => void;
  canCompare: boolean;
  fontSize: number;
}

export function DiffList({
  diffs,
  counts,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  canCompare,
  fontSize,
}: DiffListProps) {
  const total = counts.added + counts.removed + counts.changed + counts.type;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return diffs.filter((d) => {
      if (filter !== "all" && d.kind !== filter) return false;
      if (!q) return true;
      return (
        d.path.toLowerCase().includes(q) ||
        preview(d.left).toLowerCase().includes(q) ||
        preview(d.right).toLowerCase().includes(q)
      );
    });
  }, [diffs, filter, query]);

  const chips: { id: DiffFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: total },
    { id: "added", label: "Added", count: counts.added },
    { id: "removed", label: "Removed", count: counts.removed },
    { id: "changed", label: "Changed", count: counts.changed },
    { id: "type", label: "Type", count: counts.type },
  ];

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ fontSize }}
    >
      {/* Filter bar */}
      <div
        className="h-11 shrink-0 flex items-center gap-3 px-3 border-b overflow-x-auto"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--surface-secondary)",
        }}
      >
        <div className="flex items-center gap-1 shrink-0">
          {chips.map((c) => {
            const active = filter === c.id;
            const disabled = c.count === 0 && c.id !== "all";
            return (
              <button
                key={c.id}
                onClick={() => onFilterChange(c.id)}
                disabled={disabled}
                className="h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed toolbar-btn"
                style={{
                  backgroundColor: active
                    ? "var(--surface)"
                    : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  boxShadow: active
                    ? "0 1px 2px rgba(0,0,0,0.08)"
                    : undefined,
                }}
              >
                {c.label}
                <span
                  className="ml-1 font-mono"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter input */}
        <div
          className="ml-auto flex items-center gap-2 h-8 px-2.5 rounded-md w-72 search-field border"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <span style={{ color: "var(--text-tertiary)" }} aria-hidden>
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Filter paths or values…"
            aria-label="Filter diffs"
            className="flex-1 h-full outline-none text-[12px] bg-transparent min-w-0"
            style={{ color: "var(--text-primary)" }}
          />
          {query && (
            <button
              onClick={() => onQueryChange("")}
              title="Clear filter"
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Clear filter"
            >
              <IconClose />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-auto">
        <DiffBody
          diffs={filtered}
          canCompare={canCompare}
          hasAnyDiff={total > 0}
          isFiltering={filter !== "all" || query.trim().length > 0}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}

function DiffBody({
  diffs,
  canCompare,
  hasAnyDiff,
  isFiltering,
  fontSize,
}: {
  diffs: DiffItem[];
  canCompare: boolean;
  hasAnyDiff: boolean;
  isFiltering: boolean;
  fontSize: number;
}) {
  if (!canCompare) {
    return (
      <EmptyMsg
        title="Paste valid JSON on both sides"
        subtitle="Results appear as soon as both editors contain valid JSON."
      />
    );
  }
  if (!hasAnyDiff) {
    return (
      <EmptyMsg
        title="No differences"
        subtitle="Both sides are structurally identical."
        tone="success"
      />
    );
  }
  if (diffs.length === 0) {
    return (
      <EmptyMsg
        title={isFiltering ? "No diffs match your filter" : "No differences"}
        subtitle={
          isFiltering
            ? "Try a different category or clear the filter."
            : undefined
        }
      />
    );
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "auto minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)",
        fontSize,
      }}
    >
      <HeaderRow />
      {diffs.map((d) => (
        <DiffRow key={`${d.kind}-${d.path}`} diff={d} fontSize={fontSize} />
      ))}
    </div>
  );
}

function HeaderRow() {
  const cell =
    "px-3 py-2.5 text-[10px] uppercase tracking-wider font-semibold border-b sticky top-0 z-10";
  const style = {
    color: "var(--text-tertiary)",
    borderColor: "var(--border-light)",
    backgroundColor: "var(--surface-secondary)",
  };
  return (
    <>
      <div className={cell} style={style}>
        Change
      </div>
      <div className={cell} style={style}>
        Path
      </div>
      <div className={cell} style={style}>
        Left
      </div>
      <div className={cell} style={style}>
        Right
      </div>
    </>
  );
}

function DiffRow({ diff, fontSize }: { diff: DiffItem; fontSize: number }) {
  const color = kindColor(diff.kind);
  const cellStyle = { borderColor: "var(--border-light)" };
  return (
    <>
      <div
        className="px-3 py-2.5 border-b flex items-center gap-2 shrink-0"
        style={cellStyle}
      >
        <span
          className="inline-flex w-5 h-5 items-center justify-center rounded text-[12px] font-bold"
          style={{
            backgroundColor: "var(--surface-secondary)",
            color,
          }}
          aria-hidden
        >
          {kindSymbol(diff.kind)}
        </span>
        <span
          className="text-[11px] font-medium"
          style={{ color }}
        >
          {kindLabel(diff.kind)}
        </span>
      </div>
      <div
        className="px-3 py-2.5 border-b font-mono truncate"
        style={{ ...cellStyle, color: "var(--text-primary)" }}
        title={diff.path}
      >
        {diff.path}
      </div>
      <ValueCell
        value={diff.left}
        kind={diff.kind}
        side="left"
        fontSize={fontSize}
      />
      <ValueCell
        value={diff.right}
        kind={diff.kind}
        side="right"
        fontSize={fontSize}
      />
    </>
  );
}

function ValueCell({
  value,
  kind,
  side,
  fontSize,
}: {
  value: DiffItem["left"];
  kind: DiffItem["kind"];
  side: "left" | "right";
  fontSize: number;
}) {
  const text = preview(value);
  const isAbsent =
    value === undefined &&
    ((side === "left" && kind === "added") ||
      (side === "right" && kind === "removed"));

  return (
    <div
      className="px-3 py-2.5 border-b font-mono truncate"
      style={{
        borderColor: "var(--border-light)",
        color: isAbsent ? "var(--text-tertiary)" : "var(--text-secondary)",
        fontStyle: isAbsent ? "italic" : "normal",
        fontSize: Math.max(10, fontSize - 1),
      }}
      title={text || "(absent)"}
    >
      {isAbsent ? "(absent)" : text}
      {!isAbsent && value !== undefined && kind !== "changed" && (
        <span
          className="ml-2 text-[10px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {typeOf(value)}
        </span>
      )}
    </div>
  );
}

function EmptyMsg({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle?: string;
  tone?: "success";
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-1.5 p-10 text-center">
      <div
        className="text-[13px] font-medium"
        style={{
          color: tone === "success" ? "var(--success)" : "var(--text-primary)",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          className="text-[12px]"
          style={{ color: "var(--text-secondary)" }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
