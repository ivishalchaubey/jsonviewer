"use client";

import { useState, memo, useMemo } from "react";

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

  return (
    <span className={`${isMatch ? "bg-yellow-200" : ""}`}>
      <span className="text-black">{content}</span>
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

  // Auto-expand if child matches filter
  // if (!filter) return false;
  // const f = filter.toLowerCase();
  // if (label.toLowerCase().includes(f)) return true;
  // if (!isExpandable) return String(value).toLowerCase().includes(f);
  // return JSON.stringify(value).toLowerCase().includes(f);

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
        className={`flex items-center gap-1 cursor-pointer py-[1px] whitespace-nowrap transition-colors ${
          isSelected ? "bg-[#cee6ff]" : "hover:bg-[#f2f6fa]"
        }`}
        onClick={() => {
          toggle();
          onSelect?.(path, label, value);
        }}
      >
        {/* Expand/Collapse Icon */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isExpandable ? (
            <span className="border border-gray-400 bg-white w-3 h-3 flex items-center justify-center text-[9px] text-gray-600 font-bold leading-none">
              {open ? "−" : "+"}
            </span>
          ) : (
            <span className="w-3 h-3" />
          )}
        </span>

        {/* Type Icon */}
        <span className="shrink-0 flex items-center justify-center w-4">
          {isObject(value) && (
            <span className="text-blue-800 font-bold">{"{}"}</span>
          )}
          {isArray(value) && (
            <span className="text-blue-600 font-bold">{"[]"}</span>
          )}
          {!isExpandable && typeof value === "number" && (
            <span className="w-2 h-2 bg-green-600 shrink-0" />
          )}
          {!isExpandable && typeof value === "string" && (
            <span className="w-2 h-2 bg-blue-600 shrink-0" />
          )}
          {!isExpandable && typeof value === "boolean" && (
            <span className="w-2 h-2 bg-purple-600 shrink-0" />
          )}
        </span>

        {/* Label */}
        <span
          className={`font-medium ${isSelected ? "text-black" : "text-black"} ${
            isLabelMatch ? "bg-yellow-200" : ""
          }`}
        >
          {label}
        </span>

        {!isExpandable && (
          <>
            <span className="text-gray-400 mx-1">:</span>
            <PrimitiveValue
              value={value as Exclude<JSONValue, JSONObject | JSONArray>}
              filter={filter}
            />
          </>
        )}
      </div>
      {open && isExpandable && (
        <div className="border-l border-gray-100 ml-[7px] pl-1">
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
