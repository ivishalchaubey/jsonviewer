import type { ReactNode } from "react";

interface ToolbarButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  title?: string;
}

export function ToolbarButton({ onClick, icon, label, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      className="toolbar-btn flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors"
      style={{ color: "var(--text-secondary)" }}
    >
      <span className="shrink-0" style={{ color: "var(--text-tertiary)" }}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
