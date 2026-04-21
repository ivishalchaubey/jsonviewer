"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  IconDiff,
  IconFontMinus,
  IconFontPlus,
  IconInfo,
  IconViewer,
} from "@/components/ui/icons";

export type TabId = "viewer" | "text" | "compare";

interface AppHeaderProps {
  activeTab: TabId;
  isDark: boolean;
  jsonFontSize?: number;
  canDecreaseFontSize?: boolean;
  canIncreaseFontSize?: boolean;
  onDecreaseFontSize?: () => void;
  onIncreaseFontSize?: () => void;
  onResetFontSize?: () => void;
  onThemeToggle: () => void;
  onOpenAbout: () => void;
}

export function AppHeader({
  activeTab,
  isDark,
  jsonFontSize,
  canDecreaseFontSize,
  canIncreaseFontSize,
  onDecreaseFontSize,
  onIncreaseFontSize,
  onResetFontSize,
  onThemeToggle,
  onOpenAbout,
}: AppHeaderProps) {
  const onCompare = activeTab === "compare";
  const showFontControls =
    jsonFontSize !== undefined &&
    onDecreaseFontSize &&
    onIncreaseFontSize &&
    onResetFontSize;

  return (
    <header
      className="h-12 shrink-0 flex items-center px-3 gap-2 border-b"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Brand — clickable home link */}
      <Link
        href="/"
        className="flex items-center gap-2 pr-3 mr-1 border-r transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--border)" }}
        aria-label="JSON Viewer — Home"
      >
        <span
          className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] font-mono font-semibold"
          style={{
            backgroundColor: "var(--accent-soft)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          {"{ }"}
        </span>
        <span
          className="text-[13px] font-semibold tracking-tight hidden sm:inline"
          style={{ color: "var(--text-primary)" }}
        >
          JSON Viewer
        </span>
      </Link>

      {/* Primary tool tabs — always visible, clearly the main navigation */}
      <nav
        className="flex items-center gap-1"
        aria-label="Choose a tool"
      >
        <PrimaryTab
          href="/"
          active={!onCompare}
          icon={<IconViewer />}
          label="Viewer"
        />
        <PrimaryTab
          href="/compare"
          active={onCompare}
          icon={<IconDiff />}
          label="Compare"
        />
      </nav>

      {/* Right-side utilities */}
      <div className="ml-auto flex items-center gap-1">
        {showFontControls && (
          <FontSizeControls
            fontSize={jsonFontSize}
            canDecrease={!!canDecreaseFontSize}
            canIncrease={!!canIncreaseFontSize}
            onDecrease={onDecreaseFontSize}
            onIncrease={onIncreaseFontSize}
            onReset={onResetFontSize}
          />
        )}
        <ThemeToggle isDark={isDark} onToggle={onThemeToggle} />
        <button
          onClick={onOpenAbout}
          className="toolbar-btn h-8 w-8 rounded-md flex items-center justify-center transition-colors"
          style={{ color: "var(--text-secondary)" }}
          title="About this tool"
          aria-label="About"
        >
          <IconInfo />
        </button>
      </div>
    </header>
  );
}

function FontSizeControls({
  fontSize,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  onReset,
}: {
  fontSize: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-md border px-1"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface-secondary)",
      }}
      aria-label="JSON font size"
    >
      <span
        className="hidden lg:inline px-2 text-[11px] font-medium"
        style={{ color: "var(--text-tertiary)" }}
      >
        Zoom
      </span>
      <IconButton
        label="Decrease JSON font size"
        disabled={!canDecrease}
        onClick={onDecrease}
      >
        <IconFontMinus />
      </IconButton>
      <button
        className="h-7 min-w-12 px-2 rounded text-[11px] font-mono font-medium toolbar-btn"
        style={{
          color: "var(--text-secondary)",
        }}
        title="Reset JSON font size"
        onClick={onReset}
      >
        {fontSize}px
      </button>
      <IconButton
        label="Increase JSON font size"
        disabled={!canIncrease}
        onClick={onIncrease}
      >
        <IconFontPlus />
      </IconButton>
      <button
        className="toolbar-btn h-7 px-2 rounded text-[11px] font-medium hidden sm:inline-flex items-center"
        style={{ color: "var(--text-secondary)" }}
        title="Reset JSON font size"
        aria-label="Reset JSON font size"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className="toolbar-btn h-7 w-7 rounded flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: "var(--text-secondary)" }}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PrimaryTab({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="h-8 px-3 rounded-md flex items-center gap-1.5 text-[12px] font-medium transition-colors toolbar-btn"
      style={{
        backgroundColor: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      <span
        className="shrink-0"
        style={{ color: active ? "var(--accent)" : "var(--text-tertiary)" }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
