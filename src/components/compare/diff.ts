import type { JSONValue } from "@/components/JsonTree";

export type DiffKind = "added" | "removed" | "changed" | "type";
export type DiffFilter = "all" | DiffKind;

export interface DiffItem {
  path: string;
  kind: DiffKind;
  left: JSONValue | undefined;
  right: JSONValue | undefined;
}

export interface DiffCounts {
  added: number;
  removed: number;
  changed: number;
  type: number;
}

export function typeOf(value: JSONValue | undefined): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function preview(value: JSONValue | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function parseJson(input: string): {
  value: JSONValue | undefined;
  error: string | null;
} {
  if (!input.trim()) return { value: undefined, error: null };
  try {
    return { value: JSON.parse(input) as JSONValue, error: null };
  } catch (err) {
    return {
      value: undefined,
      error: err instanceof Error ? err.message : "Invalid JSON",
    };
  }
}

export function formatJsonText(input: string): string {
  if (!input.trim()) return input;
  try {
    return JSON.stringify(JSON.parse(input), null, 2);
  } catch {
    return input;
  }
}

export function minifyJsonText(input: string): string {
  if (!input.trim()) return input;
  try {
    return JSON.stringify(JSON.parse(input));
  } catch {
    return input;
  }
}

/**
 * Compare two JSON values and return a flat list of differences.
 * Objects are compared by key, arrays by index.
 */
export function compareValues(
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
    return Object.is(left, right)
      ? []
      : [{ path, kind: "changed", left, right }];
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const max = Math.max(left.length, right.length);
    const out: DiffItem[] = [];
    for (let i = 0; i < max; i++) {
      out.push(...compareValues(left[i], right[i], `${path}[${i}]`));
    }
    return out;
  }

  const leftObj = left as Record<string, JSONValue>;
  const rightObj = right as Record<string, JSONValue>;
  const keys = Array.from(
    new Set([...Object.keys(leftObj), ...Object.keys(rightObj)]),
  ).sort();

  const out: DiffItem[] = [];
  for (const key of keys) {
    out.push(...compareValues(leftObj[key], rightObj[key], `${path}.${key}`));
  }
  return out;
}

export function countByKind(diffs: DiffItem[]): DiffCounts {
  const counts: DiffCounts = { added: 0, removed: 0, changed: 0, type: 0 };
  for (const d of diffs) counts[d.kind] += 1;
  return counts;
}

export function kindLabel(kind: DiffKind): string {
  if (kind === "added") return "Added";
  if (kind === "removed") return "Removed";
  if (kind === "type") return "Type changed";
  return "Changed";
}

export function kindColor(kind: DiffKind): string {
  if (kind === "added") return "var(--success)";
  if (kind === "removed") return "var(--error)";
  if (kind === "type") return "var(--json-bool)";
  return "var(--accent)";
}

export function kindSymbol(kind: DiffKind): string {
  if (kind === "added") return "+";
  if (kind === "removed") return "−";
  if (kind === "type") return "≠";
  return "~";
}
