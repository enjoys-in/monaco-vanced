// ── Command Palette — React ──────────────────────────────────

import { useState, useEffect, useRef, useCallback, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../theme";
import { HeaderEvents } from "@enjoys/monaco-vanced/core/events";

export interface CommandPaletteProps {
  eventBus: { emit(ev: string, payload: unknown): void; on(ev: string, fn: (p: unknown) => void): void; off(ev: string, fn: (p: unknown) => void): void };
  commandApi?: { execute(id: string, ...args: unknown[]): void; search?(query: string): { id: string; label?: string }[]; getAll?(): { id: string; label?: string }[] | string[] };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function CommandPalette({ eventBus, commandApi }: CommandPaletteProps) {
  const { tokens: t } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(">");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setIsOpen(false); setQuery(">"); setHighlightIdx(0); }, []);
  const open = useCallback(() => { setIsOpen(true); setQuery(">"); setHighlightIdx(0); }, []);

  // Get filtered commands
  const getCommands = useCallback(() => {
    const cleaned = query.replace(/^>\s*/, "");
    if (commandApi?.search) return commandApi.search(cleaned).slice(0, 50);
    const all = commandApi?.getAll?.() ?? [];
    if (!cleaned) return all.slice(0, 50);
    const lower = cleaned.toLowerCase();
    return all.filter((cmd) => {
      const label = typeof cmd === "string" ? cmd : ((cmd as any).label ?? (cmd as any).id);
      return label.toLowerCase().includes(lower);
    }).slice(0, 50);
  }, [query, commandApi]);

  const commands = isOpen ? getCommands() : [];

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
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx((i) => Math.min(i + 1, commands.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") {
      const cmd = commands[highlightIdx];
      if (cmd) {
        const id = typeof cmd === "string" ? cmd : (cmd as any).id;
        close();
        commandApi?.execute(id);
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
        placeholder=">"
        style={{
          width: "100%", padding: "8px 14px", background: t.inputBg,
          border: "none", borderBottom: `1px solid ${t.border}`,
          borderRadius: 0, fontSize: 13, boxSizing: "border-box",
          color: t.fg, outline: "none",
        }}
      />
      <div ref={listRef} style={{ maxHeight: 300, overflowY: "auto" }}>
        {commands.map((cmd, i) => {
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
        })}
      </div>
    </div>,
    document.body,
  );
}
