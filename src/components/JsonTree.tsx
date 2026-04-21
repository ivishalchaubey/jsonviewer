"use client";

import {
  memo,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

const INDENT = 16;

const isObject = (v: JSONValue): v is JSONObject =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isArray = (v: JSONValue): v is JSONArray => Array.isArray(v);

// ─── Path Utilities ──────────────────────────────────────────────────

export function getValueAtPath(
  root: JSONValue | null,
  path: string,
): JSONValue | null {
  if (!root || !path) return root;
  const rest = path.replace(/^[^.[]+/, "");
  let current: JSONValue | null = root;
  const regex = /\.([^.[]+)|\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(rest)) !== null) {
    if (current === null || typeof current !== "object") return null;
    if (m[1] !== undefined) {
      current = (current as JSONObject)[m[1]] ?? null;
    } else if (m[2] !== undefined) {
      current = (current as JSONArray)[parseInt(m[2], 10)] ?? null;
    }
  }
  return current;
}

function isAncestorPath(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return false;
  if (!descendant.startsWith(ancestor)) return false;
  const next = descendant[ancestor.length];
  return next === "." || next === "[";
}

// ─── Match Collection ────────────────────────────────────────────────

export function collectMatches(
  value: JSONValue,
  filter: string,
  rootLabel: string = "JSON",
): string[] {
  const term = filter.trim().toLowerCase();
  if (!term) return [];

  const matches: string[] = [];

  const walk = (val: JSONValue, path: string, label: string) => {
    const labelMatch = label.toLowerCase().includes(term);
    const isPrimitive = val === null || typeof val !== "object";
    const valueMatch =
      isPrimitive && String(val).toLowerCase().includes(term);

    if (labelMatch || valueMatch) matches.push(path);

    if (isObject(val)) {
      for (const key of Object.keys(val)) {
        walk(val[key], `${path}.${key}`, key);
      }
    } else if (isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        walk(val[i], `${path}[${i}]`, String(i));
      }
    }
  };

  if (isObject(value)) {
    for (const key of Object.keys(value)) {
      walk(value[key], `${rootLabel}.${key}`, key);
    }
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], `${rootLabel}[${i}]`, String(i));
    }
  } else {
    walk(value, rootLabel, rootLabel);
  }

  return matches;
}

// ─── Substring Highlight Renderer ────────────────────────────────────

const HL_ALL_STYLE: React.CSSProperties = {
  backgroundColor: "transparent",
  color: "inherit",
  borderRadius: 2,
  padding: "0 1px",
  boxShadow: "inset 0 0 0 1px #f59e0b",
  fontWeight: 600,
};

const HL_CURRENT_STYLE: React.CSSProperties = {
  backgroundColor: "#f59e0b",
  color: "#111111",
  borderRadius: 2,
  padding: "0 2px",
  boxShadow: "0 0 0 1px #d97706",
  fontWeight: 700,
};

function renderHighlighted(
  text: string,
  query: string | undefined,
  isCurrent: boolean,
): ReactNode {
  if (!query) return text;
  const q = query.toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  if (!lower.includes(q)) return text;

  const parts: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const style = isCurrent ? HL_CURRENT_STYLE : HL_ALL_STYLE;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) {
      if (i < text.length) parts.push(<span key={key++}>{text.slice(i)}</span>);
      break;
    }
    if (idx > i)
      parts.push(<span key={key++}>{text.slice(i, idx)}</span>);
    parts.push(
      <mark key={key++} style={style}>
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return <>{parts}</>;
}

// ─── Primitive Value ─────────────────────────────────────────────────

const PrimitiveValue = memo(function PrimitiveValue({
  value,
  filter,
  isCurrent,
}: {
  value: Exclude<JSONValue, JSONObject | JSONArray>;
  filter?: string;
  isCurrent: boolean;
}) {
  const raw = String(value);
  const content = typeof value === "string" ? `"${value}"` : raw;

  let color = "var(--text-primary)";
  if (typeof value === "number") color = "var(--accent)";
  else if (typeof value === "boolean") color = "var(--json-bool)";
  else if (value === null) color = "var(--text-tertiary)";
  else if (typeof value === "string") color = "var(--json-string)";

  return (
    <span style={{ color }}>{renderHighlighted(content, filter, isCurrent)}</span>
  );
});

// ─── Node ────────────────────────────────────────────────────────────

interface NodeProps {
  label: string;
  value: JSONValue;
  depth: number;
  path: string;
  onSelect?: (path: string, label: string, value: JSONValue) => void;
  selectedPath?: string;
  filter?: string;
  currentMatchPath?: string;
}

const JsonNode = memo(function JsonNode({
  label,
  value,
  depth,
  path,
  onSelect,
  selectedPath,
  filter,
  currentMatchPath,
}: NodeProps) {
  const expandable = isObject(value) || isArray(value);
  const [open, setOpen] = useState(true);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // Auto-expand this node when it's an ancestor of the current match.
  // Uses the render-phase sync pattern (React 19) to avoid setState in
  // effects: only fire on the transition false→true.
  const shouldAutoOpen =
    expandable &&
    !!currentMatchPath &&
    isAncestorPath(path, currentMatchPath);
  const [prevAutoOpen, setPrevAutoOpen] = useState(shouldAutoOpen);
  if (shouldAutoOpen !== prevAutoOpen) {
    setPrevAutoOpen(shouldAutoOpen);
    if (shouldAutoOpen) setOpen(true);
  }

  // Scroll the current match node into view (DOM side effect).
  useEffect(() => {
    if (currentMatchPath === path && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [currentMatchPath, path]);

  const isSelected = selectedPath === path;
  const isCurrent = currentMatchPath === path;

  const handleClick = () => {
    if (expandable) setOpen((p) => !p);
    onSelect?.(path, label, value);
  };

  const rowClass =
    "json-row flex items-center gap-1 cursor-pointer py-px whitespace-nowrap" +
    (isSelected ? " json-row-selected" : "") +
    (isCurrent ? " json-row-current" : "");

  return (
    <div
      style={{ paddingLeft: depth === 0 ? 0 : INDENT }}
      className="font-sans text-[11px] leading-tight select-none"
    >
      <div ref={rowRef} className={rowClass} onClick={handleClick}>
        {/* Expand/Collapse icon */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {expandable ? (
            <span
              className="w-3 h-3 flex items-center justify-center text-[9px] font-bold leading-none"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-secondary)",
              }}
            >
              {open ? "−" : "+"}
            </span>
          ) : (
            <span className="w-3 h-3" />
          )}
        </span>

        {/* Type icon */}
        <span className="shrink-0 flex items-center justify-center w-4">
          {isObject(value) && (
            <span style={{ color: "var(--accent)" }} className="font-bold">
              {"{}"}
            </span>
          )}
          {isArray(value) && (
            <span
              style={{ color: "var(--accent)", opacity: 0.8 }}
              className="font-bold"
            >
              {"[]"}
            </span>
          )}
          {!expandable && typeof value === "number" && (
            <span
              className="w-2 h-2 shrink-0"
              style={{ backgroundColor: "var(--success)" }}
            />
          )}
          {!expandable && typeof value === "string" && (
            <span
              className="w-2 h-2 shrink-0"
              style={{ backgroundColor: "var(--accent)" }}
            />
          )}
          {!expandable && typeof value === "boolean" && (
            <span
              className="w-2 h-2 shrink-0"
              style={{ backgroundColor: "var(--json-bool)" }}
            />
          )}
        </span>

        {/* Label */}
        <span
          className="font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {renderHighlighted(label, filter, isCurrent)}
        </span>

        {!expandable && (
          <>
            <span style={{ color: "var(--text-tertiary)" }} className="mx-1">
              :
            </span>
            <PrimitiveValue
              value={value as Exclude<JSONValue, JSONObject | JSONArray>}
              filter={filter}
              isCurrent={isCurrent}
            />
          </>
        )}
      </div>

      {open && expandable && (
        <div
          className="ml-[7px] pl-1"
          style={{ borderLeft: "1px solid var(--border-light)" }}
        >
          {isObject(value)
            ? Object.keys(value).map((key) => (
                <JsonNode
                  key={key}
                  label={key}
                  value={value[key]}
                  depth={depth + 1}
                  path={`${path}.${key}`}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  filter={filter}
                  currentMatchPath={currentMatchPath}
                />
              ))
            : (value as JSONArray).map((child, i) => (
                <JsonNode
                  key={i}
                  label={String(i)}
                  value={child}
                  depth={depth + 1}
                  path={`${path}[${i}]`}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  filter={filter}
                  currentMatchPath={currentMatchPath}
                />
              ))}
        </div>
      )}
    </div>
  );
});

// ─── Tree Entry ──────────────────────────────────────────────────────

interface JsonTreeProps {
  value: JSONValue;
  rootLabel?: string;
  onSelect?: (path: string, label: string, value: JSONValue) => void;
  selectedPath?: string;
  filter?: string;
  currentMatchPath?: string;
}

export function JsonTree({
  value,
  rootLabel = "JSON",
  onSelect,
  selectedPath,
  filter,
  currentMatchPath,
}: JsonTreeProps) {
  return (
    <div className="py-1">
      <JsonNode
        label={rootLabel}
        value={value}
        depth={0}
        path={rootLabel}
        onSelect={onSelect}
        selectedPath={selectedPath}
        filter={filter}
        currentMatchPath={currentMatchPath}
      />
    </div>
  );
}
