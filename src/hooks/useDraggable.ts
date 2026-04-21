"use client";

import { useCallback, useEffect, useState } from "react";

export interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  isOpen: boolean;
  width: number;
  height: number;
}

/**
 * Manages a floating/draggable element's position. Returns the position and
 * handlers to wire up a drag handle. Centers the element on first open.
 */
export function useDraggable({ isOpen, width, height }: UseDraggableOptions) {
  const [pos, setPos] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 });

  // Center on first open via render-phase sync.
  const [prevOpen, setPrevOpen] = useState(false);
  if (isOpen && !prevOpen) {
    setPrevOpen(true);
    if (!pos && typeof window !== "undefined") {
      setPos({
        x: Math.max(0, Math.round((window.innerWidth - width) / 2)),
        y: Math.max(0, Math.round((window.innerHeight - height) / 2)),
      });
    }
  } else if (!isOpen && prevOpen) {
    setPrevOpen(false);
  }

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pos) return;
      setDragging(true);
      setOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    },
    [pos],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, offset.x, offset.y]);

  return { pos, onMouseDown };
}
