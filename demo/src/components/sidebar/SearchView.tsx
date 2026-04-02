// ── Search View (React) — VS Code-style text + symbol search ─

import { useState, useCallback, useRef, useMemo } from "react";
import { useTheme } from "../theme";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { fileIconSvg, getExt } from "../../wireframe/utils";

interface FileEntry { uri: string; name: string; content: string; language: string }

interface Props {
  eventBus: InstanceType<typeof EventBus>;
  files: FileEntry[];
  notificationApi?: { show(opts: { type: string; message: string; duration: number }): void };
  indexerApi?: { query(q: { query: string; kind?: string | string[]; path?: string; limit?: number }): { name: string; kind: string; path: string; line: number; column: number }[]; getFileSymbols(path: string): { name: string; kind: string; path: string; line: number; column: number }[]; isReady(): boolean };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface TextMatch { line: number; text: string }
interface FileResult { file: FileEntry; matches: TextMatch[] }

function searchFiles(
  files: FileEntry[], q: string, matchCase: boolean, wholeWord: boolean, useRegex: boolean,
): FileResult[] {
  const results: FileResult[] = [];
  for (const f of files) {
    const lines = f.content.split("\n");
    const matches: TextMatch[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let isMatch = false;
      if (useRegex) {
        try { isMatch = new RegExp(q, matchCase ? "" : "i").test(line); } catch { /* skip */ }
      } else {
        const hay = matchCase ? line : line.toLowerCase();
        const needle = matchCase ? q : q.toLowerCase();
        if (wholeWord) {
          const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, matchCase ? "" : "i");
          isMatch = re.test(line);
        } else {
          isMatch = hay.includes(needle);
        }
      }
      if (isMatch) matches.push({ line: i + 1, text: line.trim() });
    }
    if (matches.length) results.push({ file: f, matches });
  }
  return results;
}

export function SearchView({ eventBus, files, notificationApi, indexerApi }: Props) {
  const { tokens: t } = useTheme();
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [replaceVisible, setReplaceVisible] = useState(false);
  const [mode, setMode] = useState<"text" | "symbols">("text");
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const openFile = useCallback((uri: string, name: string) => {
    eventBus.emit(FileEvents.Open, { uri, label: name });
  }, [eventBus]);

  // Text search results
  const textResults = useMemo(() => {
    if (!query.trim() || mode !== "text") return [];
    return searchFiles(files, query, matchCase, wholeWord, useRegex);
  }, [files, query, matchCase, wholeWord, useRegex, mode]);

  const totalMatches = textResults.reduce((s, r) => s + r.matches.length, 0);

  // Symbol search results
  const symbolResults = useMemo(() => {
    if (!query.trim() || mode !== "symbols" || !indexerApi?.isReady()) return [];
    return indexerApi.query({ query: query.trim() });
  }, [query, mode, indexerApi]);

  const symbolsByFile = useMemo(() => {
    const map = new Map<string, typeof symbolResults>();
    for (const sym of symbolResults) {
      const arr = map.get(sym.path) ?? [];
      arr.push(sym);
      map.set(sym.path, arr);
    }
    return map;
  }, [symbolResults]);

  const toggleFileExpanded = useCallback((uri: string) => {
    setExpandedFiles((prev) => ({ ...prev, [uri]: !(prev[uri] ?? true) }));
  }, []);

  const handleReplaceAll = useCallback(() => {
    if (!query.trim()) return;
    let count = 0;
    for (const f of files) {
      const before = f.content;
      if (useRegex) {
        try { f.content = f.content.replace(new RegExp(query, matchCase ? "g" : "gi"), replaceText); } catch { /* skip */ }
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
        f.content = f.content.replace(new RegExp(pattern, matchCase ? "g" : "gi"), replaceText);
      }
      if (f.content !== before) count++;
    }
    notificationApi?.show({ type: "success", message: `Replaced in ${count} file(s)`, duration: 3000 });
  }, [query, replaceText, matchCase, wholeWord, useRegex, files, notificationApi]);

  const OptionToggle = ({ label, text, active, onToggle }: { label: string; text: string; active: boolean; onToggle: () => void }) => (
    <div
      title={label}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      style={{
        width: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", borderRadius: 3, fontSize: 10, fontFamily: "monospace", fontWeight: 600,
        color: active ? t.accent : t.fgDim,
        background: active ? `color-mix(in srgb, ${t.accent} 25%, transparent)` : "transparent",
        transition: "all .12s", userSelect: "none",
      }}
    >{text}</div>
  );

  const hasQuery = query.trim().length > 0;

  return (
    <div style={{ overflowY: "auto", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Input area */}
      <div style={{ padding: "12px 14px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Search row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            title="Toggle Replace"
            onClick={() => setReplaceVisible(!replaceVisible)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, cursor: "pointer", borderRadius: 3,
              color: t.fgDim, flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"
              style={{ transition: "transform .2s", transform: replaceVisible ? "rotate(90deg)" : "" }}>
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, overflow: "hidden",
          }}>
            <span style={{ display: "flex", padding: "0 0 0 8px", color: t.fgDim, flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z" />
              </svg>
            </span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1, background: "transparent", color: t.fg, border: "none",
                padding: "5px 8px", fontSize: 12, outline: "none", fontFamily: "inherit", minWidth: 0,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 1, paddingRight: 4, flexShrink: 0 }}>
              <OptionToggle label="Match Case" text="Aa" active={matchCase} onToggle={() => setMatchCase(!matchCase)} />
              <OptionToggle label="Match Whole Word" text="Ab" active={wholeWord} onToggle={() => setWholeWord(!wholeWord)} />
              <OptionToggle label="Use Regular Expression" text=".*" active={useRegex} onToggle={() => setUseRegex(!useRegex)} />
            </div>
          </div>
        </div>

        {/* Replace row */}
        {replaceVisible && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 18, flexShrink: 0 }} />
            <div style={{
              flex: 1, display: "flex", alignItems: "center",
              background: t.inputBg, border: `1px solid ${t.inputBorder}`, borderRadius: 4, overflow: "hidden",
            }}>
              <span style={{ display: "flex", padding: "0 0 0 8px", color: t.fgDim, flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M11.3 1.3l1.4 1.4-9 9H2v-1.7l9.3-8.7zm-1.4 3.3L4 10.5V11h.5l5.9-5.9-.5-.5zM3 13h10v1H3v-1z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Replace"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                style={{
                  flex: 1, background: "transparent", color: t.fg, border: "none",
                  padding: "5px 8px", fontSize: 12, outline: "none", fontFamily: "inherit", minWidth: 0,
                }}
              />
              <div style={{ display: "flex", gap: 1, paddingRight: 4 }}>
                <div title="Replace All" onClick={handleReplaceAll} style={{
                  width: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", borderRadius: 3, color: t.fgDim,
                }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h8v1H2V4zm0 3h10v1H2V7zm0 3h6v1H2v-1zm10.5.5l2 2-2 2m2-2h-5" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0, padding: "0 14px", borderBottom: `1px solid ${t.separator}` }}>
        {(["text", "symbols"] as const).map((m) => (
          <div
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 12px", fontSize: 11, cursor: "pointer", userSelect: "none",
              borderBottom: `2px solid ${mode === m ? t.accent : "transparent"}`,
              color: mode === m ? t.fg : t.fgDim,
              fontWeight: mode === m ? 500 : "normal", transition: "all .15s",
            }}
          >{m === "text" ? "Text" : "Symbols"}</div>
        ))}
      </div>

      {/* Summary bar */}
      {hasQuery && mode === "text" && totalMatches > 0 && (
        <div style={{
          padding: "4px 14px", fontSize: 11, color: t.fgDim,
          borderBottom: `1px solid ${t.separator}`, display: "flex", alignItems: "center", gap: 8, minHeight: 24,
        }}>
          <span style={{ color: t.fg, fontWeight: 500 }}>{totalMatches}</span> result{totalMatches !== 1 ? "s" : ""} in{" "}
          <span style={{ color: t.fg, fontWeight: 500 }}>{textResults.length}</span> file{textResults.length !== 1 ? "s" : ""}
        </div>
      )}
      {hasQuery && mode === "symbols" && symbolResults.length > 0 && (
        <div style={{
          padding: "4px 14px", fontSize: 11, color: t.fgDim,
          borderBottom: `1px solid ${t.separator}`, display: "flex", alignItems: "center", gap: 8, minHeight: 24,
        }}>
          <span style={{ color: t.fg, fontWeight: 500 }}>{symbolResults.length}</span> symbol{symbolResults.length !== 1 ? "s" : ""} found
        </div>
      )}

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!hasQuery && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", color: t.fgDim, gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.5 }}>
              <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z" />
            </svg>
            <div style={{ fontSize: 12, textAlign: "center" }}>{mode === "symbols" ? "Search to find symbols" : "Search to find in files"}</div>
          </div>
        )}

        {hasQuery && mode === "text" && totalMatches === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", color: t.fgDim }}>
            <div style={{ fontSize: 12 }}>No results found for "{query}"</div>
          </div>
        )}

        {hasQuery && mode === "symbols" && symbolResults.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", color: t.fgDim }}>
            <div style={{ fontSize: 12 }}>
              {!indexerApi?.isReady() ? "Symbol index is not available." : `No symbols found for "${query}"`}
            </div>
          </div>
        )}

        {/* Text results */}
        {hasQuery && mode === "text" && (
          <div style={{ padding: "4px 8px 16px" }}>
            {textResults.map(({ file, matches }) => {
              const isExpanded = expandedFiles[file.uri] ?? true;
              const dir = file.uri.split("/").slice(0, -1).join("/");
              return (
                <div key={file.uri} style={{ marginBottom: 2, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    className="vsc-file-item"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", cursor: "pointer", borderRadius: 4, userSelect: "none" }}
                    onClick={() => openFile(file.uri, file.name)}
                  >
                    <span
                      onClick={(e) => { e.stopPropagation(); toggleFileExpanded(file.uri); }}
                      style={{ display: "flex", color: t.fgDim, transition: "transform .15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0)", flexShrink: 0 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: fileIconSvg(getExt(file.name)) }} style={{ display: "inline-flex", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: t.fg, fontWeight: 500, flexShrink: 0 }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: t.fgDim, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{dir}</span>
                    <span style={{
                      fontSize: 10, padding: "0 5px", borderRadius: 8, fontWeight: 600, lineHeight: "16px", minWidth: 16, textAlign: "center", flexShrink: 0,
                      background: `color-mix(in srgb, ${t.accent} 18%, transparent)`, color: t.accent,
                    }}>{matches.length}</span>
                  </div>
                  {isExpanded && matches.slice(0, 10).map((m, i) => (
                    <div
                      key={i}
                      className="vsc-file-item"
                      style={{ display: "flex", alignItems: "center", padding: "2px 8px 2px 36px", cursor: "pointer", borderRadius: 3, minHeight: 22 }}
                      onClick={() => openFile(file.uri, file.name)}
                    >
                      <span style={{ color: t.fgDim, marginRight: 10, minWidth: 28, textAlign: "right", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", opacity: 0.7, flexShrink: 0 }}>
                        {m.line}
                      </span>
                      <span
                        style={{ fontSize: 12, color: t.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono',monospace" }}
                        dangerouslySetInnerHTML={{
                          __html: (() => {
                            const idx = matchCase ? m.text.indexOf(query) : m.text.toLowerCase().indexOf(query.toLowerCase());
                            if (idx < 0) return esc(m.text);
                            return `<span style="opacity:0.6">${esc(m.text.slice(0, idx))}</span><span style="background:color-mix(in srgb, ${t.accent} 30%, transparent);border-radius:2px;padding:0 1px;">${esc(m.text.slice(idx, idx + query.length))}</span><span style="opacity:0.6">${esc(m.text.slice(idx + query.length))}</span>`;
                          })(),
                        }}
                      />
                    </div>
                  ))}
                  {isExpanded && matches.length > 10 && (
                    <div className="vsc-file-item" style={{ padding: "3px 8px 3px 36px", fontSize: 11, color: t.fgDim, opacity: 0.7, cursor: "pointer" }}
                      onClick={() => openFile(file.uri, file.name)}>
                      {matches.length - 10} more results…
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Symbol results */}
        {hasQuery && mode === "symbols" && symbolResults.length > 0 && (
          <div style={{ padding: "4px 8px 16px" }}>
            {[...symbolsByFile.entries()].map(([filePath, syms]) => {
              const fileName = filePath.split("/").pop() ?? filePath;
              return (
                <div key={filePath} style={{ marginBottom: 2, borderRadius: 4, overflow: "hidden" }}>
                  <div
                    className="vsc-file-item"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", cursor: "pointer", borderRadius: 4, userSelect: "none" }}
                    onClick={() => openFile(filePath, fileName)}
                  >
                    <span dangerouslySetInnerHTML={{ __html: fileIconSvg(getExt(fileName)) }} style={{ display: "inline-flex", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: t.fg, fontWeight: 500, flexShrink: 0 }}>{fileName}</span>
                    <span style={{ fontSize: 11, color: t.fgDim, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{filePath}</span>
                    <span style={{
                      fontSize: 10, padding: "0 5px", borderRadius: 8, fontWeight: 600, lineHeight: "16px",
                      background: `color-mix(in srgb, ${t.accent} 18%, transparent)`, color: t.accent,
                    }}>{syms.length}</span>
                  </div>
                  {syms.slice(0, 20).map((sym, i) => {
                    const kindColors: Record<string, string> = {
                      file: "#d4d4d4", module: "#c586c0", namespace: "#c586c0", package: "#c586c0",
                      class: "#4ec9b0", method: "#dcdcaa", property: "#9cdcfe", field: "#9cdcfe",
                      constructor: "#dcdcaa", enum: "#b5cea8", interface: "#4ec9b0", function: "#dcdcaa",
                      variable: "#9cdcfe", constant: "#569cd6", string: "#ce9178", number: "#b5cea8",
                      boolean: "#569cd6", array: "#9cdcfe", object: "#4ec9b0", key: "#9cdcfe",
                      null: "#569cd6", enummember: "#b5cea8", struct: "#4ec9b0", event: "#dcdcaa",
                      operator: "#d4d4d4", typeparameter: "#4ec9b0", type: "#4ec9b0",
                    };
                    const kc = kindColors[sym.kind.toLowerCase()] ?? t.fg;
                    return (
                      <div
                        key={i}
                        className="vsc-file-item"
                        style={{ display: "flex", alignItems: "center", padding: "2px 8px 2px 28px", cursor: "pointer", borderRadius: 3, minHeight: 22, gap: 6 }}
                        onClick={() => openFile(filePath, fileName)}
                      >
                        <span style={{ fontSize: 10, padding: "0 4px", borderRadius: 3, background: `${kc}18`, color: kc, fontWeight: 600, fontFamily: "monospace", flexShrink: 0, minWidth: 20, textAlign: "center" }}>
                          {sym.kind.slice(0, 3).toUpperCase()}
                        </span>
                        <span style={{ fontSize: 12, color: t.fg, fontFamily: "'JetBrains Mono',monospace" }}>{sym.name}</span>
                        <span style={{ fontSize: 10, color: t.fgDim, fontFamily: "monospace", marginLeft: "auto" }}>L{sym.line}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
