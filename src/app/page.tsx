"use client";

import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";

import {
  collectMatches,
  type JSONValue,
} from "@/components/JsonTree";
import { LoadingSplash } from "@/components/LoadingSplash";
import { useTheme } from "@/components/ThemeToggle";
import { AppHeader } from "@/components/layout/AppHeader";

type HomeTab = "viewer" | "text";
import { Toolbar } from "@/components/layout/Toolbar";
import { Footer } from "@/components/layout/Footer";
import { ViewerPane } from "@/components/ViewerPane";
import { AboutModal } from "@/components/modals/AboutModal";
import { LoadModal } from "@/components/modals/LoadModal";
import { ToastStack } from "@/components/ui/Toast";
import { useJsonFontSize } from "@/hooks/useJsonFontSize";
import { useToast } from "@/hooks/useToast";

const JsonCodeEditor = dynamic(
  () =>
    import("@/components/JsonCodeEditor").then((mod) => mod.JsonCodeEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex-1 flex items-center justify-center text-[12px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        Loading editor…
      </div>
    ),
  },
);

const SAMPLES = {
  simple: { name: "Sample", value: 123, active: true },
  complex: {
    firstName: "John",
    lastName: "Smith",
    gender: "man",
    age: 32,
    address: { streetAddress: "21 2nd Street", city: "New York" },
    phoneNumbers: [{ type: "home", number: "212 555-1234" }],
  },
} as const;

export default function Home() {
  // ─── State ────────────────────────────────────────────────────────
  const [inputData, setInputData] = useState("");
  const [activeTab, setActiveTab] = useState<HomeTab>("text");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<JSONValue | null>(null);
  const [search, setSearch] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [viewerMatchIndex, setViewerMatchIndex] = useState(-1);
  const [, startTransition] = useTransition();

  const { isDark, toggle: toggleTheme } = useTheme();
  const { toasts, show: showToast } = useToast();
  const jsonFont = useJsonFontSize();

  // Loading / modals
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Loading JSON data…");
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  // URL load state
  const [loadUrl, setLoadUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // ─── Deferred values for snappy typing ────────────────────────────
  const deferredInputData = useDeferredValue(inputData);
  const deferredSearch = useDeferredValue(search);

  // ─── Parse JSON once (gives parsed + error) ──────────────────────
  const { parsed, error } = useMemo(() => {
    if (!deferredInputData.trim()) {
      return { parsed: null as JSONValue | null, error: null as string | null };
    }
    try {
      return {
        parsed: JSON.parse(deferredInputData) as JSONValue,
        error: null as string | null,
      };
    } catch (err) {
      return {
        parsed: null as JSONValue | null,
        error: err instanceof Error ? err.message : "Invalid JSON",
      };
    }
  }, [deferredInputData]);

  // ─── Search derivations ──────────────────────────────────────────
  const searchMatches = useMemo<number[]>(() => {
    const term = deferredSearch.trim();
    if (!term) return [];
    const needle = term.toLowerCase();
    const hay = inputData.toLowerCase();
    const out: number[] = [];
    let i = 0;
    while (true) {
      const idx = hay.indexOf(needle, i);
      if (idx === -1) break;
      out.push(idx);
      i = idx + needle.length;
    }
    return out;
  }, [deferredSearch, inputData]);

  const viewerMatches = useMemo<string[]>(() => {
    const term = deferredSearch.trim();
    if (!term || !parsed) return [];
    return collectMatches(parsed, term, "JSON");
  }, [deferredSearch, parsed]);

  // Reset index whenever match set changes (render-phase sync).
  const [prevSearchMatches, setPrevSearchMatches] = useState(searchMatches);
  if (prevSearchMatches !== searchMatches) {
    setPrevSearchMatches(searchMatches);
    setCurrentMatchIndex(searchMatches.length > 0 ? 0 : -1);
  }
  const [prevViewerMatches, setPrevViewerMatches] = useState(viewerMatches);
  if (prevViewerMatches !== viewerMatches) {
    setPrevViewerMatches(viewerMatches);
    setViewerMatchIndex(viewerMatches.length > 0 ? 0 : -1);
  }

  const currentViewerMatchPath =
    viewerMatchIndex >= 0 ? viewerMatches[viewerMatchIndex] : undefined;

  // ─── Search nav handlers ─────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (activeTab === "text") {
      if (searchMatches.length === 0) return;
      setCurrentMatchIndex((i) => (i + 1) % searchMatches.length);
    } else {
      if (viewerMatches.length === 0) return;
      setViewerMatchIndex((i) => (i + 1) % viewerMatches.length);
    }
  }, [activeTab, searchMatches.length, viewerMatches.length]);

  const handlePrevious = useCallback(() => {
    if (activeTab === "text") {
      if (searchMatches.length === 0) return;
      setCurrentMatchIndex((i) =>
        i <= 0 ? searchMatches.length - 1 : i - 1,
      );
    } else {
      if (viewerMatches.length === 0) return;
      setViewerMatchIndex((i) =>
        i <= 0 ? viewerMatches.length - 1 : i - 1,
      );
    }
  }, [activeTab, searchMatches.length, viewerMatches.length]);

  // ─── Editing handlers ────────────────────────────────────────────
  const clearSelection = useCallback(() => {
    setSelectedPath(null);
    setSelectedValue(null);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputData(value);
      clearSelection();
    },
    [clearSelection],
  );

  const formatJson = useCallback(() => {
    if (!inputData.trim()) return;
    try {
      const data = JSON.parse(inputData) as JSONValue;
      setInputData(JSON.stringify(data, null, 2));
      clearSelection();
      showToast("Formatted");
    } catch {
      showToast("Can't format — invalid JSON");
    }
  }, [clearSelection, inputData, showToast]);

  const minifyJson = useCallback(() => {
    if (!inputData.trim()) return;
    try {
      const data = JSON.parse(inputData) as JSONValue;
      setInputData(JSON.stringify(data));
      clearSelection();
      showToast("Minified");
    } catch {
      setInputData(inputData.replace(/\s/g, ""));
      clearSelection();
      showToast("Stripped whitespace");
    }
  }, [clearSelection, inputData, showToast]);

  const copyToClipboard = useCallback(async () => {
    if (!inputData) {
      showToast("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(inputData);
      showToast("Copied to clipboard");
    } catch {
      showToast("Copy failed");
    }
  }, [inputData, showToast]);

  const clearAll = useCallback(() => {
    setInputData("");
    clearSelection();
    setSearch("");
    setCurrentMatchIndex(-1);
    setViewerMatchIndex(-1);
  }, [clearSelection]);

  // ─── Load handlers ───────────────────────────────────────────────
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setLoadingProgress(0);
      setLoadingMessage(`Loading ${file.name}…`);

      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          setLoadingProgress((event.loaded / event.total) * 100);
        }
      };
      reader.onload = (event) => {
        const content = event.target?.result as string;
        startTransition(() => {
          setInputData(content);
          clearSelection();
          setIsLoadModalOpen(false);
          setActiveTab("viewer");
          setLoadingProgress(100);
          setTimeout(() => {
            setIsLoading(false);
            setLoadingProgress(0);
          }, 300);
        });
      };
      reader.onerror = () => {
        setIsLoading(false);
        alert("Error reading file");
      };
      reader.readAsText(file);
    },
    [clearSelection],
  );

  const handleUrlLoad = useCallback(async () => {
    if (!loadUrl.trim()) return;
    setIsFetchingUrl(true);
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage("Fetching data from URL…");
    try {
      const res = await fetch(loadUrl);
      if (!res.ok) throw new Error("Failed to fetch");
      setLoadingProgress(50);
      const data = await res.json();
      setLoadingProgress(75);
      startTransition(() => {
        setInputData(JSON.stringify(data, null, 2));
        clearSelection();
        setIsLoadModalOpen(false);
        setActiveTab("viewer");
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setIsFetchingUrl(false);
          setLoadingProgress(0);
        }, 300);
      });
    } catch (err) {
      setIsLoading(false);
      setIsFetchingUrl(false);
      alert(
        "Error loading URL: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    }
  }, [clearSelection, loadUrl]);

  const loadSample = useCallback(
    (type: "simple" | "complex") => {
      const data = SAMPLES[type];
      setInputData(JSON.stringify(data, null, 2));
      clearSelection();
      setIsLoadModalOpen(false);
      setActiveTab("viewer");
    },
    [clearSelection],
  );

  // ─── Derived UI values ───────────────────────────────────────────
  const totalMatches =
    activeTab === "text" ? searchMatches.length : viewerMatches.length;
  const currentIndex =
    activeTab === "text" ? currentMatchIndex : viewerMatchIndex;
  const searchPlaceholder =
    activeTab === "text" ? "Find in text…" : "Find keys or values…";
  const displaySelectedPath = selectedPath ?? (parsed ? "JSON" : null);
  const displaySelectedValue = selectedValue ?? parsed;

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-screen font-sans text-[11px]"
      style={{ color: "var(--text-primary)" }}
    >
      {isLoading && (
        <LoadingSplash progress={loadingProgress} message={loadingMessage} />
      )}

      <AppHeader
        activeTab={activeTab}
        isDark={isDark}
        jsonFontSize={jsonFont.fontSize}
        canDecreaseFontSize={jsonFont.canDecrease}
        canIncreaseFontSize={jsonFont.canIncrease}
        onDecreaseFontSize={jsonFont.decrease}
        onIncreaseFontSize={jsonFont.increase}
        onResetFontSize={jsonFont.reset}
        onThemeToggle={toggleTheme}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <Toolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCopy={copyToClipboard}
          onFormat={formatJson}
          onMinify={minifyJson}
          onLoad={() => setIsLoadModalOpen(true)}
          onClear={clearAll}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={searchPlaceholder}
          totalMatches={totalMatches}
          currentIndex={currentIndex}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />

        <div className="flex-1 flex min-h-0 relative">
          {activeTab === "viewer" ? (
            <ViewerPane
              parsed={parsed}
              error={error}
              filter={deferredSearch}
              selectedPath={displaySelectedPath}
              selectedValue={displaySelectedValue}
              currentMatchPath={currentViewerMatchPath}
              fontSize={jsonFont.fontSize}
              onSelect={(path, value) => {
                setSelectedPath(path);
                setSelectedValue(value);
              }}
              onLoadSample={() => loadSample("simple")}
              onOpenLoad={() => setIsLoadModalOpen(true)}
            />
          ) : (
            <div
              className="flex-1 flex flex-col relative min-h-0"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <JsonCodeEditor
                value={inputData}
                onChange={handleInputChange}
                isDark={isDark}
                fontSize={jsonFont.fontSize}
                searchTerm={deferredSearch}
                currentMatchIndex={currentMatchIndex}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />

      <ToastStack toasts={toasts} />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      <LoadModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onFileUpload={handleFileUpload}
        url={loadUrl}
        onUrlChange={setLoadUrl}
        onUrlLoad={handleUrlLoad}
        isFetchingUrl={isFetchingUrl}
        onLoadSample={loadSample}
      />
    </div>
  );
}
