"use client";

import { DraggableModal } from "@/components/ui/DraggableModal";

interface LoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  url: string;
  onUrlChange: (url: string) => void;
  onUrlLoad: () => void;
  isFetchingUrl: boolean;
  onLoadSample: (type: "simple" | "complex") => void;
}

export function LoadModal({
  isOpen,
  onClose,
  onFileUpload,
  url,
  onUrlChange,
  onUrlLoad,
  isFetchingUrl,
  onLoadSample,
}: LoadModalProps) {
  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="Load JSON"
      width={480}
      height={400}
    >
      <div className="p-5 space-y-5">
        <Section label="Upload file">
          <input
            type="file"
            onChange={onFileUpload}
            accept=".json,application/json"
            className="w-full text-[11px] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:text-[11px] file:font-medium file:cursor-pointer cursor-pointer file-input-themed"
            style={{ color: "var(--text-primary)" }}
          />
        </Section>

        <Section label="Load from URL">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onUrlLoad()}
              placeholder="https://api.example.com/data.json"
              className="flex-1 h-8 border px-2.5 outline-none text-[12px] rounded-md transition-colors"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={onUrlLoad}
              disabled={isFetchingUrl || !url.trim()}
              className="h-8 px-4 rounded-md text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {isFetchingUrl ? "Loading…" : "Load"}
            </button>
          </div>
        </Section>

        <Section label="Try a sample">
          <div className="flex gap-2">
            <SampleButton onClick={() => onLoadSample("simple")} label="Simple" />
            <SampleButton
              onClick={() => onLoadSample("complex")}
              label="Complex"
            />
          </div>
        </Section>
      </div>
    </DraggableModal>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SampleButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-8 border rounded-md text-[12px] font-medium transition-colors toolbar-btn"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        color: "var(--text-primary)",
      }}
    >
      {label}
    </button>
  );
}
