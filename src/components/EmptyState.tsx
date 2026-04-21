"use client";

interface EmptyStateProps {
  error: string | null;
  onLoadSample: () => void;
  onOpenLoad: () => void;
}

export function EmptyState({ error, onLoadSample, onOpenLoad }: EmptyStateProps) {
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div
          className="text-[12px] font-semibold"
          style={{ color: "var(--error)" }}
        >
          Invalid JSON
        </div>
        <div
          className="text-[11px] max-w-md break-words"
          style={{ color: "var(--text-secondary)" }}
        >
          {error}
        </div>
        <div
          className="text-[10px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          Switch to the Text tab to fix it.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div
        className="text-[13px] font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        No data loaded yet
      </div>
      <div
        className="text-[11px]"
        style={{ color: "var(--text-secondary)" }}
      >
        Paste JSON, upload a file, or try a sample to get started.
      </div>
      <div className="flex gap-2 mt-1">
        <button
          onClick={onLoadSample}
          className="h-8 px-3 rounded-md text-[12px] font-medium border transition-colors toolbar-btn"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-primary)",
            backgroundColor: "var(--surface-secondary)",
          }}
        >
          Try a sample
        </button>
        <button
          onClick={onOpenLoad}
          className="h-8 px-3 rounded-md text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Load JSON
        </button>
      </div>
    </div>
  );
}
