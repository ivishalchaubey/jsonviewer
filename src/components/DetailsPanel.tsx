"use client";

import type { JSONObject, JSONValue } from "@/components/JsonTree";

interface DetailsPanelProps {
  value: JSONValue | null;
  fontSize?: number;
}

export function DetailsPanel({ value, fontSize = 13 }: DetailsPanelProps) {
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-w-105"
      style={{ backgroundColor: "var(--surface)", fontSize }}
    >
      {/* Column headers */}
      <div
        className="flex h-6 border-b text-[11px] font-medium select-none"
        style={{
          backgroundColor: "var(--surface-secondary)",
          borderColor: "var(--border-light)",
        }}
      >
        <div
          className="flex-1 px-2 border-r flex items-center gap-1"
          style={{
            borderColor: "var(--border-light)",
            color: "var(--text-primary)",
          }}
        >
          Name
          <span
            className="text-[8px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            ▲
          </span>
        </div>
        <div
          className="w-[150px] px-2 flex items-center"
          style={{ color: "var(--text-primary)" }}
        >
          Value
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-auto">
        <DetailsBody value={value} fontSize={fontSize} />
      </div>
    </div>
  );
}

function DetailsBody({
  value,
  fontSize,
}: {
  value: JSONValue | null;
  fontSize: number;
}) {
  if (value === null || value === undefined) {
    return (
      <div
        className="p-4 text-center italic text-[11px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Select a node to view properties
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <>
        {Object.entries(value as JSONObject).map(([key, val]) => (
          <div
            key={key}
            className="flex border-b items-center detail-row"
            style={{
              borderColor: "var(--border-light)",
              minHeight: Math.max(22, fontSize + 10),
              fontSize: Math.max(10, fontSize - 2),
            }}
          >
            <div
              className="flex-1 px-2 border-r font-medium truncate"
              style={{
                borderColor: "var(--border-light)",
                color: "var(--text-primary)",
              }}
            >
              {key}
            </div>
            <div
              className="w-[150px] px-2 truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {typeof val === "object" && val !== null ? "…" : String(val)}
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <div
      className="flex items-center"
      style={{
        backgroundColor: "var(--selection)",
        minHeight: Math.max(22, fontSize + 10),
        fontSize: Math.max(10, fontSize - 2),
      }}
    >
      <div
        className="flex-1 px-2 border-r font-medium truncate"
        style={{
          borderColor: "var(--selection)",
          color: "var(--text-primary)",
        }}
      >
        Value
      </div>
      <div
        className="w-[150px] px-2 truncate font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {String(value)}
      </div>
    </div>
  );
}
