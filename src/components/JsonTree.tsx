"use client";

import { useState, memo } from "react";

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

interface NodeProps {
  label: string;
  value: JSONValue;
  depth: number;
  path: string;
  onSelect?: (path: string, label: string, value: JSONValue) => void;
  selectedPath?: string;
  filter?: string;
}

const INDENT = 16;

const isObject = (value: JSONValue): value is JSONObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isArray = (value: JSONValue): value is JSONArray => Array.isArray(value);

// Collect all matching paths in the tree
export function collectMatches(
  value: JSONValue,
  filter: string,
  rootLabel: string = "JSON",
  currentPath: string = "",
): string[] {
  if (!filter.trim()) return [];

  const matches: string[] = [];
  const searchLower = filter.toLowerCase();

  // Helper to check if a value matches
  const valueMatches = (val: JSONValue, label: string): boolean => {
    const labelMatch = label.toLowerCase().includes(searchLower);
    if (!val || typeof val !== "object") {
      const valStr = String(val).toLowerCase();
      return labelMatch || valStr.includes(searchLower);
    }
    return labelMatch;
  };

  // Check current node
  if (isObject(value)) {
    Object.entries(value).forEach(([key, child]) => {
      const childPath = currentPath
        ? `${currentPath}.${key}`
        : `${rootLabel}.${key}`;
      if (valueMatches(child, key)) {
        matches.push(childPath);
      }
      // Recursively check children
      matches.push(...collectMatches(child, filter, rootLabel, childPath));
    });
  } else if (isArray(value)) {
    (value as JSONArray).forEach((child, index) => {
      const childPath = `${currentPath}[${index}]`;
      if (valueMatches(child, String(index))) {
        matches.push(childPath);
      }
      // Recursively check children
      matches.push(...collectMatches(child, filter, rootLabel, childPath));
    });
  }

  return matches;
}

const PrimitiveValue = ({
  value,
  filter,
}: {
  value: Exclude<JSONValue, JSONObject | JSONArray>;
  filter?: string;
}) => {
  const text = String(value);
  const isMatch = filter && text.toLowerCase().includes(filter.toLowerCase());

  const content = typeof value === "string" ? `"${value}"` : text;

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  let color = "var(--text-primary)";
  if (typeof value === "number") color = "var(--accent)";
  else if (typeof value === "boolean") color = isDark ? "#d2a8ff" : "#8250df";
  else if (value === null) color = "var(--text-tertiary)";
  else if (typeof value === "string") color = isDark ? "#a5d6ff" : "#0a3069";

  return (
    <span
      className={`${isMatch ? "rounded px-0.5" : ""}`}
      style={isMatch ? { backgroundColor: "rgba(234, 179, 8, 0.3)" } : undefined}
    >
      <span style={{ color }}>{content}</span>
    </span>
  );
};

const JsonNode = memo(function JsonNode({
  label,
  value,
  depth,
  path,
  onSelect,
  selectedPath,
  filter,
}: NodeProps) {
  const isExpandable = isObject(value) || isArray(value);
  const [open, setOpen] = useState(true);

  const toggle = () => {
    if (isExpandable) {
      setOpen((prev) => !prev);
    }
  };

  const isSelected = selectedPath === path;
  const isLabelMatch =
    filter && label.toLowerCase().includes(filter.toLowerCase());

  return (
    <div
      style={{ paddingLeft: depth === 0 ? 0 : INDENT }}
      className="font-sans text-[11px] leading-tight select-none"
    >
      <div
        className="flex items-center gap-1 cursor-pointer py-px whitespace-nowrap transition-colors"
        style={{
          backgroundColor: isSelected ? "var(--selection)" : undefined,
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = "var(--hover-btn)";
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
        }}
        onClick={() => {
          toggle();
          onSelect?.(path, label, value);
        }}
      >
        {/* Expand/Collapse Icon */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isExpandable ? (
            <span
              className="w-3 h-3 flex items-center justify-center text-[9px] font-bold leading-none"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-secondary)",
              }}
            >
              {open ? "\u2212" : "+"}
            </span>
          ) : (
            <span className="w-3 h-3" />
          )}
        </span>

        {/* Type Icon */}
        <span className="shrink-0 flex items-center justify-center w-4">
          {isObject(value) && (
            <span style={{ color: "var(--accent)" }} className="font-bold">{"{}"}</span>
          )}
          {isArray(value) && (
            <span style={{ color: "var(--accent)", opacity: 0.8 }} className="font-bold">{"[]"}</span>
          )}
          {!isExpandable && typeof value === "number" && (
            <span className="w-2 h-2 shrink-0" style={{ backgroundColor: "var(--success)" }} />
          )}
          {!isExpandable && typeof value === "string" && (
            <span className="w-2 h-2 shrink-0" style={{ backgroundColor: "var(--accent)" }} />
          )}
          {!isExpandable && typeof value === "boolean" && (
            <span className="w-2 h-2 shrink-0" style={{ backgroundColor: "#8250df" }} />
          )}
        </span>

        {/* Label */}
        <span
          className={`font-medium ${isLabelMatch ? "rounded px-0.5" : ""}`}
          style={{
            color: "var(--text-primary)",
            backgroundColor: isLabelMatch ? "rgba(234, 179, 8, 0.3)" : undefined,
          }}
        >
          {label}
        </span>

        {!isExpandable && (
          <>
            <span style={{ color: "var(--text-tertiary)" }} className="mx-1">:</span>
            <PrimitiveValue
              value={value as Exclude<JSONValue, JSONObject | JSONArray>}
              filter={filter}
            />
          </>
        )}
      </div>
      {open && isExpandable && (
        <div
          className="ml-[7px] pl-1"
          style={{ borderLeft: "1px solid var(--border-light)" }}
        >
          {isObject(value)
            ? Object.entries(value).map(([key, child]) => (
                <JsonNode
                  key={key}
                  label={key}
                  value={child}
                  depth={depth + 1}
                  path={path ? `${path}.${key}` : key}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  filter={filter}
                />
              ))
            : (value as JSONArray).map((child, index) => (
                <JsonNode
                  key={index}
                  label={String(index)}
                  value={child}
                  depth={depth + 1}
                  path={`${path}[${index}]`}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  filter={filter}
                />
              ))}
        </div>
      )}
    </div>
  );
});

interface JsonTreeProps {
  value: JSONValue;
  rootLabel?: string;
  onSelect?: (path: string, label: string, value: JSONValue) => void;
  selectedPath?: string;
  filter?: string;
}

export function JsonTree({
  value,
  rootLabel = "JSON",
  onSelect,
  selectedPath,
  filter,
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
      />
    </div>
  );
}
