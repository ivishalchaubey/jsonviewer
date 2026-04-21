"use client";

import { useState } from "react";
import { DraggableModal } from "@/components/ui/DraggableModal";

type AboutTab = "about" | "example" | "viewer";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: AboutTab; label: string }[] = [
  { id: "about", label: "About JSON" },
  { id: "example", label: "Example" },
  { id: "viewer", label: "About this viewer" },
];

const SIMPLE_SAMPLE = `{
  "firstName": "John",
  "lastName": "Smith",
  "age": 32,
  "isActive": true
}`;

const COMPLEX_SAMPLE = `{
  "name": "John Smith",
  "age": 32,
  "address": {
    "street": "21 2nd Street",
    "city": "New York",
    "state": "NY",
    "zip": "10021"
  },
  "phoneNumbers": [
    { "type": "home", "number": "212 555-1234" },
    { "type": "mobile", "number": "646 555-4567" }
  ],
  "children": [],
  "spouse": null
}`;

const SHORTCUTS: [string, string][] = [
  ["Ctrl+Space", "Autocomplete"],
  ["Ctrl+F", "Find"],
  ["Ctrl+Z", "Undo"],
  ["Ctrl+Shift+Z", "Redo"],
  ["Tab", "Indent"],
  ["Shift+Tab", "Unindent"],
];

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const [tab, setTab] = useState<AboutTab>("about");

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title="About JSON Viewer"
      width={640}
      height={500}
      headerSlot={
        <div
          className="flex items-center gap-1 px-3 py-2 border-b"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="h-7 px-3 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--surface-secondary)"
                    : "transparent",
                  color: active
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      }
    >
      <div
        className="p-5 max-h-[420px] overflow-auto text-[12px] leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      >
        {tab === "about" && <AboutJsonTab />}
        {tab === "example" && <ExampleTab />}
        {tab === "viewer" && <ViewerTab />}
      </div>
    </DraggableModal>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-[11px] font-mono"
      style={{ backgroundColor: "var(--surface-secondary)" }}
    >
      {children}
    </code>
  );
}

function AboutJsonTab() {
  return (
    <div className="space-y-3">
      <p>
        <strong>JSON</strong> (JavaScript Object Notation) is a lightweight data
        interchange format — easy for humans to read and machines to parse.
      </p>
      <p>JSON is built on two universal data structures:</p>
      <ul className="list-disc ml-5 space-y-1">
        <li>
          <strong>Object</strong> — an unordered collection of key/value pairs in{" "}
          <Chip>{"{ }"}</Chip>. Keys must be strings.
        </li>
        <li>
          <strong>Array</strong> — an ordered list of values in <Chip>[ ]</Chip>.
        </li>
      </ul>
      <p>
        Values can be <Chip>string</Chip>, <Chip>number</Chip>, <Chip>boolean</Chip>,{" "}
        <Chip>null</Chip>, an object, or an array. Structures can nest.
      </p>
      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Read more:{" "}
        <a
          href="https://json.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: "var(--accent)" }}
        >
          json.org
        </a>{" "}
        ·{" "}
        <a
          href="https://datatracker.ietf.org/doc/html/rfc8259"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: "var(--accent)" }}
        >
          RFC 8259
        </a>
      </p>
    </div>
  );
}

function ExampleTab() {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          A simple JSON object:
        </p>
        <pre
          className="border p-3 font-mono text-[11px] rounded-md whitespace-pre overflow-auto"
          style={{
            backgroundColor: "var(--surface-secondary)",
            borderColor: "var(--border-light)",
          }}
        >
          {SIMPLE_SAMPLE}
        </pre>
      </section>
      <section className="space-y-2">
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          A nested example with objects and arrays:
        </p>
        <pre
          className="border p-3 font-mono text-[11px] rounded-md whitespace-pre overflow-auto"
          style={{
            backgroundColor: "var(--surface-secondary)",
            borderColor: "var(--border-light)",
          }}
        >
          {COMPLEX_SAMPLE}
        </pre>
      </section>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="px-1.5 py-0.5 rounded text-[10px] font-mono border"
      style={{
        backgroundColor: "var(--surface-secondary)",
        borderColor: "var(--border)",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </kbd>
  );
}

function ViewerTab() {
  return (
    <div className="space-y-4">
      <p>
        A fast, modern browser-based JSON viewer, editor, formatter, and
        validator. All processing happens locally.
      </p>

      <section>
        <p
          className="font-semibold text-[10px] uppercase tracking-wider mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Features
        </p>
        <ul className="list-disc ml-5 space-y-1 text-[12px]">
          <li>Interactive tree viewer with property inspection</li>
          <li>Syntax-highlighted editor with folding and validation</li>
          <li>Format / minify / copy / load from file or URL</li>
          <li>Search keys &amp; values with live highlights</li>
        </ul>
      </section>

      <section>
        <p
          className="font-semibold text-[10px] uppercase tracking-wider mb-2"
          style={{ color: "var(--text-tertiary)" }}
        >
          Keyboard shortcuts
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          {SHORTCUTS.map(([key, action]) => (
            <div key={key} className="flex items-center gap-2">
              <Kbd>{key}</Kbd>
              <span style={{ color: "var(--text-secondary)" }}>{action}</span>
            </div>
          ))}
        </div>
      </section>

      <section
        className="pt-3 text-[11px]"
        style={{
          borderTop: "1px solid var(--border-light)",
          color: "var(--text-secondary)",
        }}
      >
        Designed &amp; built by{" "}
        <a
          href="https://vishalchaubey.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:underline"
          style={{ color: "var(--accent)" }}
        >
          Vishal Chaubey
        </a>
        . Visit{" "}
        <a
          href="https://vishalchaubey.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: "var(--accent)" }}
        >
          vishalchaubey.com
        </a>{" "}
        for more projects.
      </section>
    </div>
  );
}
