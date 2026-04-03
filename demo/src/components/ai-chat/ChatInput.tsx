// ── Chat Input — textarea, mentions, slash commands, attachments ─

import { useState, useRef, useCallback, type CSSProperties, type KeyboardEvent, type ChangeEvent } from "react";
import type { ThemeTokens } from "../theme";
import type { AttachedSymbol, AttachedSelection, MentionItem, ChatIndexerApi, ChatFile, ChatEventBus, SlashCommand } from "./types";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import {
  SendIcon, StopIcon, AttachIcon, SelectionIcon, HashIcon, FileIcon, SymbolIcon,
  symbolKindColor, symbolKindLabel, symbolKindIcon, fileColor,
  SLASH_COMMANDS, getEditorSelectionDetail,
} from "./constants";

// ── Props ────────────────────────────────────────────────────
export interface ChatInputProps {
  tokens: ThemeTokens;
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onAbort: () => void;
  isStreaming: boolean;
  attachedFiles: string[];
  attachedSymbols: AttachedSymbol[];
  attachedSelection: AttachedSelection | null;
  onAddFile: (uri: string) => void;
  onRemoveFile: (uri: string) => void;
  onAddSymbol: (sym: { name: string; kind: string; path: string; line: number }) => void;
  onRemoveSymbol: (key: string) => void;
  onSetSelection: (sel: AttachedSelection | null) => void;
  indexerApi?: ChatIndexerApi;
  files: ChatFile[];
  eventBus: ChatEventBus;
}

export function ChatInput({
  tokens: t, input, onInputChange, onSend, onAbort, isStreaming,
  attachedFiles, attachedSymbols, attachedSelection,
  onAddFile, onRemoveFile, onAddSymbol, onRemoveSymbol, onSetSelection,
  indexerApi, files, eventBus,
}: ChatInputProps) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMode, setMentionMode] = useState<"file" | "symbol">("file");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIdx, setSlashIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);

  // ── Filtered items ─────────────────────────────────────────
  const filteredFiles = mentionQuery
    ? files.filter((f) => f.uri.toLowerCase().includes(mentionQuery.toLowerCase()) || f.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : files.slice(0, 8);

  const filteredSymbols = (() => {
    if (!indexerApi?.isReady()) return [];
    if (mentionQuery) return indexerApi.query({ query: mentionQuery }).slice(0, 10);
    const model = window.editor as { getModel(): { uri: { path: string } } | null } | undefined;
    const currentPath = model?.getModel()?.uri.path?.replace(/^\/+/, "") ?? "";
    if (currentPath) return indexerApi.getFileSymbols(currentPath).slice(0, 10);
    return [];
  })();

  const filteredSlash: SlashCommand[] = slashQuery
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith("/" + slashQuery.toLowerCase()))
    : SLASH_COMMANDS;

  const mentionItems: MentionItem[] = mentionMode === "file"
    ? filteredFiles.map((f) => ({ id: f.uri, label: f.uri, secondary: f.name, kind: "file" as const, color: fileColor(f.name) }))
    : filteredSymbols.map((s) => ({ id: `${s.path}:${s.name}:${s.line}`, label: s.name, secondary: `${symbolKindLabel(s.kind)} — ${s.path}:${s.line}`, kind: "symbol" as const, color: symbolKindColor(s.kind), _sym: s }));

  // ── Mention handlers ───────────────────────────────────────
  const addFileAttachment = useCallback((uri: string) => {
    onAddFile(uri);
    onInputChange((() => { const atIdx = input.lastIndexOf("@"); return atIdx >= 0 ? input.slice(0, atIdx) : input; })());
    setMentionOpen(false); setMentionQuery(""); setMentionIdx(0);
    inputRef.current?.focus();
  }, [input, onAddFile, onInputChange]);

  const addSymbolAttachment = useCallback((sym: { name: string; kind: string; path: string; line: number }) => {
    onAddSymbol(sym);
    onInputChange((() => { const hashIdx = input.lastIndexOf("#"); return hashIdx >= 0 ? input.slice(0, hashIdx) : input; })());
    setMentionOpen(false); setMentionQuery(""); setMentionIdx(0);
    inputRef.current?.focus();
  }, [input, onAddSymbol, onInputChange]);

  const openFileReference = useCallback((uri: string) => {
    const name = uri.split("/").pop() ?? uri;
    eventBus.emit(FileEvents.Open, { uri, label: name });
  }, [eventBus]);

  // ── Key handling ───────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashIdx((i) => Math.min(i + 1, filteredSlash.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cmd = filteredSlash[slashIdx];
        if (cmd) { onInputChange(cmd.cmd + " "); setSlashOpen(false); setSlashQuery(""); setSlashIdx(0); }
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setSlashOpen(false); return; }
    }
    if (mentionOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, mentionItems.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = mentionItems[mentionIdx];
        if (item) {
          if (item.kind === "file") addFileAttachment(item.id);
          else if (item.kind === "symbol" && item._sym) addSymbolAttachment(item._sym);
        }
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); setMentionOpen(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onInputChange(val);

    if (val.startsWith("/")) {
      const afterSlash = val.slice(1).split(" ")[0] ?? "";
      if (!val.includes(" ")) {
        setSlashOpen(true); setSlashQuery(afterSlash); setSlashIdx(0); setMentionOpen(false);
        return;
      }
    }
    setSlashOpen(false);

    const hashIdx = val.lastIndexOf("#");
    const atIdx = val.lastIndexOf("@");
    if (hashIdx >= 0 && hashIdx > atIdx) {
      const afterHash = val.slice(hashIdx + 1);
      if (!afterHash.includes("\n") && indexerApi?.isReady()) {
        setMentionOpen(true); setMentionMode("symbol"); setMentionQuery(afterHash); setMentionIdx(0);
        return;
      }
    }
    if (atIdx >= 0) {
      const afterAt = val.slice(atIdx + 1);
      if (!afterAt.includes("\n")) {
        setMentionOpen(true); setMentionMode("file"); setMentionQuery(afterAt); setMentionIdx(0);
        return;
      }
    }
    setMentionOpen(false);
  };

  const iconBtn: CSSProperties = {
    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", borderRadius: 4, border: "none", background: "transparent",
    color: t.fgDim, padding: 0,
  };

  return (
    <div style={{ padding: "8px 12px 12px", borderTop: `1px solid ${t.border}`, background: t.sidebarBg }}>
      {isStreaming && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px 0", fontSize: 11, color: t.fgDim }}>
          <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>●</span>
          <span>Copilot is thinking…</span>
        </div>
      )}

      {/* Attached chips */}
      {(attachedFiles.length > 0 || attachedSymbols.length > 0 || attachedSelection) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {attachedFiles.map((uri) => {
            const name = uri.split("/").pop() ?? uri;
            return (
              <span key={uri} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 4, fontSize: 12,
                background: t.cardBg, border: `1px solid ${t.border}`, color: t.fg,
                cursor: "pointer",
              }}>
                <span dangerouslySetInnerHTML={{ __html: FileIcon }} onClick={() => openFileReference(uri)} style={{ color: fileColor(name), flexShrink: 0 }} title={`Open ${uri}`} />
                <span onClick={() => openFileReference(uri)} style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={`Open ${uri}`}>{name}</span>
                <span style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }} onClick={() => onRemoveFile(uri)} title="Remove">×</span>
              </span>
            );
          })}
          {attachedSymbols.map((sym) => {
            const key = `${sym.file}:${sym.name}:${sym.line}`;
            return (
              <span key={key} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 4, fontSize: 12,
                background: t.cardBg, border: `1px solid ${t.border}`, color: t.fg,
                cursor: "pointer",
              }}
                onClick={() => { const name = sym.file.split("/").pop() ?? sym.file; eventBus.emit(FileEvents.Open, { uri: sym.file, label: name, line: sym.line }); }}
                title={`Open ${sym.file}:${sym.line}`}
              >
                <span dangerouslySetInnerHTML={{ __html: symbolKindIcon(sym.kind) }} style={{ color: symbolKindColor(sym.kind), flexShrink: 0 }} />
                <span style={{ color: symbolKindColor(sym.kind), fontWeight: 500 }}>{sym.name}</span>
                <span style={{ fontSize: 10, color: t.fgDim }}>{symbolKindLabel(sym.kind)}</span>
                <span style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }} onClick={(e) => { e.stopPropagation(); onRemoveSymbol(key); }} title="Remove">×</span>
              </span>
            );
          })}
          {attachedSelection && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 4, fontSize: 12,
              background: t.cardBg, border: `1px solid ${t.border}`, color: t.fg,
            }}>
              <span dangerouslySetInnerHTML={{ __html: SelectionIcon }} style={{ color: "#569cd6", flexShrink: 0 }} />
              <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {attachedSelection.file.split("/").pop()} L{attachedSelection.startLine}-{attachedSelection.endLine}
              </span>
              <span style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }} onClick={() => onSetSelection(null)} title="Remove">×</span>
            </span>
          )}
        </div>
      )}

      {/* Input row */}
      <div style={{ position: "relative" }}>
        {/* Slash command dropdown */}
        {slashOpen && filteredSlash.length > 0 && (
          <div style={{
            position: "absolute", bottom: "100%", left: 0, right: 0,
            background: t.menuBg, border: `1px solid ${t.border}`,
            borderRadius: 6, boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
            maxHeight: 220, overflowY: "auto", zIndex: 10, marginBottom: 4,
          }}>
            <div style={{ padding: "4px 8px", fontSize: 11, color: t.fgDim, borderBottom: `1px solid ${t.border}` }}>
              Slash Commands
            </div>
            {filteredSlash.map((cmd, i) => (
              <div
                key={cmd.cmd}
                onClick={() => { onInputChange(cmd.cmd + " "); setSlashOpen(false); setSlashQuery(""); setSlashIdx(0); inputRef.current?.focus(); }}
                onMouseEnter={() => setSlashIdx(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 8px", cursor: "pointer", fontSize: 12,
                  background: i === slashIdx ? t.listHover : "transparent",
                  color: t.fg,
                }}
              >
                <span style={{ fontWeight: 600, color: cmd.color }}>{cmd.cmd}</span>
                <span style={{ color: t.fgDim, fontSize: 11, flex: 1 }}>{cmd.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mention dropdown */}
        {mentionOpen && mentionItems.length > 0 && (
          <div
            ref={mentionRef}
            style={{
              position: "absolute", bottom: "100%", left: 0, right: 0,
              background: t.menuBg, border: `1px solid ${t.border}`,
              borderRadius: 6, boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
              maxHeight: 220, overflowY: "auto", zIndex: 10, marginBottom: 4,
            }}
          >
            <div style={{ padding: "4px 8px", fontSize: 11, color: t.fgDim, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 4 }}>
              <span dangerouslySetInnerHTML={{ __html: mentionMode === "file" ? FileIcon : HashIcon }} style={{ color: t.fgDim }} />
              {mentionMode === "file" ? "Attach file as context" : "Reference a symbol"}
            </div>
            {mentionItems.map((item, i) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.kind === "file") addFileAttachment(item.id);
                  else if (item.kind === "symbol" && item._sym) addSymbolAttachment(item._sym);
                }}
                onMouseEnter={() => setMentionIdx(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "5px 8px", cursor: "pointer", fontSize: 12,
                  background: i === mentionIdx ? t.listHover : "transparent",
                  color: t.fg,
                }}
              >
                {item.kind === "file" ? (
                  <span dangerouslySetInnerHTML={{ __html: FileIcon }} style={{ color: item.color, flexShrink: 0 }} />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: symbolKindIcon(item._sym?.kind ?? "variable") }} style={{ color: item.color, flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ color: item.kind === "symbol" ? item.color : t.fg }}>{item.label}</span>
                  {item.secondary && <span style={{ color: t.fgDim, fontSize: 11, marginLeft: 6 }}>{item.secondary}</span>}
                </span>
                {item.kind === "file" && attachedFiles.includes(item.id) && (
                  <span style={{ fontSize: 10, color: t.accent }}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "flex-end", gap: 6,
          background: t.inputBg, borderRadius: 8,
          border: `1px solid ${t.inputBorder}`, padding: "6px 8px",
        }}>
          <button
            title="Attach file (@)"
            style={{ ...iconBtn, flexShrink: 0 }}
            onClick={() => { setMentionOpen(!mentionOpen); setMentionMode("file"); setMentionQuery(""); inputRef.current?.focus(); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            dangerouslySetInnerHTML={{ __html: AttachIcon }}
          />
          <button
            title="Attach selection"
            style={{ ...iconBtn, flexShrink: 0 }}
            onClick={() => { const sel = getEditorSelectionDetail(); if (sel) onSetSelection(sel); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            dangerouslySetInnerHTML={{ __html: SelectionIcon }}
          />
          {indexerApi && (
            <button
              title="Reference symbol (#)"
              style={{ ...iconBtn, flexShrink: 0 }}
              onClick={() => { setMentionOpen(!mentionOpen); setMentionMode("symbol"); setMentionQuery(""); inputRef.current?.focus(); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              dangerouslySetInnerHTML={{ __html: HashIcon }}
            />
          )}
          <textarea
            ref={inputRef}
            style={{
              flex: 1, border: "none", background: "transparent",
              color: t.fg, fontSize: 13, lineHeight: "1.4",
              resize: "none", outline: "none", padding: "2px 0",
              fontFamily: "inherit", minHeight: 20, maxHeight: 120,
            }}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot… (@ file, # symbol, / command)"
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
            onBlur={() => { setTimeout(() => setMentionOpen(false), 200); }}
          />
          <button
            style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 6, border: "none", cursor: "pointer",
              background: isStreaming ? t.errorRed : t.accent,
              color: "#fff", padding: 0, flexShrink: 0,
              opacity: (input.trim() || isStreaming) ? 1 : 0.4,
            }}
            onClick={() => isStreaming ? onAbort() : onSend()}
            title={isStreaming ? "Stop" : "Send (Enter)"}
            dangerouslySetInnerHTML={{ __html: isStreaming ? StopIcon : SendIcon }}
          />
        </div>
      </div>
    </div>
  );
}
