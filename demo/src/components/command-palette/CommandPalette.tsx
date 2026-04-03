// ── Command Palette — React ──────────────────────────────────

import { useState, useEffect, useRef, useCallback, useMemo, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import * as monaco from "monaco-editor";
import { useTheme } from "../theme";
import { HeaderEvents } from "@enjoys/monaco-vanced/core/events";
import type { ExplorerIconAPI } from "../../explorer";

// Symbol kind → codicon-like label
const SYMBOL_ICONS: Record<number, { icon: string; color: string }> = {
  0 /* File */: { icon: "📄", color: "#cccccc" },
  1 /* Module */: { icon: "📦", color: "#ce9178" },
  2 /* Namespace */: { icon: "🏷", color: "#4ec9b0" },
  4 /* Class */: { icon: "◆", color: "#4ec9b0" },
  5 /* Method */: { icon: "ƒ", color: "#dcdcaa" },
  6 /* Property */: { icon: "◇", color: "#9cdcfe" },
  8 /* Constructor */: { icon: "◆", color: "#dcdcaa" },
  9 /* Enum */: { icon: "▤", color: "#b5cea8" },
  10 /* Interface */: { icon: "◇", color: "#4ec9b0" },
  11 /* Function */: { icon: "ƒ", color: "#dcdcaa" },
  12 /* Variable */: { icon: "𝑥", color: "#9cdcfe" },
  13 /* Constant */: { icon: "π", color: "#4fc1ff" },
  22 /* Struct */: { icon: "◆", color: "#4ec9b0" },
  25 /* TypeParameter */: { icon: "T", color: "#4ec9b0" },
};

export interface CommandPaletteProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  commandApi?: { execute(id: string, ...args: unknown[]): void; search?(query: string): { id: string; label?: string }[]; getAll?(): { id: string; label?: string }[] | string[] };
  editor?: monaco.editor.IStandaloneCodeEditor;
  iconApi?: ExplorerIconAPI;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function CommandPalette({ eventBus, commandApi, editor, iconApi }: CommandPaletteProps) {
  const { tokens: t } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(">");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [symbols, setSymbols] = useState<monaco.languages.DocumentSymbol[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Detect mode: ">" = commands, "@" = symbols, else = file search (future)
  const mode = query.startsWith(">") ? "command" : query.startsWith("@") ? "symbol" : "command";

  const close = useCallback(() => { setIsOpen(false); setQuery(">"); setHighlightIdx(0); setSymbols([]); }, []);
  const open = useCallback(() => { setIsOpen(true); setQuery(">"); setHighlightIdx(0); }, []);

  // Fetch document symbols when @ mode is active
  useEffect(() => {
    if (!isOpen || mode !== "symbol" || !editor) { setSymbols([]); return; }
    const model = editor.getModel();
    if (!model) { setSymbols([]); return; }
    let cancelled = false;

    // Query all registered DocumentSymbolProviders for this language
    const providers = (monaco.languages as unknown as {
      DocumentSymbolProviderRegistry?: {
        ordered(model: monaco.editor.ITextModel): monaco.languages.DocumentSymbolProvider[];
      };
    }).DocumentSymbolProviderRegistry?.ordered(model) ?? [];

    if (providers.length === 0) { setSymbols([]); return; }

    (async () => {
      const allSymbols: monaco.languages.DocumentSymbol[] = [];
      for (const provider of providers) {
        try {
          const result = await provider.provideDocumentSymbols(model, new monaco.CancellationTokenSource().token);
          if (result && !cancelled) allSymbols.push(...result);
          break; // Use first provider that returns results
        } catch { /* skip */ }
      }
      if (!cancelled) setSymbols(allSymbols);
    })();

    return () => { cancelled = true; };
  }, [isOpen, mode, editor]);

  // Filter symbols by query
  const filteredSymbols = useMemo(() => {
    if (mode !== "symbol") return [];
    const q = query.slice(1).trim().toLowerCase();
    if (!q) return symbols;
    return symbols.filter((s) => s.name.toLowerCase().includes(q));
  }, [mode, query, symbols]);

  // Get filtered commands (command mode only)
  const getCommands = useCallback(() => {
    if (mode !== "command") return [];
    const cleaned = query.replace(/^>\s*/, "");
    if (commandApi?.search) return commandApi.search(cleaned).slice(0, 50);
    const all = commandApi?.getAll?.() ?? [];
    if (!cleaned) return all.slice(0, 50);
    const lower = cleaned.toLowerCase();
    return all.filter((cmd) => {
      const label = typeof cmd === "string" ? cmd : ((cmd as any).label ?? (cmd as any).id);
      return label.toLowerCase().includes(lower);
    }).slice(0, 50);
  }, [query, commandApi, mode]);

  const commands = isOpen && mode === "command" ? getCommands() : [];
  const items = mode === "symbol" ? filteredSymbols : commands;
  const itemCount = items.length;

  // Keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        isOpen ? close() : open();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close, open]);

  // Event bus open
  useEffect(() => {
    eventBus.on(HeaderEvents.CommandOpen, open);
    return () => { eventBus.off(HeaderEvents.CommandOpen, open); };
  }, [eventBus, open]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(query.length, query.length);
      });
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: globalThis.MouseEvent) => {
      const palette = document.querySelector(".vsc-cmd-palette-react");
      if (palette && !palette.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, itemCount - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") {
      if (mode === "symbol") {
        const sym = filteredSymbols[highlightIdx];
        if (sym && editor) {
          close();
          editor.revealLineInCenter(sym.range.startLineNumber);
          editor.setPosition({ lineNumber: sym.range.startLineNumber, column: sym.range.startColumn });
          editor.focus();
        }
      } else {
        const cmd = commands[highlightIdx];
        if (cmd) {
          const id = typeof cmd === "string" ? cmd : (cmd as any).id;
          close();
          commandApi?.execute(id);
        }
      }
    }
  };

  // Scroll highlight into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[highlightIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  if (!isOpen) return null;

  const palStyle: CSSProperties = {
    position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
    width: 600, maxWidth: "80vw", display: "flex", flexDirection: "column",
    zIndex: 9998, background: t.menuBg,
    border: `1px solid ${t.borderLight}`, borderTop: "none",
    borderRadius: "0 0 8px 8px", boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
    overflow: "hidden",
  };

  return createPortal(
    <div className="vsc-cmd-palette-react" style={palStyle}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setHighlightIdx(0); }}
        onKeyDown={handleKeyDown}
        className="vsc-input"
        placeholder={mode === "symbol" ? "@ Go to Symbol…" : "> Type a command…"}
        style={{
          width: "100%", padding: "8px 14px", background: t.inputBg,
          border: "none", borderBottom: `1px solid ${t.border}`,
          borderRadius: 0, fontSize: 13, boxSizing: "border-box",
          color: t.fg, outline: "none",
        }}
      />
      <div ref={listRef} style={{ maxHeight: 300, overflowY: "auto" }}>
        {mode === "symbol" ? (
          filteredSymbols.length === 0 ? (
            <div style={{ padding: "8px 14px", fontSize: 12, color: t.fgDim }}>
              {symbols.length === 0 ? "No symbols found in this file." : "No matching symbols."}
            </div>
          ) : filteredSymbols.map((sym, i) => {
            const si = SYMBOL_ICONS[sym.kind] ?? { icon: "?", color: t.fgDim };
            return (
              <div
                key={sym.name + sym.range.startLineNumber + i}
                onClick={() => {
                  if (editor) {
                    close();
                    editor.revealLineInCenter(sym.range.startLineNumber);
                    editor.setPosition({ lineNumber: sym.range.startLineNumber, column: sym.range.startColumn });
                    editor.focus();
                  }
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "4px 14px",
                  cursor: "pointer", fontSize: 13, minHeight: 28, color: t.fg,
                  background: i === highlightIdx ? t.listActive : "transparent",
                }}
              >
                <span style={{ width: 18, textAlign: "center", flexShrink: 0, color: si.color, fontSize: 14, fontWeight: 600 }}>
                  {si.icon}
                </span>
                <span style={{ flex: 1 }}>{sym.name}</span>
                <span style={{ fontSize: 11, color: t.fgDim, fontFamily: "monospace" }}>
                  {sym.detail || ""}
                </span>
                <span style={{ fontSize: 11, color: t.fgDim, marginLeft: 8 }}>
                  :{sym.range.startLineNumber}
                </span>
              </div>
            );
          })
        ) : (
          commands.map((cmd, i) => {
            const label = typeof cmd === "string" ? cmd : ((cmd as any).label ?? (cmd as any).id);
            const id = typeof cmd === "string" ? cmd : (cmd as any).id;
            return (
              <div
                key={id + i}
                onClick={() => { close(); commandApi?.execute(id); }}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  display: "flex", alignItems: "center", padding: "4px 14px",
                  cursor: "pointer", fontSize: 13, minHeight: 28, color: t.fg,
                  background: i === highlightIdx ? t.listActive : "transparent",
                }}
              >
                <span style={{ flex: 1 }}>{escapeHtml(label)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}
