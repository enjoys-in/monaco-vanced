// ── Chat Message Bubble — user & assistant rendering ─────────

import type { CSSProperties } from "react";
import type { ThemeTokens } from "../theme";
import type { ChatMessage, AttachedSymbol, AttachedSelection, ChatEventBus, ChatIconApi } from "./types";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import {
  SparkleIcon, FileIcon, SelectionIcon,
  symbolKindColor, symbolKindLabel, symbolKindIcon, fileColor,
  renderContent, formatTime,
} from "./constants";

export interface ChatMessageListProps {
  messages: ChatMessage[];
  tokens: ThemeTokens;
  eventBus: ChatEventBus;
  iconApi?: ChatIconApi;
}

export function ChatMessageList({ messages, tokens: t, eventBus, iconApi }: ChatMessageListProps) {
  const openFile = (uri: string, line?: number) => {
    const name = uri.split("/").pop() ?? uri;
    eventBus.emit(FileEvents.Open, { uri, label: name, line });
  };

  const S: Record<string, CSSProperties> = {
    userMsg: { display: "flex", flexDirection: "column", alignItems: "flex-end", marginBottom: 12 },
    userBubble: {
      maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 2px 12px",
      background: t.accent, color: "#fff",
      fontSize: 13, lineHeight: "1.45", wordBreak: "break-word",
    },
    assistantMsg: { display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-start" },
    assistantAvatar: {
      width: 24, height: 24, minWidth: 24, borderRadius: "50%",
      background: `linear-gradient(135deg, ${t.accent}, ${t.accentAlt || t.accent})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 12,
    },
    assistantBubble: {
      maxWidth: "85%", padding: "8px 12px", borderRadius: "2px 12px 12px 12px",
      background: t.cardBg, border: `1px solid ${t.border}`,
      fontSize: 13, lineHeight: "1.5", color: t.fg, wordBreak: "break-word",
    },
    timestamp: { fontSize: 10, color: t.fgDim, marginTop: 2, padding: "0 4px" },
  };

  return (
    <>
      {messages.map((msg) =>
        msg.role === "user" ? (
          <UserBubble key={msg.id} msg={msg} tokens={t} styles={S} onOpenFile={openFile} iconApi={iconApi} />
        ) : msg.role === "assistant" ? (
          <AssistantBubble key={msg.id} msg={msg} tokens={t} styles={S} />
        ) : null,
      )}
    </>
  );
}

// ── User bubble ──────────────────────────────────────────────
interface UserBubbleProps {
  msg: ChatMessage;
  tokens: ThemeTokens;
  styles: Record<string, CSSProperties>;
  onOpenFile: (uri: string, line?: number) => void;
  iconApi?: ChatIconApi;
}

function UserBubble({ msg, tokens: t, styles: S, onOpenFile, iconApi }: UserBubbleProps) {
  const hasAttach = (msg.attachedFiles?.length ?? 0) > 0 || (msg.attachedSymbols?.length ?? 0) > 0 || !!msg.attachedSelection;

  return (
    <div style={S.userMsg}>
      {hasAttach && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, justifyContent: "flex-end" }}>
          {msg.attachedFiles?.map((uri) => (
            <FileChip key={uri} uri={uri} tokens={t} onClick={() => onOpenFile(uri)} iconApi={iconApi} />
          ))}
          {msg.attachedSymbols?.map((sym) => (
            <SymbolChip key={`${sym.file}:${sym.name}:${sym.line}`} sym={sym} tokens={t} onClick={() => onOpenFile(sym.file, sym.line)} />
          ))}
          {msg.attachedSelection && <SelectionChip sel={msg.attachedSelection} tokens={t} />}
        </div>
      )}
      <div style={S.userBubble}>{msg.content}</div>
      <div style={S.timestamp}>{formatTime(msg.timestamp)}</div>
    </div>
  );
}

// ── Assistant bubble ─────────────────────────────────────────
interface AssistantBubbleProps {
  msg: ChatMessage;
  tokens: ThemeTokens;
  styles: Record<string, CSSProperties>;
}

function AssistantBubble({ msg, tokens: _t, styles: S }: AssistantBubbleProps) {
  const isThinking = msg.content === "Thinking…";

  return (
    <div style={S.assistantMsg}>
      <div style={S.assistantAvatar}>
        <span dangerouslySetInnerHTML={{ __html: SparkleIcon.replace('width="16"', 'width="14"').replace('height="16"', 'height="14"') }} />
      </div>
      <div>
        <div
          style={{ ...S.assistantBubble, ...(isThinking ? { fontStyle: "italic", opacity: 0.7 } : {}) }}
          dangerouslySetInnerHTML={{ __html: isThinking ? "Thinking…" : renderContent(msg.content) }}
        />
        <div style={S.timestamp}>{formatTime(msg.timestamp)}</div>
      </div>
    </div>
  );
}

// ── Chips (file, symbol, selection) ──────────────────────────
function FileChip({ uri, tokens: t, onClick, iconApi }: { uri: string; tokens: ThemeTokens; onClick: () => void; iconApi?: ChatIconApi }) {
  const name = uri.split("/").pop() ?? uri;
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 6px", borderRadius: 4, fontSize: 11,
        background: t.hover, color: t.fgDim,
        cursor: "pointer",
      }}
      title={`Open ${uri}`}
    >
      {iconApi ? (
        <img src={iconApi.getFileIcon(name)} width={14} height={14} style={{ display: "block" }} alt="" onError={(e) => { (e.target as HTMLImageElement).replaceWith(document.createRange().createContextualFragment(FileIcon)); }} />
      ) : (
        <span dangerouslySetInnerHTML={{ __html: FileIcon }} style={{ color: fileColor(name) }} />
      )}
      {name}
    </span>
  );
}

function SymbolChip({ sym, tokens: t, onClick }: { sym: AttachedSymbol; tokens: ThemeTokens; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        padding: "2px 6px", borderRadius: 4, fontSize: 11,
        background: "rgba(255,255,255,0.1)", color: t.fgDim,
        cursor: "pointer",
      }}
      title={`Open ${sym.file}:${sym.line}`}
    >
      <span dangerouslySetInnerHTML={{ __html: symbolKindIcon(sym.kind) }} style={{ display: "inline-flex", color: symbolKindColor(sym.kind), flexShrink: 0 }} />
      <span style={{ color: symbolKindColor(sym.kind), fontWeight: 500 }}>{sym.name}</span>
      <span style={{ fontSize: 10, color: t.fgDim }}>{symbolKindLabel(sym.kind)}</span>
    </span>
  );
}

function SelectionChip({ sel, tokens: t }: { sel: AttachedSelection; tokens: ThemeTokens }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 6px", borderRadius: 4, fontSize: 11,
      background: "rgba(255,255,255,0.1)", color: t.fgDim,
    }}>
      <span dangerouslySetInnerHTML={{ __html: SelectionIcon }} style={{ color: "#569cd6" }} />
      <span>L{sel.startLine}-{sel.endLine}</span>
    </span>
  );
}
