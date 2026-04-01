// ── Bottom Panel — React (Problems, Output, Terminal, Debug, Outline) ─

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import * as monaco from "monaco-editor";
import { useTheme } from "../theme";
import { PanelEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";

// ── Types ────────────────────────────────────────────────────
export interface BottomPanelProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  files?: { uri: string; name: string }[];
}

const PANEL_TABS = ["Problems", "Output", "Terminal", "Debug Console", "Outline"];

// ── Symbol parsing ───────────────────────────────────────────
interface SymbolEntry { name: string; kind: string; line: number; icon: string; indent: number }

const symbolStore = new Map<string, SymbolEntry[]>();
const symbolVersions = new Map<string, number>();

function parseSymbols(content: string): SymbolEntry[] {
  const lines = content.split("\n");
  const symbols: SymbolEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;
    const indent = (line.match(/^\s*/)?.[0].length ?? 0) > 0 ? 1 : 0;
    const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) { symbols.push({ name: funcMatch[1], kind: "function", line: ln, icon: "ƒ", indent }); continue; }
    const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (arrowMatch) { symbols.push({ name: arrowMatch[1], kind: "function", line: ln, icon: "ƒ", indent }); continue; }
    const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) { symbols.push({ name: classMatch[1], kind: "class", line: ln, icon: "C", indent: 0 }); continue; }
    const ifaceMatch = line.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/);
    if (ifaceMatch) { symbols.push({ name: ifaceMatch[1], kind: "interface", line: ln, icon: "I", indent: 0 }); continue; }
    const enumMatch = line.match(/(?:export\s+)?enum\s+(\w+)/);
    if (enumMatch) { symbols.push({ name: enumMatch[1], kind: "enum", line: ln, icon: "E", indent: 0 }); continue; }
    const compMatch = line.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/);
    if (compMatch && !funcMatch && !arrowMatch) { symbols.push({ name: compMatch[1], kind: "component", line: ln, icon: "◇", indent: 0 }); continue; }
    const storeMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*create/);
    if (storeMatch) { symbols.push({ name: storeMatch[1], kind: "store", line: ln, icon: "S", indent: 0 }); continue; }
    if (indent === 0) {
      const varMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[=:]/);
      if (varMatch && !arrowMatch && !storeMatch) { symbols.push({ name: varMatch[1], kind: "variable", line: ln, icon: "V", indent: 0 }); continue; }
    }
  }
  return symbols;
}

function getSymbols(uri: string, model: monaco.editor.ITextModel): SymbolEntry[] {
  const version = model.getVersionId();
  if (symbolVersions.get(uri) === version && symbolStore.has(uri)) return symbolStore.get(uri)!;
  const symbols = parseSymbols(model.getValue());
  symbolStore.set(uri, symbols);
  symbolVersions.set(uri, version);
  return symbols;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Tab component ────────────────────────────────────────────
function PanelTab({ label, isActive, badge, onClick }: {
  label: string; isActive: boolean; badge?: number; onClick: () => void;
}) {
  const { tokens: t } = useTheme();
  return (
    <div
      onClick={onClick}
      data-tab={label}
      style={{
        padding: "0 12px", height: "100%", display: "flex", alignItems: "center",
        cursor: "pointer", fontSize: 11, textTransform: "uppercase", fontWeight: 500,
        color: isActive ? t.fgBright : t.fgDim,
        borderBottom: `1px solid ${isActive ? t.fgBright : "transparent"}`,
        gap: 4,
      }}
    >
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          background: t.badgeBg, color: t.badgeFg, fontSize: 9,
          padding: "0 5px", borderRadius: 8, marginLeft: 6,
          minWidth: 14, textAlign: "center", display: "inline-block",
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Problems panel content ───────────────────────────────────
function ProblemsContent({ eventBus }: { eventBus: BottomPanelProps["eventBus"] }) {
  const { tokens: t } = useTheme();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const disposable = monaco.editor.onDidChangeMarkers(() => forceUpdate((n) => n + 1));
    return () => disposable.dispose();
  }, []);

  const models = monaco.editor.getModels().filter((m) => m.uri.scheme !== "inmemory");
  if (models.length === 0) {
    return <div style={{ color: t.fgDim, fontSize: 13, padding: "8px 12px" }}>No files are open. Open a file to check for problems.</div>;
  }

  const grouped = new Map<string, monaco.editor.IMarker[]>();
  for (const m of monaco.editor.getModelMarkers({})) {
    const uri = m.resource.path.replace(/^\//, "");
    if (uri.startsWith("__") || !uri || m.resource.scheme === "inmemory") continue;
    const arr = grouped.get(uri) ?? [];
    arr.push(m);
    grouped.set(uri, arr);
  }

  let total = 0;
  for (const arr of grouped.values()) total += arr.length;

  if (total === 0) {
    return (
      <div style={{ color: t.fgDim, fontSize: 13, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill={t.successGreen}><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>
        No problems have been detected in the workspace.
      </div>
    );
  }

  return (
    <div style={{ overflowY: "auto", fontSize: 13 }}>
      {Array.from(grouped).map(([file, markers]) => {
        const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
        const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length;
        return (
          <div key={file}>
            <div
              onClick={() => eventBus.emit(FileEvents.Open, { uri: file, name: file.split("/").pop() })}
              style={{ padding: "4px 12px", display: "flex", alignItems: "center", gap: 6, color: t.fg, fontWeight: 500, cursor: "pointer" }}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill={t.fgDim}><path d="M13.85 4.44l-3.28-3.3-.71-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8l-.15-.36zm-.85.86h-3V2.5l3 2.8zM3 14V2h6v4h4v8H3z"/></svg>
              <span>{file}</span>
              {errors > 0 && <span style={{ color: t.errorRed, fontSize: 11 }}>{errors}</span>}
              {warnings > 0 && <span style={{ color: t.warningYellow, fontSize: 11 }}>{warnings}</span>}
            </div>
            {markers.map((m, i) => {
              const sevColor = m.severity === monaco.MarkerSeverity.Error ? t.errorRed : m.severity === monaco.MarkerSeverity.Warning ? t.warningYellow : t.fgDim;
              return (
                <MarkerRow key={i} marker={m} sevColor={sevColor} onClick={() => eventBus.emit(FileEvents.Open, { uri: file, name: file.split("/").pop() })} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function MarkerRow({ marker: m, sevColor, onClick }: { marker: monaco.editor.IMarker; sevColor: string; onClick: () => void }) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "2px 12px 2px 30px", display: "flex", alignItems: "center",
        gap: 6, color: t.fgDim, cursor: "pointer", fontSize: 12,
        background: hovered ? t.listHover : "transparent",
      }}
    >
      <span style={{ color: sevColor, flexShrink: 0 }}>●</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.message}</span>
      <span style={{ color: t.fgDim, fontSize: 11 }}>[Ln {m.startLineNumber}, Col {m.startColumn}]</span>
    </div>
  );
}

// ── Outline panel content ────────────────────────────────────
function OutlineContent({ currentFileUri, eventBus }: { currentFileUri: string; eventBus: BottomPanelProps["eventBus"] }) {
  const { tokens: t } = useTheme();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!currentFileUri) return;
    const model = monaco.editor.getModels().find((m) => m.uri.path.replace(/^\//, "") === currentFileUri);
    if (!model) return;
    const disposable = model.onDidChangeContent(() => {
      symbolVersions.delete(currentFileUri);
      forceUpdate((n) => n + 1);
    });
    return () => disposable.dispose();
  }, [currentFileUri]);

  if (!currentFileUri) {
    return <div style={{ color: t.fgDim, fontSize: 13, padding: "8px 12px" }}>No file is open. Open a file to see its outline.</div>;
  }

  const model = monaco.editor.getModels().find((m) => m.uri.path.replace(/^\//, "") === currentFileUri);
  if (!model) {
    return <div style={{ color: t.fgDim, fontSize: 13, padding: "8px 12px" }}>No active file. Open a file to see its outline.</div>;
  }

  const symbols = getSymbols(currentFileUri, model);
  const kindColors: Record<string, string> = {
    function: "#dcdcaa", class: "#4ec9b0", interface: "#4ec9b0",
    enum: "#4ec9b0", component: "#4ec9b0", store: "#c586c0",
    variable: "#9cdcfe", import: "#569cd6",
  };

  if (symbols.length === 0) {
    return <div style={{ color: t.fgDim, fontSize: 13, padding: "8px 12px" }}>No symbols found in this file.</div>;
  }

  return (
    <>
      <div style={{ padding: "6px 12px", fontSize: 11, color: t.fgDim, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>Outline — {currentFileUri}</span>
      </div>
      <div style={{ overflowY: "auto", fontSize: 13 }}>
        {symbols.map((sym, i) => (
          <SymbolRow key={`${sym.name}-${sym.line}-${i}`} sym={sym} kindColor={kindColors[sym.kind] || t.fgDim} onClick={() => eventBus.emit(FileEvents.Open, { uri: currentFileUri, name: currentFileUri.split("/").pop() })} />
        ))}
      </div>
    </>
  );
}

function SymbolRow({ sym, kindColor, onClick }: { sym: SymbolEntry; kindColor: string; onClick: () => void }) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: `3px 12px 3px ${12 + sym.indent * 16}px`, display: "flex",
        alignItems: "center", gap: 8, cursor: "pointer", color: t.fg,
        background: hovered ? t.listHover : "transparent",
      }}
    >
      <span style={{ color: kindColor, fontWeight: 600, width: 14, textAlign: "center", fontSize: 12 }}>{sym.icon}</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sym.name}</span>
      <span style={{ color: t.fgDim, fontSize: 10, opacity: 0.7 }}>{sym.kind}</span>
      <span style={{ color: t.fgDim, fontSize: 11 }}>Ln {sym.line}</span>
    </div>
  );
}

// ── Terminal panel content ───────────────────────────────────
function TerminalContent() {
  const { tokens: t } = useTheme();
  const [history, setHistory] = useState<string[]>([
    `<span style="color:#89d185;">Welcome to Monaco Vanced Terminal</span>`,
    `<span style="color:${t.fgDim};">Type commands here. Try: help, ls, pwd, echo, clear</span>`,
    "",
  ]);
  const [inputVal, setInputVal] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCommand = (cmd: string) => {
    const prompt = `<span style="color:#89d185;">user@monaco-vanced</span>:<span style="color:#569cd6;">~/project</span>$ ${escapeHtml(cmd)}`;
    const output = execCmd(cmd, t);
    setHistory((prev) => [...prev, prompt, ...(output ? [output] : [])]);
    setInputVal("");
    requestAnimationFrame(() => {
      if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
    });
  };

  return (
    <div style={{ color: t.fg, fontSize: 13, display: "flex", flexDirection: "column", height: "100%" }}>
      <div ref={outputRef} style={{ flex: 1, whiteSpace: "pre-wrap", overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: history.join("\n") }} />
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 4 }}>
        <span dangerouslySetInnerHTML={{ __html: `<span style="color:#89d185;">user@monaco-vanced</span>:<span style="color:#569cd6;">~/project</span>$ ` }} />
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCommand(inputVal.trim()); }}
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: t.fg, fontFamily: "inherit", fontSize: 13, padding: 0,
          }}
        />
      </div>
    </div>
  );
}

function execCmd(cmd: string, t: Record<string, string>): string {
  const parts = cmd.split(" ");
  const base = parts[0];
  switch (base) {
    case "help": return `<span style="color:${t.fgDim};">Available commands: help, ls, pwd, echo, clear, date, whoami, cat, node -v, npm -v</span>`;
    case "clear": return "__CLEAR__";
    case "ls": return `<span style="color:#569cd6;">src/</span>  <span style="color:#569cd6;">public/</span>  <span style="color:${t.fg};">package.json</span>  <span style="color:${t.fg};">tsconfig.json</span>  <span style="color:${t.fg};">README.md</span>  <span style="color:${t.fg};">vite.config.ts</span>`;
    case "pwd": return "/home/user/project";
    case "echo": return parts.slice(1).join(" ");
    case "date": return new Date().toString();
    case "whoami": return "user";
    case "cat": return parts[1] ? `<span style="color:${t.fgDim};">cat: ${escapeHtml(parts[1])}: Use the editor to view files</span>` : `<span style="color:${t.errorRed};">cat: missing operand</span>`;
    case "node": return "v22.0.0";
    case "npm": return "10.9.0";
    case "bun": return "1.2.0";
    case "git": return parts[1] === "status" ? `<span style="color:#89d185;">On branch main\nYour branch is up to date.</span>` : `<span style="color:${t.fgDim};">git: command simulated</span>`;
    case "": return "";
    default: return `<span style="color:${t.errorRed};">bash: ${escapeHtml(base)}: command not found</span>`;
  }
}

// ── Main BottomPanel Component ───────────────────────────────
export function BottomPanel({ eventBus, files = [] }: BottomPanelProps) {
  const { tokens: t } = useTheme();
  const [visible, setVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Terminal");
  const [currentFileUri, setCurrentFileUri] = useState("");
  const [problemsCount, setProblemsCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Resize state
  const [height, setHeight] = useState(200);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  // Toggle visibility
  useEffect(() => {
    const onToggle = () => setVisible((v) => !v);
    eventBus.on(PanelEvents.BottomToggle, onToggle);
    return () => { eventBus.off(PanelEvents.BottomToggle, onToggle); };
  }, [eventBus]);

  // Track current file for Outline
  useEffect(() => {
    const onOpen = (p: unknown) => { setCurrentFileUri((p as { uri: string }).uri); };
    eventBus.on(FileEvents.Open, onOpen);
    return () => { eventBus.off(FileEvents.Open, onOpen); };
  }, [eventBus]);

  // Problems badge count
  useEffect(() => {
    const disposable = monaco.editor.onDidChangeMarkers(() => {
      const count = monaco.editor.getModelMarkers({}).filter((m) => {
        const uri = m.resource.path.replace(/^\//, "");
        return uri && !uri.startsWith("__") && m.resource.scheme !== "inmemory";
      }).length;
      setProblemsCount(count);
    });
    return () => disposable.dispose();
  }, []);

  // Resize handler
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newH = Math.max(100, Math.min(500, startH.current - (e.clientY - startY.current)));
      setHeight(newH);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  if (!visible) return null;

  const panelStyle: CSSProperties = {
    display: "flex", flexDirection: "column", height, minHeight: 100,
    borderTop: `1px solid ${t.border}`, background: t.panelBg, position: "relative",
  };

  return (
    <div ref={panelRef} style={panelStyle}>
      {/* Resize handle */}
      <div
        style={{ position: "absolute", top: -2, left: 0, right: 0, height: 4, cursor: "ns-resize", zIndex: 5 }}
        onMouseDown={(e) => {
          dragging.current = true;
          startY.current = e.clientY;
          startH.current = height;
          document.body.style.cursor = "ns-resize";
          document.body.style.userSelect = "none";
        }}
      />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 35, minHeight: 35, padding: "0 8px 0 12px",
        background: t.panelHeaderBg, borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, height: "100%" }}>
          {PANEL_TABS.map((tab) => (
            <PanelTab
              key={tab}
              label={tab}
              isActive={tab === activeTab}
              badge={tab === "Problems" ? problemsCount : undefined}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            title="Close Panel"
            onClick={() => setVisible(false)}
            style={{ cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: t.fgDim }}
            dangerouslySetInnerHTML={{ __html: `<svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor"/></svg>` }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, overflow: "auto", padding: "8px 12px",
        fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 13,
      }}>
        {activeTab === "Terminal" && <TerminalContent />}
        {activeTab === "Problems" && <ProblemsContent eventBus={eventBus} />}
        {activeTab === "Outline" && <OutlineContent currentFileUri={currentFileUri} eventBus={eventBus} />}
        {activeTab === "Output" && (
          <div style={{ color: t.fgDim, fontSize: 13 }}>
            [{new Date().toLocaleTimeString()}] [monaco-vanced] IDE ready<br />
            [{new Date().toLocaleTimeString()}] [monaco-vanced] {files.length} files loaded<br />
            [{new Date().toLocaleTimeString()}] [monaco-vanced] All plugins mounted successfully
          </div>
        )}
        {activeTab === "Debug Console" && (
          <div style={{ color: t.fgDim, fontSize: 13 }}>Debug Console — No active session. Start a debug session to see output here.</div>
        )}
      </div>
    </div>
  );
}
