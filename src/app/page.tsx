"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useTransition,
  useDeferredValue,
} from "react";
import {
  JsonTree,
  JSONValue,
  JSONObject,
  collectMatches,
} from "@/components/JsonTree";
import { LoadingSplash } from "@/components/LoadingSplash";
import dynamic from "next/dynamic";

const JsonCodeEditor = dynamic(
  () =>
    import("@/components/JsonCodeEditor").then((mod) => mod.JsonCodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-[12px]">
        Loading editor...
      </div>
    ),
  }
);

export default function Home() {
  const [inputData, setInputData] = useState("");
  const [activeTab, setActiveTab] = useState<"viewer" | "text">("text");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<JSONValue | null>(null);
  const [search, setSearch] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [viewerMatches, setViewerMatches] = useState<string[]>([]);
  const [viewerMatchIndex, setViewerMatchIndex] = useState(-1);
  const [, startTransition] = useTransition();

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Loading JSON data...");

  // Modals Visibility
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  // Modal Positions & States (centered on first open)
  const [aboutPos, setAboutPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [loadPos, setLoadPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [aboutActiveTab, setAboutActiveTab] = useState("about");

  // URL Load state
  const [loadUrl, setLoadUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // Draggable logic state
  const [activeDrag, setActiveDrag] = useState<"about" | "load" | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resizer State
  const [treeWidth, setTreeWidth] = useState(1000);
  const [isResizing, setIsResizing] = useState(false);

  // Deferred value for better performance with large data
  const deferredInputData = useDeferredValue(inputData);

  // Derived state
  const parsed = useMemo(() => {
    if (!deferredInputData.trim()) return null;
    try {
      return JSON.parse(deferredInputData) as JSONValue;
    } catch {
      return null;
    }
  }, [deferredInputData]);

  const error = useMemo(() => {
    if (!inputData.trim()) return null;
    try {
      JSON.parse(inputData);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Invalid JSON";
    }
  }, [inputData]);

  // Sync selectedValue when switching to viewer tab or when inputData changes
  useEffect(() => {
    if (activeTab === "viewer" && parsed) {
      // Reset selection when data changes
      setSelectedPath("JSON");
      setSelectedValue(parsed);
    }
  }, [activeTab, parsed]);

  const formatJson = useCallback(() => {
    try {
      if (!inputData.trim()) return;
      const jsonData = JSON.parse(inputData);
      setInputData(JSON.stringify(jsonData, null, 2));
      setSelectedPath("JSON");
      setSelectedValue(jsonData as JSONValue);
    } catch {
      // Handled by derived state
    }
  }, [inputData]);

  const removeWhitespace = useCallback(() => {
    if (!inputData.trim()) return;
    setInputData(inputData.replace(/\s/g, ""));
  }, [inputData]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(inputData);
  }, [inputData]);

  const clearAll = useCallback(() => {
    setInputData("");
    setSelectedValue(null);
    setSelectedPath(null);
    setSearch("");
    setSearchMatches([]);
    setCurrentMatchIndex(-1);
    setViewerMatches([]);
    setViewerMatchIndex(-1);
  }, []);

  const handleSearch = useCallback(() => {
    const searchTerm = search.trim();

    if (activeTab === "text" && searchTerm) {
      // For text tab, find all matches in the text content
      const text = inputData.toLowerCase();
      const query = searchTerm.toLowerCase();
      const matches: number[] = [];
      let pos = text.indexOf(query);

      while (pos !== -1) {
        matches.push(pos);
        pos = text.indexOf(query, pos + 1);
      }

      setSearchMatches(matches);
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
      } else {
        setCurrentMatchIndex(-1);
      }
    } else if (activeTab === "viewer" && parsed && searchTerm) {
      // For viewer tab, collect all matching paths
      const matches = collectMatches(parsed, searchTerm, "JSON");
      setViewerMatches(matches);
      if (matches.length > 0) {
        setViewerMatchIndex(0);
        setSelectedPath(matches[0]);
      } else {
        setViewerMatchIndex(-1);
      }
    }
  }, [search, activeTab, inputData, parsed]);

  const handleNext = useCallback(() => {
    if (activeTab === "text") {
      if (searchMatches.length === 0) return;

      const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
      setCurrentMatchIndex(nextIndex);
    } else if (activeTab === "viewer") {
      if (viewerMatches.length === 0) return;

      const nextIndex = (viewerMatchIndex + 1) % viewerMatches.length;
      setViewerMatchIndex(nextIndex);
      setSelectedPath(viewerMatches[nextIndex]);
    }
  }, [
    activeTab,
    searchMatches,
    currentMatchIndex,
    viewerMatches,
    viewerMatchIndex,
  ]);

  const handlePrevious = useCallback(() => {
    if (activeTab === "text") {
      if (searchMatches.length === 0) return;

      const prevIndex =
        currentMatchIndex <= 0
          ? searchMatches.length - 1
          : currentMatchIndex - 1;
      setCurrentMatchIndex(prevIndex);
    } else if (activeTab === "viewer") {
      if (viewerMatches.length === 0) return;

      const prevIndex =
        viewerMatchIndex <= 0 ? viewerMatches.length - 1 : viewerMatchIndex - 1;
      setViewerMatchIndex(prevIndex);
      setSelectedPath(viewerMatches[prevIndex]);
    }
  }, [
    activeTab,
    searchMatches,
    currentMatchIndex,
    viewerMatches,
    viewerMatchIndex,
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage(`Loading ${file.name}...`);

    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setLoadingProgress(progress);
      }
    };

    reader.onload = (event) => {
      const content = event.target?.result as string;

      // Use transition for non-blocking update
      startTransition(() => {
        setInputData(content);
        setIsLoadModalOpen(false);
        setActiveTab("viewer");
        setLoadingProgress(100);

        // Small delay to show 100% completion
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
  };

  const handleUrlLoad = async () => {
    if (!loadUrl.trim()) return;
    setIsFetchingUrl(true);
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingMessage("Fetching data from URL...");

    try {
      const res = await fetch(loadUrl);
      if (!res.ok) throw new Error("Failed to fetch");

      setLoadingProgress(50);
      const data = await res.json();
      setLoadingProgress(75);

      startTransition(() => {
        setInputData(JSON.stringify(data, null, 2));
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
  };

  const loadSample = useCallback((type: "simple" | "complex") => {
    const samples = {
      simple: { name: "Sample", value: 123, active: true },
      complex: {
        firstName: "John",
        lastName: "Smith",
        gender: "man",
        age: 32,
        address: { streetAddress: "21 2nd Street", city: "New York" },
        phoneNumbers: [{ type: "home", number: "212 555-1234" }],
      },
    };
    const data = type === "simple" ? samples.simple : samples.complex;
    setInputData(JSON.stringify(data, null, 2));
    setSelectedPath("JSON");
    setSelectedValue(data as JSONValue);
    setIsLoadModalOpen(false);
    setActiveTab("viewer");
  }, []);

  // Global mouse listeners for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        setTreeWidth(
          Math.max(150, Math.min(e.clientX - 10, window.innerWidth - 150)),
        );
      }
      if (activeDrag === "about") {
        setAboutPos({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
      if (activeDrag === "load") {
        setLoadPos({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveDrag(null);
    };

    if (isResizing || activeDrag) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, activeDrag, dragOffset]);

  // Center modal helper
  const centerModal = (width: number, height: number) => ({
    x: Math.round((window.innerWidth - width) / 2),
    y: Math.round((window.innerHeight - height) / 2),
  });

  const openAbout = useCallback(() => {
    if (!aboutPos) setAboutPos(centerModal(650, 500));
    setIsAboutOpen(true);
  }, [aboutPos]);

  const openLoadModal = useCallback(() => {
    if (!loadPos) setLoadPos(centerModal(500, 380));
    setIsLoadModalOpen(true);
  }, [loadPos]);

  const startDrag = (e: React.MouseEvent, type: "about" | "load") => {
    setActiveDrag(type);
    const pos =
      type === "about"
        ? aboutPos ?? { x: 0, y: 0 }
        : loadPos ?? { x: 0, y: 0 };
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  return (
    <div className="flex flex-col h-screen font-sans text-[11px] selection:bg-[#cee6ff]">
      {/* Loading Splash Screen */}
      {isLoading && (
        <LoadingSplash progress={loadingProgress} message={loadingMessage} />
      )}

      {/* Top Ad Space */}
      <div className="h-16 shrink-0 bg-transparent flex items-center justify-center">
        <div className="w-full h-full bg-linear-to-r from-purple-100 via-blue-50 to-orange-50 opacity-50" />
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-end h-8 px-2 gap-[2px] bg-transparent">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`h-7 px-4 text-[12px] font-medium border border-b-0 border-gray-300 rounded-t-md transition-colors ${
              activeTab === "viewer"
                ? "bg-white translate-y-px z-10"
                : "bg-linear-to-b from-[#fcfcfc] to-[#e0e4e6] hover:from-[#f0f0f0]"
            }`}
          >
            Viewer
          </button>
          <button
            onClick={() => setActiveTab("text")}
            className={`h-7 px-4 text-[12px] font-medium border border-b-0 border-gray-300 rounded-t-md transition-colors ${
              activeTab === "text"
                ? "bg-white translate-y-px z-10"
                : "bg-linear-to-b from-[#fcfcfc] to-[#e0e4e6] hover:from-[#f0f0f0]"
            }`}
          >
            Text
          </button>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 flex flex-col mx-2 border border-gray-300 shadow-sm overflow-hidden">
          {/* Action Toolbar */}
          <div className="flex items-center h-8 border-b border-gray-300 bg-linear-to-b from-[#fcfcfc] to-[#e0e4e6] px-2 divide-x divide-gray-300">
            <button
              key="copy"
              onClick={copyToClipboard}
              className="toolbar-btn"
            >
              Copy
            </button>
            <button key="format" onClick={formatJson} className="toolbar-btn">
              Format
            </button>
            <button
              key="whitespace"
              onClick={removeWhitespace}
              className="toolbar-btn text-nowrap"
            >
              Remove white space
            </button>
            <button key="clear" onClick={clearAll} className="toolbar-btn">
              Clear
            </button>
            <button
              key="load"
              onClick={openLoadModal}
              className="toolbar-btn text-nowrap"
            >
              Load JSON data
            </button>
            <div
              className="ml-auto px-4 text-blue-800 hover:underline cursor-pointer"
              onClick={openAbout}
            >
              About
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 relative">
            <div className="flex-1 flex min-h-0 relative">
              {activeTab === "viewer" ? (
                <div className="flex-1 flex min-h-0 bg-white relative">
                  <div
                    className="overflow-auto border-r border-[#eee] p-2 bg-white"
                    style={{ width: treeWidth }}
                  >
                    {parsed ? (
                      <JsonTree
                        key={search || "default"}
                        value={parsed}
                        rootLabel="JSON"
                        selectedPath={selectedPath ?? undefined}
                        filter={search}
                        onSelect={(path, _label, value) => {
                          setSelectedPath(path);
                          setSelectedValue(value);
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        {error ? (
                          <span className="text-red-500 font-medium">
                            Error: {error}
                          </span>
                        ) : (
                          "No data loaded"
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className="w-[2px] cursor-col-resize hover:bg-blue-400 transition-colors bg-gray-300 shrink-0"
                    onMouseDown={() => setIsResizing(true)}
                  />
                  <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-[200px]">
                    <div className="flex h-6 bg-[#f8f9fa] border-b border-[#eee] text-[11px] font-medium select-none">
                      <div className="flex-1 px-2 border-r border-[#eee] flex items-center gap-1 hover:bg-[#eaeaea] cursor-pointer group">
                        Name{" "}
                        <span className="text-[8px] text-gray-400 group-hover:text-gray-600">
                          ▲
                        </span>
                      </div>
                      <div className="w-[150px] px-2 flex items-center">
                        Value
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                      {selectedValue !== null ? (
                        typeof selectedValue === "object" &&
                        selectedValue !== null ? (
                          Object.entries(selectedValue as JSONObject).map(
                            ([key, val]) => (
                              <div
                                key={key}
                                className="flex border-b border-[#f5f5f5] hover:bg-[#f2f6fa] h-[22px] items-center text-[10px]"
                              >
                                <div className="flex-1 px-2 border-r border-[#f5f5f5] font-medium truncate">
                                  {key}
                                </div>
                                <div className="w-[150px] px-2 text-gray-600 truncate">
                                  {typeof val === "object" && val !== null
                                    ? "..."
                                    : String(val)}
                                </div>
                              </div>
                            ),
                          )
                        ) : (
                          <div className="flex bg-[#cee6ff] h-[22px] items-center text-[10px]">
                            <div className="flex-1 px-2 border-r border-[#cee6ff] font-medium truncate">
                              Value
                            </div>
                            <div className="w-[150px] px-2 text-gray-900 truncate font-semibold">
                              {String(selectedValue)}
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="p-4 text-center text-gray-300 italic">
                          Select a node to view properties
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col relative bg-white min-h-0">
                  <JsonCodeEditor
                    value={inputData}
                    onChange={(val) => setInputData(val)}
                  />
                </div>
              )}
            </div>

            {/* Bottom Search Bar */}
            <div className="h-8 border-t border-gray-300 bg-linear-to-b from-[#fcfcfc] to-[#e0e4e6] flex items-center px-2 gap-2 shrink-0">
              <span className="font-semibold text-gray-700">Search:</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-[18px] border border-gray-400 px-1 outline-none text-[10px] w-48 shadow-inner"
              />
              <button
                onClick={handleSearch}
                className="h-[20px] px-2 border border-gray-400 bg-white hover:bg-gray-50 active:bg-gray-100 text-[10px] font-bold"
              >
                GO!
              </button>
              {activeTab === "text" && searchMatches.length > 0 && (
                <span className="text-[10px] text-gray-600">
                  {currentMatchIndex + 1} of {searchMatches.length}
                </span>
              )}
              {activeTab === "viewer" && viewerMatches.length > 0 && (
                <span className="text-[10px] text-gray-600">
                  {viewerMatchIndex + 1} of {viewerMatches.length}
                </span>
              )}
              <div className="flex items-center gap-4 ml-4">
                <button
                  onClick={handleNext}
                  disabled={
                    (activeTab === "text" && searchMatches.length === 0) ||
                    (activeTab === "viewer" && viewerMatches.length === 0)
                  }
                  className="flex items-center gap-1 text-[10px] text-gray-700 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-green-600 font-bold group-hover:scale-110 transition-transform">
                    ↑
                  </span>{" "}
                  Next
                </button>
                <button
                  onClick={handlePrevious}
                  disabled={
                    (activeTab === "text" && searchMatches.length === 0) ||
                    (activeTab === "viewer" && viewerMatches.length === 0)
                  }
                  className="flex items-center gap-1 text-[10px] text-gray-700 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-green-600 font-bold group-hover:scale-110 transition-transform">
                    ↓
                  </span>{" "}
                  Previous
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-16 shrink-0 bg-transparent flex items-center justify-center">
        <div className="w-full h-full bg-linear-to-r from-orange-50 via-blue-50 to-purple-100 opacity-50" />
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 h-6 bg-[#f0f0f0] border-t border-gray-300 flex items-center justify-center gap-1 z-60">
        <span className="text-[11px] text-gray-800 flex items-center gap-1">
          Made with <span className="text-red-600">❤</span> for the community.
          This tool is free forever. Happy JSON Viewing! 🚀
        </span>
      </div>

      {/* About Modal */}
      {isAboutOpen && aboutPos && (
        <div
          className="fixed z-100 bg-white border border-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-[650px] overflow-hidden rounded"
          style={{ left: aboutPos.x, top: aboutPos.y }}
        >
          <div
            className="h-7 bg-[#f0f0f0] border-b border-gray-300 flex items-center px-2 cursor-move select-none"
            onMouseDown={(e) => startDrag(e, "about")}
          >
            <span className="text-[11px] font-bold text-gray-600">
              Online JSON Viewer and Formatter
            </span>
            <button
              className="ml-auto w-5 h-5 flex items-center justify-center border border-gray-400 rounded-sm bg-white hover:bg-red-50 text-[10px] text-gray-600 pb-0.5"
              onClick={() => setIsAboutOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="h-8 bg-[#f5f5f5] border-b border-gray-300 flex items-end px-1 gap-1">
            <button
              className={`h-6 px-3 text-[11px] font-bold border border-gray-300 border-b-0 rounded-t-sm transition-colors ${aboutActiveTab === "about" ? "bg-white translate-y-px z-10" : "bg-[#e5e5e5]"}`}
              onClick={() => setAboutActiveTab("about")}
            >
              About JSON
            </button>
            <button
              className={`h-6 px-3 text-[11px] border border-gray-300 border-b-0 rounded-t-sm transition-colors ${aboutActiveTab === "example" ? "bg-white translate-y-px z-10" : "bg-[#e5e5e5]"}`}
              onClick={() => setAboutActiveTab("example")}
            >
              Example
            </button>
            <button
              className={`h-6 px-3 text-[11px] border border-gray-300 border-b-0 rounded-t-sm transition-colors ${aboutActiveTab === "viewer" ? "bg-white translate-y-px z-10" : "bg-[#e5e5e5]"}`}
              onClick={() => setAboutActiveTab("viewer")}
            >
              About Online JSON Viewer
            </button>
          </div>
          <div className="p-4 max-h-[400px] overflow-auto text-[12px] leading-relaxed text-[#111]">
            {aboutActiveTab === "about" && (
              <div className="space-y-3">
                <p>
                  <span className="font-bold">JSON</span> (
                  <span className="font-bold cursor-help border-b border-dotted border-black">
                    JavaScript Object Notation
                  </span>
                  ) is a lightweight data interchange format that is easy for
                  humans to read and write, and easy for machines to parse and
                  generate.
                </p>
                <p>
                  JSON is built on two universal data structures:
                </p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>
                    <span className="font-semibold">Object</span> &mdash; An
                    unordered collection of key/value pairs enclosed in curly
                    braces{" "}
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      {`{ }`}
                    </code>
                    . Keys must be strings.
                  </li>
                  <li>
                    <span className="font-semibold">Array</span> &mdash; An
                    ordered list of values enclosed in square brackets{" "}
                    <code className="bg-gray-100 px-1 rounded text-[11px]">
                      {"[ ]"}
                    </code>
                    .
                  </li>
                </ul>
                <p>
                  Values can be:{" "}
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    string
                  </code>
                  ,{" "}
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    number
                  </code>
                  ,{" "}
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    boolean
                  </code>{" "}
                  (
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    true
                  </code>
                  /
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    false
                  </code>
                  ),{" "}
                  <code className="bg-gray-100 px-1 rounded text-[11px]">
                    null
                  </code>
                  , an object, or an array. These structures can be nested.
                </p>
                <p className="text-[11px] text-gray-600">
                  JSON is language-independent but uses conventions familiar to
                  programmers of the C-family of languages. It is commonly used
                  for APIs, configuration files, and data storage.
                </p>
                <p>
                  Read more:{" "}
                  <a
                    href="https://json.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    json.org
                  </a>{" "}
                  |{" "}
                  <a
                    href="https://datatracker.ietf.org/doc/html/rfc8259"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    RFC 8259
                  </a>
                </p>
              </div>
            )}
            {aboutActiveTab === "example" && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-600">
                  A simple JSON object:
                </p>
                <div className="bg-gray-50 border border-gray-200 p-3 font-mono text-[11px] whitespace-pre rounded">{`{
  "firstName": "John",
  "lastName": "Smith",
  "age": 32,
  "isActive": true
}`}</div>
                <p className="text-[11px] text-gray-600 mt-3">
                  A more complex example with nested objects and arrays:
                </p>
                <div className="bg-gray-50 border border-gray-200 p-3 font-mono text-[11px] whitespace-pre rounded">{`{
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
}`}</div>
              </div>
            )}
            {aboutActiveTab === "viewer" && (
              <div className="space-y-3">
                <p>
                  <span className="font-bold">Online JSON Viewer</span> is a
                  free, fast, and modern tool for viewing, editing, formatting,
                  and validating JSON data right in your browser.
                </p>
                <p className="font-semibold text-[11px] uppercase text-gray-500 mt-2">
                  Features
                </p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>
                    <span className="font-semibold">Tree Viewer</span> &mdash;
                    Interactive, collapsible tree view with property inspection.
                  </li>
                  <li>
                    <span className="font-semibold">Code Editor</span> &mdash;
                    Full-featured JSON editor with syntax highlighting, bracket
                    matching, auto-closing, code folding, and real-time
                    validation.
                  </li>
                  <li>
                    <span className="font-semibold">Format &amp; Minify</span>{" "}
                    &mdash; One-click pretty-print or minify your JSON.
                  </li>
                  <li>
                    <span className="font-semibold">Validation</span> &mdash;
                    Inline error markers with exact position and descriptive
                    messages.
                  </li>
                  <li>
                    <span className="font-semibold">Search</span> &mdash; Search
                    across keys and values in both tree and text views.
                  </li>
                  <li>
                    <span className="font-semibold">Load Data</span> &mdash;
                    Upload files, fetch from URL, or use sample data.
                  </li>
                  <li>
                    <span className="font-semibold">Copy</span> &mdash; Copy
                    formatted or raw JSON to clipboard instantly.
                  </li>
                </ul>
                <p className="font-semibold text-[11px] uppercase text-gray-500 mt-2">
                  Keyboard Shortcuts
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                  <div>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px]">
                      Ctrl+Space
                    </kbd>{" "}
                    Autocomplete
                  </div>
                  <div>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px]">
                      Ctrl+F
                    </kbd>{" "}
                    Find &amp; Replace
                  </div>
                  <div>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px]">
                      Ctrl+Z
                    </kbd>{" "}
                    Undo
                  </div>
                  <div>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px]">
                      Ctrl+Shift+Z
                    </kbd>{" "}
                    Redo
                  </div>
                  <div>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px]">
                      Tab
                    </kbd>{" "}
                    Indent
                  </div>
                  <div>
                    <kbd className="bg-gray-100 border border-gray-300 rounded px-1 text-[10px]">
                      Shift+Tab
                    </kbd>{" "}
                    Unindent
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  Privacy: All processing happens locally in your browser. No
                  data is sent to any server. This site does not have a database.
                </p>
                <p className="text-[11px] text-gray-500">
                  This tool is free and open for the community.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Load JSON Data Modal */}
      {isLoadModalOpen && loadPos && (
        <div
          className="fixed z-100 bg-white border border-gray-400 shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-[500px] overflow-hidden rounded"
          style={{ left: loadPos.x, top: loadPos.y }}
        >
          <div
            className="h-7 bg-[#f0f0f0] border-b border-gray-300 flex items-center px-2 cursor-move select-none"
            onMouseDown={(e) => startDrag(e, "load")}
          >
            <span className="text-[11px] font-bold text-gray-600">
              Load JSON Data
            </span>
            <button
              className="ml-auto w-5 h-5 flex items-center justify-center border border-gray-400 rounded-sm bg-white hover:bg-red-50 text-[10px] text-gray-600 pb-0.5"
              onClick={() => setIsLoadModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="p-5 space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase">
                Upload JSON File
              </label>
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".json,application/json"
                className="w-full text-[11px] file:mr-4 file:py-1 file:px-4 file:rounded-sm file:border file:border-gray-300 file:bg-gray-50 file:text-[11px] file:font-semibold hover:file:bg-gray-100 cursor-pointer"
              />
            </div>
            <div className="border-t border-gray-200" />
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase">
                Load from URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loadUrl}
                  onChange={(e) => setLoadUrl(e.target.value)}
                  placeholder="https://api.example.com/data.json"
                  className="flex-1 h-7 border border-gray-300 px-2 outline-none text-[11px] rounded-sm focus:border-blue-500"
                />
                <button
                  onClick={handleUrlLoad}
                  disabled={isFetchingUrl}
                  className="h-7 px-4 bg-gray-100 border border-gray-300 rounded-sm hover:bg-gray-200 text-[11px] font-bold disabled:opacity-50"
                >
                  {isFetchingUrl ? "..." : "LOAD"}
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200" />
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase">
                Load Sample Data
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => loadSample("simple")}
                  className="flex-1 h-7 bg-gray-100 border border-gray-300 rounded-sm hover:bg-gray-200 text-[11px]"
                >
                  Simple Sample
                </button>
                <button
                  onClick={() => loadSample("complex")}
                  className="flex-1 h-7 bg-gray-100 border border-gray-300 rounded-sm hover:bg-gray-200 text-[11px]"
                >
                  Complex Sample
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .toolbar-btn {
          height: 100%;
          padding: 0 10px;
          display: flex;
          align-items: center;
          color: #333;
          font-size: 11px;
          transition: background 0.1s;
          white-space: nowrap;
        }
        .toolbar-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .toolbar-btn:active {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
