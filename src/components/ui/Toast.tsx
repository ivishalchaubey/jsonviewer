"use client";

import type { ToastItem } from "@/hooks/useToast";

interface ToastStackProps {
  toasts: ToastItem[];
}

export function ToastStack({ toasts }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter px-3.5 py-2 rounded-lg text-[12px] font-medium shadow-lg"
          style={{
            backgroundColor: "var(--text-primary)",
            color: "var(--surface)",
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
