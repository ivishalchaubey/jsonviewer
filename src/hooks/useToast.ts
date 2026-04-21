"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ToastItem {
  id: number;
  message: string;
}

/**
 * Minimal transient toast queue. `show(msg)` appends a toast that
 * auto-dismisses after `duration` ms.
 */
export function useToast(duration = 1800) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, message }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss, duration],
  );

  // Defensive: clear any stragglers on unmount.
  useEffect(() => () => setToasts([]), []);

  return { toasts, show };
}
