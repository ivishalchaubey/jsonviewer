"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { linter, lintGutter, Diagnostic } from "@codemirror/lint";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import {
  search,
  highlightSelectionMatches,
  openSearchPanel,
  searchKeymap,
} from "@codemirror/search";
import {
  keymap,
  highlightSpecialChars,
  highlightActiveLine,
  dropCursor,
  lineNumbers,
  highlightActiveLineGutter,
  EditorView,
} from "@codemirror/view";
import {
  indentOnInput,
  bracketMatching,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
  HighlightStyle,
  defaultHighlightStyle,
  indentUnit,
} from "@codemirror/language";
import {
  EditorState,
  Extension,
} from "@codemirror/state";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { tags } from "@lezer/highlight";

// ─── Custom JSON Linter ───────────────────────────────────────────────
function jsonLinter(view: EditorView): Diagnostic[] {
  const doc = view.state.doc.toString();
  if (!doc.trim()) return [];

  try {
    JSON.parse(doc);
    return [];
  } catch (e) {
    if (!(e instanceof SyntaxError)) return [];

    const message = e.message;
    const posMatch = message.match(/at position (\d+)/);
    const lineColMatch = message.match(/line (\d+) column (\d+)/);

    let from = 0;
    let to = 0;

    if (posMatch) {
      from = Math.min(parseInt(posMatch[1], 10), doc.length);
      to = Math.min(from + 1, doc.length);
    } else if (lineColMatch) {
      const line = parseInt(lineColMatch[1], 10);
      const col = parseInt(lineColMatch[2], 10);
      const lineInfo = view.state.doc.line(
        Math.min(line, view.state.doc.lines)
      );
      from = Math.min(lineInfo.from + col - 1, doc.length);
      to = Math.min(from + 1, doc.length);
    } else {
      from = findErrorPosition(doc);
      to = Math.min(from + 10, doc.length);
    }

    if (from >= doc.length) from = Math.max(0, doc.length - 1);
    if (to <= from) to = Math.min(from + 1, doc.length);
    if (from < 0) from = 0;

    const cleanMessage = message
      .replace(/^JSON\.parse: /, "")
      .replace(/in JSON at position \d+/, "")
      .trim();

    return [
      {
        from,
        to,
        severity: "error",
        message: cleanMessage || "Invalid JSON",
        source: "json-lint",
      },
    ];
  }
}

function findErrorPosition(doc: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < doc.length; i++) {
    const ch = doc[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") depth++;
    if (ch === "}" || ch === "]") {
      depth--;
      if (depth < 0) return i;
    }
  }
  return Math.max(0, doc.length - 1);
}

// ─── JSON Autocomplete (context-aware, no noise) ─────────────────────
function jsonCompletionSource(
  context: CompletionContext
): CompletionResult | null {
  // Only trigger on explicit invoke (Ctrl+Space) or after : { , [
  if (!context.explicit) {
    // Check if we're right after a trigger character
    const charBefore = context.state.doc.sliceString(
      Math.max(0, context.pos - 1),
      context.pos
    );
    if (charBefore !== ":" && charBefore !== "{" && charBefore !== "," && charBefore !== "[") {
      // Also allow when typing a keyword like tru/fals/nul after colon
      const lineBefore = context.state.doc
        .lineAt(context.pos)
        .text.slice(0, context.pos - context.state.doc.lineAt(context.pos).from);
      const afterColonTyping = /:\s*\w+$/.test(lineBefore);
      if (!afterColonTyping) return null;
    }
  }

  const { state, pos } = context;
  const doc = state.doc.toString();
  const line = state.doc.lineAt(pos);
  const lineBefore = line.text.slice(0, pos - line.from);

  const isInString = isInsideString(doc, pos);
  if (isInString) return null;

  // After colon — suggest values
  if (/:\s*\w*$/.test(lineBefore)) {
    const word = context.matchBefore(/\w*/);
    const from = word ? word.from : pos;

    return {
      from,
      filter: true,
      options: [
        { label: "true", type: "keyword", detail: "Boolean" },
        { label: "false", type: "keyword", detail: "Boolean" },
        { label: "null", type: "keyword", detail: "Null" },
        { label: '""', type: "text", detail: "String", apply: '""' },
        { label: "0", type: "constant", detail: "Number" },
        { label: "{}", type: "type", detail: "Object", apply: "{}" },
        { label: "[]", type: "type", detail: "Array", apply: "[]" },
      ],
    };
  }

  // After { or , on a new line — suggest keys from existing document
  if (/[{,]\s*$/.test(lineBefore) || /^\s*$/.test(lineBefore)) {
    // Only suggest if we're inside an object context
    const existingKeys = extractExistingKeys(doc);
    if (existingKeys.length === 0) return null;

    return {
      from: pos,
      options: existingKeys.map((key, i) => ({
        label: `"${key}"`,
        type: "property",
        detail: "Key",
        apply: `"${key}": `,
        boost: existingKeys.length - i,
      })),
    };
  }

  // After [ — suggest value types
  if (/\[\s*$/.test(lineBefore)) {
    return {
      from: pos,
      options: [
        { label: '""', type: "text", detail: "String", apply: '""' },
        { label: "true", type: "keyword", detail: "Boolean" },
        { label: "false", type: "keyword", detail: "Boolean" },
        { label: "null", type: "keyword", detail: "Null" },
        { label: "{}", type: "type", detail: "Object", apply: "{}" },
        { label: "[]", type: "type", detail: "Array", apply: "[]" },
      ],
    };
  }

  return null;
}

function isInsideString(doc: string, pos: number): boolean {
  let inString = false;
  for (let i = 0; i < pos && i < doc.length; i++) {
    if (doc[i] === '"' && (i === 0 || doc[i - 1] !== "\\")) {
      inString = !inString;
    }
  }
  return inString;
}

function extractExistingKeys(doc: string): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  const regex = /"([^"\\]*)"\s*:/g;
  let match;
  while ((match = regex.exec(doc)) !== null) {
    const key = match[1];
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

// ─── Light Theme ──────────────────────────────────────────────────────
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "#0550ae", fontWeight: "600" },
  { tag: tags.string, color: "#0a3069" },
  { tag: tags.number, color: "#0550ae" },
  { tag: tags.bool, color: "#cf222e" },
  { tag: tags.null, color: "#8250df" },
  { tag: tags.punctuation, color: "#57606a" },
  { tag: tags.brace, color: "#0550ae", fontWeight: "600" },
  { tag: tags.squareBracket, color: "#0550ae", fontWeight: "600" },
]);

const lightEditorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      fontFamily:
        'var(--font-geist-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      height: "100%",
      backgroundColor: "#ffffff",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": { padding: "8px 0", caretColor: "#0550ae" },
    ".cm-cursor": { borderLeftColor: "#0550ae", borderLeftWidth: "2px" },
    ".cm-gutters": {
      backgroundColor: "#f6f8fa",
      borderRight: "1px solid #d0d7de",
      color: "#8c959f",
      minWidth: "40px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 4px",
      minWidth: "32px",
      fontSize: "11px",
      fontFamily: "inherit",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#eaeef2",
      color: "#24292f",
      fontWeight: "600",
    },
    ".cm-activeLine": { backgroundColor: "#f6f8fa80" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#add6ff80 !important",
    },
    ".cm-selectionMatch": { backgroundColor: "#e8e0ff" },
    ".cm-matchingBracket": {
      backgroundColor: "#afd7ff",
      outline: "1px solid #0969da",
      color: "#0550ae !important",
      fontWeight: "700",
    },
    ".cm-nonmatchingBracket": {
      backgroundColor: "#ffebe9",
      outline: "1px solid #cf222e",
      color: "#cf222e !important",
    },
    ".cm-foldGutter .cm-gutterElement": {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#8c959f",
      padding: "0 2px",
      cursor: "pointer",
      transition: "color 0.15s",
    },
    ".cm-foldGutter .cm-gutterElement:hover": { color: "#0550ae" },
    ".cm-lint-marker": { width: "8px !important", height: "8px !important" },
    ".cm-lint-marker-error": {
      content: "none !important",
      background: "#cf222e !important",
      borderRadius: "50%",
      width: "8px !important",
      height: "8px !important",
      display: "inline-block",
    },
    ".cm-lintRange-error": {
      backgroundImage: "none",
      textDecoration: "wavy underline #cf222e",
      textDecorationSkipInk: "none",
      textUnderlineOffset: "3px",
    },
    ".cm-tooltip": {
      border: "1px solid #d0d7de",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      backgroundColor: "#ffffff",
      overflow: "hidden",
    },
    ".cm-tooltip-lint": { padding: "0" },
    ".cm-diagnostic": {
      padding: "8px 12px",
      borderLeft: "none",
      fontSize: "12px",
      lineHeight: "1.5",
    },
    ".cm-diagnostic-error": {
      borderLeft: "3px solid #cf222e",
      backgroundColor: "#ffebe9",
      color: "#82071e",
    },
    ".cm-tooltip-autocomplete": {
      borderRadius: "8px",
      border: "1px solid #d0d7de",
      boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
      overflow: "hidden",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
      fontFamily: "inherit",
      fontSize: "12px",
      maxHeight: "200px",
    },
    ".cm-tooltip-autocomplete ul li": {
      padding: "4px 10px !important",
      borderBottom: "1px solid #f0f0f0",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#ddf4ff",
      color: "#0550ae",
    },
    ".cm-completionLabel": { fontWeight: "500" },
    ".cm-completionDetail": {
      fontStyle: "normal",
      color: "#8c959f",
      fontSize: "11px",
      marginLeft: "8px",
    },
    ".cm-panels": {
      backgroundColor: "#f6f8fa",
      borderBottom: "1px solid #d0d7de",
    },
    ".cm-search": { padding: "6px 10px", fontSize: "12px" },
    ".cm-search input": {
      border: "1px solid #d0d7de",
      borderRadius: "4px",
      padding: "2px 6px",
      fontSize: "12px",
      outline: "none",
    },
    ".cm-search input:focus": {
      borderColor: "#0969da",
      boxShadow: "0 0 0 3px rgba(9,105,218,0.15)",
    },
    ".cm-search button": {
      borderRadius: "4px",
      padding: "2px 8px",
      fontSize: "11px",
      border: "1px solid #d0d7de",
      backgroundColor: "#ffffff",
      cursor: "pointer",
    },
    ".cm-search button:hover": { backgroundColor: "#f3f4f6" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#ddf4ff",
      border: "1px solid #54aeff",
      borderRadius: "4px",
      color: "#0550ae",
      padding: "0 6px",
      fontSize: "10px",
      fontWeight: "600",
      margin: "0 2px",
      cursor: "pointer",
    },
    ".cm-scroller": { overflow: "auto", fontFamily: "inherit" },
    ".cm-scroller::-webkit-scrollbar": { width: "8px", height: "8px" },
    ".cm-scroller::-webkit-scrollbar-track": { background: "#f6f8fa" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#d0d7de",
      borderRadius: "4px",
      border: "2px solid #f6f8fa",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": { background: "#8c959f" },
  },
  { dark: false }
);

// ─── Dark Theme ───────────────────────────────────────────────────────
const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "#79c0ff", fontWeight: "600" },
  { tag: tags.string, color: "#a5d6ff" },
  { tag: tags.number, color: "#79c0ff" },
  { tag: tags.bool, color: "#ff7b72" },
  { tag: tags.null, color: "#d2a8ff" },
  { tag: tags.punctuation, color: "#8b949e" },
  { tag: tags.brace, color: "#79c0ff", fontWeight: "600" },
  { tag: tags.squareBracket, color: "#79c0ff", fontWeight: "600" },
]);

const darkEditorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      fontFamily:
        'var(--font-geist-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      height: "100%",
      backgroundColor: "#0d1117",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-content": { padding: "8px 0", caretColor: "#58a6ff" },
    ".cm-cursor": { borderLeftColor: "#58a6ff", borderLeftWidth: "2px" },
    ".cm-gutters": {
      backgroundColor: "#161b22",
      borderRight: "1px solid #21262d",
      color: "#484f58",
      minWidth: "40px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 4px",
      minWidth: "32px",
      fontSize: "11px",
      fontFamily: "inherit",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#1c2128",
      color: "#e6edf3",
      fontWeight: "600",
    },
    ".cm-activeLine": { backgroundColor: "#161b2280" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#1a3a5c !important",
    },
    ".cm-selectionMatch": { backgroundColor: "#2a2050" },
    ".cm-matchingBracket": {
      backgroundColor: "#1a3a5c",
      outline: "1px solid #58a6ff",
      color: "#79c0ff !important",
      fontWeight: "700",
    },
    ".cm-nonmatchingBracket": {
      backgroundColor: "#3d1f20",
      outline: "1px solid #f85149",
      color: "#f85149 !important",
    },
    ".cm-foldGutter .cm-gutterElement": {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#484f58",
      padding: "0 2px",
      cursor: "pointer",
      transition: "color 0.15s",
    },
    ".cm-foldGutter .cm-gutterElement:hover": { color: "#58a6ff" },
    ".cm-lint-marker": { width: "8px !important", height: "8px !important" },
    ".cm-lint-marker-error": {
      content: "none !important",
      background: "#f85149 !important",
      borderRadius: "50%",
      width: "8px !important",
      height: "8px !important",
      display: "inline-block",
    },
    ".cm-lintRange-error": {
      backgroundImage: "none",
      textDecoration: "wavy underline #f85149",
      textDecorationSkipInk: "none",
      textUnderlineOffset: "3px",
    },
    ".cm-tooltip": {
      border: "1px solid #30363d",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      backgroundColor: "#161b22",
      color: "#e6edf3",
      overflow: "hidden",
    },
    ".cm-tooltip-lint": { padding: "0" },
    ".cm-diagnostic": {
      padding: "8px 12px",
      borderLeft: "none",
      fontSize: "12px",
      lineHeight: "1.5",
    },
    ".cm-diagnostic-error": {
      borderLeft: "3px solid #f85149",
      backgroundColor: "#3d1f20",
      color: "#ffa198",
    },
    ".cm-tooltip-autocomplete": {
      borderRadius: "8px",
      border: "1px solid #30363d",
      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      overflow: "hidden",
    },
    ".cm-tooltip.cm-tooltip-autocomplete > ul": {
      fontFamily: "inherit",
      fontSize: "12px",
      maxHeight: "200px",
    },
    ".cm-tooltip-autocomplete ul li": {
      padding: "4px 10px !important",
      borderBottom: "1px solid #21262d",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#1a3a5c",
      color: "#58a6ff",
    },
    ".cm-completionLabel": { fontWeight: "500" },
    ".cm-completionDetail": {
      fontStyle: "normal",
      color: "#6e7681",
      fontSize: "11px",
      marginLeft: "8px",
    },
    ".cm-panels": {
      backgroundColor: "#161b22",
      borderBottom: "1px solid #30363d",
    },
    ".cm-search": { padding: "6px 10px", fontSize: "12px" },
    ".cm-search input": {
      border: "1px solid #30363d",
      borderRadius: "4px",
      padding: "2px 6px",
      fontSize: "12px",
      outline: "none",
      backgroundColor: "#0d1117",
      color: "#e6edf3",
    },
    ".cm-search input:focus": {
      borderColor: "#58a6ff",
      boxShadow: "0 0 0 3px rgba(88,166,255,0.15)",
    },
    ".cm-search button": {
      borderRadius: "4px",
      padding: "2px 8px",
      fontSize: "11px",
      border: "1px solid #30363d",
      backgroundColor: "#21262d",
      color: "#e6edf3",
      cursor: "pointer",
    },
    ".cm-search button:hover": { backgroundColor: "#30363d" },
    ".cm-search label": { color: "#8b949e" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#1a3a5c",
      border: "1px solid #388bfd",
      borderRadius: "4px",
      color: "#58a6ff",
      padding: "0 6px",
      fontSize: "10px",
      fontWeight: "600",
      margin: "0 2px",
      cursor: "pointer",
    },
    ".cm-scroller": { overflow: "auto", fontFamily: "inherit" },
    ".cm-scroller::-webkit-scrollbar": { width: "8px", height: "8px" },
    ".cm-scroller::-webkit-scrollbar-track": { background: "#0d1117" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#30363d",
      borderRadius: "4px",
      border: "2px solid #0d1117",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": { background: "#484f58" },
  },
  { dark: true }
);

// ─── Editor Component ─────────────────────────────────────────────────

interface JsonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  isDark?: boolean;
}

interface EditorStats {
  line: number;
  col: number;
  lines: number;
  chars: number;
  errors: number;
  selection: number;
}

export function JsonCodeEditor({ value, onChange, isDark = false }: JsonCodeEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [stats, setStats] = useState<EditorStats>({
    line: 1,
    col: 1,
    lines: 1,
    chars: 0,
    errors: 0,
    selection: 0,
  });

  const errorCount = useMemo(() => {
    if (!value.trim()) return 0;
    try {
      JSON.parse(value);
      return 0;
    } catch {
      return 1;
    }
  }, [value]);

  useEffect(() => {
    setStats((prev) => ({ ...prev, errors: errorCount }));
  }, [errorCount]);

  const extensions = useMemo<Extension[]>(() => {
    return [
      // ── Keymaps (must come first for proper priority) ──
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),

      // ── Core editing ──
      history(),
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      highlightActiveLine(),
      dropCursor(),
      indentOnInput(),
      indentUnit.of("  "),
      EditorState.tabSize.of(2),

      // ── Auto-close brackets, braces, quotes ──
      closeBrackets(),

      // ── JSON language ──
      json(),

      // ── Syntax highlighting ──
      syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

      // ── Bracket matching ──
      bracketMatching(),

      // ── Code folding ──
      foldGutter({
        markerDOM: (open) => {
          const el = document.createElement("span");
          el.textContent = open ? "\u25BE" : "\u25B8";
          el.style.cursor = "pointer";
          el.style.userSelect = "none";
          return el;
        },
      }),

      // ── Linting ──
      lintGutter(),
      linter(jsonLinter, { delay: 300 }),

      // ── Autocomplete (only on explicit trigger or after : { , [) ──
      autocompletion({
        override: [jsonCompletionSource],
        activateOnTyping: false,
        icons: false,
      }),

      // ── Search ──
      search({ top: true }),
      highlightSelectionMatches(),

      // ── Line wrapping ──
      EditorView.lineWrapping,

      // ── Cursor stats listener ──
      EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          const st = update.state;
          const cursor = st.selection.main.head;
          const line = st.doc.lineAt(cursor);
          const sel = st.selection.main;
          setStats({
            line: line.number,
            col: cursor - line.from + 1,
            lines: st.doc.lines,
            chars: st.doc.length,
            errors: errorCount,
            selection: Math.abs(sel.to - sel.from),
          });
        }
      }),

      // ── Theme ──
      isDark ? darkEditorTheme : lightEditorTheme,
    ];
  }, [errorCount, isDark]);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "f") {
      e.preventDefault();
      const view = editorRef.current?.view;
      if (view) openSearchPanel(view);
    }
  }, []);

  const formatSize = (chars: number): string => {
    if (chars < 1024) return `${chars} B`;
    if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)} KB`;
    return `${(chars / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={handleChange}
          extensions={extensions}
          placeholder="Paste or type your JSON here..."
          basicSetup={false}
          height="100%"
          style={{ height: "100%" }}
          theme={isDark ? "dark" : "light"}
        />
      </div>

      {/* Status Bar */}
      <div
        className="h-6 shrink-0 flex items-center px-3 gap-4 text-[11px] font-mono select-none"
        style={{
          backgroundColor: "var(--status-bar-bg)",
          borderTop: "1px solid var(--status-bar-border)",
        }}
      >
        <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
          <span>
            Ln {stats.line}, Col {stats.col}
          </span>
          {stats.selection > 0 && (
            <span style={{ color: "var(--accent)" }}>
              ({stats.selection} selected)
            </span>
          )}
        </div>

        <div className="flex-1 flex justify-center">
          {value.trim() ? (
            stats.errors > 0 ? (
              <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--error)" }}>
                <span
                  className="inline-block w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: "var(--error)" }}
                />
                {stats.errors} error{stats.errors > 1 ? "s" : ""} found
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--success)" }}>
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: "var(--success)" }}
                />
                Valid JSON
              </span>
            )
          ) : (
            <span style={{ color: "var(--text-tertiary)" }}>Ready</span>
          )}
        </div>

        <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
          <span>{stats.lines} lines</span>
          <span>{formatSize(stats.chars)}</span>
          <span style={{ color: "var(--text-tertiary)" }}>JSON</span>
        </div>
      </div>
    </div>
  );
}
