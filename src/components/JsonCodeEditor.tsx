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

// ─── Custom Theme ─────────────────────────────────────────────────────
const futuristicHighlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "#0550ae", fontWeight: "600" },
  { tag: tags.string, color: "#0a3069" },
  { tag: tags.number, color: "#0550ae" },
  { tag: tags.bool, color: "#cf222e" },
  { tag: tags.null, color: "#8250df" },
  { tag: tags.punctuation, color: "#57606a" },
  { tag: tags.brace, color: "#0550ae", fontWeight: "600" },
  { tag: tags.squareBracket, color: "#0550ae", fontWeight: "600" },
]);

const editorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "13px",
      fontFamily:
        'var(--font-geist-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      height: "100%",
      backgroundColor: "#ffffff",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-content": {
      padding: "8px 0",
      caretColor: "#0550ae",
    },
    ".cm-cursor": {
      borderLeftColor: "#0550ae",
      borderLeftWidth: "2px",
    },
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
    ".cm-activeLine": {
      backgroundColor: "#f6f8fa80",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#add6ff80 !important",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#e8e0ff",
    },
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
    ".cm-foldGutter .cm-gutterElement:hover": {
      color: "#0550ae",
    },
    ".cm-lint-marker": {
      width: "8px !important",
      height: "8px !important",
    },
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
    ".cm-tooltip-lint": {
      padding: "0",
    },
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
    ".cm-completionLabel": {
      fontWeight: "500",
    },
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
    ".cm-search": {
      padding: "6px 10px",
      fontSize: "12px",
    },
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
    ".cm-search button:hover": {
      backgroundColor: "#f3f4f6",
    },
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
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "inherit",
    },
    ".cm-scroller::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    ".cm-scroller::-webkit-scrollbar-track": {
      background: "#f6f8fa",
    },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#d0d7de",
      borderRadius: "4px",
      border: "2px solid #f6f8fa",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
      background: "#8c959f",
    },
  },
  { dark: false }
);

// ─── Editor Component ─────────────────────────────────────────────────

interface JsonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
}

interface EditorStats {
  line: number;
  col: number;
  lines: number;
  chars: number;
  errors: number;
  selection: number;
}

export function JsonCodeEditor({ value, onChange }: JsonCodeEditorProps) {
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
      syntaxHighlighting(futuristicHighlightStyle),
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
      editorTheme,
    ];
  }, [errorCount]);

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
        />
      </div>

      {/* Status Bar */}
      <div className="h-6 shrink-0 flex items-center px-3 gap-4 bg-[#f6f8fa] border-t border-[#d0d7de] text-[11px] font-mono select-none">
        <div className="flex items-center gap-3 text-[#57606a]">
          <span>
            Ln {stats.line}, Col {stats.col}
          </span>
          {stats.selection > 0 && (
            <span className="text-[#0550ae]">
              ({stats.selection} selected)
            </span>
          )}
        </div>

        <div className="flex-1 flex justify-center">
          {value.trim() ? (
            stats.errors > 0 ? (
              <span className="flex items-center gap-1.5 text-[#cf222e] font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-[#cf222e] animate-pulse" />
                {stats.errors} error{stats.errors > 1 ? "s" : ""} found
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[#1a7f37] font-medium">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1a7f37]" />
                Valid JSON
              </span>
            )
          ) : (
            <span className="text-[#8c959f]">Ready</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[#57606a]">
          <span>{stats.lines} lines</span>
          <span>{formatSize(stats.chars)}</span>
          <span className="text-[#8c959f]">JSON</span>
        </div>
      </div>
    </div>
  );
}
