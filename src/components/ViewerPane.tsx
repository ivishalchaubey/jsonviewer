"use client";

import { useEffect, useState } from "react";
import { JsonTree, type JSONValue } from "@/components/JsonTree";
import { DetailsPanel } from "@/components/DetailsPanel";
import { EmptyState } from "@/components/EmptyState";

const DEFAULT_TREE_WIDTH = "69%";
const MIN_TREE_WIDTH = 260;
const MIN_DETAILS_WIDTH = 420;

interface ViewerPaneProps {
  parsed: JSONValue | null;
  error: string | null;
  filter: string;
  selectedPath: string | null;
  selectedValue: JSONValue | null;
  currentMatchPath?: string;
  fontSize?: number;
  onSelect: (path: string, value: JSONValue) => void;
  onLoadSample: () => void;
  onOpenLoad: () => void;
}

export function ViewerPane({
  parsed,
  error,
  filter,
  selectedPath,
  selectedValue,
  currentMatchPath,
  fontSize = 13,
  onSelect,
  onLoadSample,
  onOpenLoad,
}: ViewerPaneProps) {
  const [treeWidth, setTreeWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      setTreeWidth(
        Math.max(
          MIN_TREE_WIDTH,
          Math.min(e.clientX - 10, window.innerWidth - MIN_DETAILS_WIDTH),
        ),
      );
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
      className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div
        className="shrink-0 overflow-auto p-2"
        style={{
          flexBasis: treeWidth ?? DEFAULT_TREE_WIDTH,
          minWidth: MIN_TREE_WIDTH,
          maxWidth: `calc(100% - ${MIN_DETAILS_WIDTH}px)`,
          backgroundColor: "var(--surface)",
          borderRight: "1px solid var(--border-light)",
        }}
      >
        {parsed ? (
          <JsonTree
            value={parsed}
            rootLabel="JSON"
            selectedPath={selectedPath ?? undefined}
            filter={filter}
            currentMatchPath={currentMatchPath}
            fontSize={fontSize}
            onSelect={(path, _label, value) => onSelect(path, value)}
          />
        ) : (
          <EmptyState
            error={error}
            onLoadSample={onLoadSample}
            onOpenLoad={onOpenLoad}
          />
        )}
      </div>

      <div
        className="w-0.5 cursor-col-resize transition-colors shrink-0"
        style={{
          backgroundColor: isResizing ? "var(--accent)" : "var(--border)",
        }}
        onMouseDown={() => setIsResizing(true)}
      />

      <DetailsPanel value={selectedValue} fontSize={fontSize} />
    </div>
  );
}
