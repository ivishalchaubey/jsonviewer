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

/**
 * LCS-based line diff. Returns 0-based line indices that differ (absent from
 * or misaligned with the other side). Used to paint per-line background
 * decorations inside the Compare editors.
 *
 * O(n·m) time and space — capped to protect the UI thread on huge payloads.
 */
const LINE_DIFF_CAP = 2000;

export function computeLineDiff(
  leftText: string,
  rightText: string,
): { leftLines: Set<number>; rightLines: Set<number> } {
  const leftLines = leftText.split("\n");
  const rightLines = rightText.split("\n");
  const empty = { leftLines: new Set<number>(), rightLines: new Set<number>() };

  if (leftLines.length === 0 || rightLines.length === 0) return empty;
  if (
    leftLines.length > LINE_DIFF_CAP ||
    rightLines.length > LINE_DIFF_CAP
  ) {
    return empty;
  }

  const n = leftLines.length;
  const m = rightLines.length;

  // LCS lengths.
  const dp: Uint32Array[] = Array.from(
    { length: n + 1 },
    () => new Uint32Array(m + 1),
  );
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] =
        leftLines[i - 1] === rightLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const leftHL = new Set<number>();
  const rightHL = new Set<number>();
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rightHL.add(j - 1);
      j--;
    } else if (i > 0) {
      leftHL.add(i - 1);
      i--;
    } else {
      break;
    }
  }

  return { leftLines: leftHL, rightLines: rightHL };
}
