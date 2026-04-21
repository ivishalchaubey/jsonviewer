"use client";

import type { ReactNode } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { IconClose } from "@/components/ui/icons";

interface DraggableModalProps {
  isOpen: boolean;
  title: string;
  width: number;
  height: number;
  onClose: () => void;
  children: ReactNode;
  /** Optional extra content rendered in the header row below the title */
  headerSlot?: ReactNode;
}

export function DraggableModal({
  isOpen,
  title,
  width,
  height,
  onClose,
  children,
  headerSlot,
}: DraggableModalProps) {
  const { pos, onMouseDown } = useDraggable({ isOpen, width, height });

  if (!isOpen || !pos) return null;

  return (
    <div
      className="fixed z-100 overflow-hidden rounded-lg"
      style={{
        left: pos.x,
        top: pos.y,
        width,
        backgroundColor: "var(--surface)",
        border: "1px solid var(--border)",
        boxShadow: "0 12px 32px var(--modal-shadow)",
      }}
    >
      {/* Title bar */}
      <div
        className="h-9 flex items-center px-3 cursor-move select-none border-b"
        style={{
          backgroundColor: "var(--surface-secondary)",
          borderColor: "var(--border)",
        }}
        onMouseDown={onMouseDown}
      >
        <span
          className="text-[12px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="ml-auto w-6 h-6 rounded flex items-center justify-center transition-colors toolbar-btn"
          style={{ color: "var(--text-tertiary)" }}
        >
          <IconClose />
        </button>
      </div>

      {headerSlot}

      {children}
    </div>
  );
}
