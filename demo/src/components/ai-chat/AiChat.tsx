// ── AI Chat Panel — Copilot-style right sidebar ──────────────

import { useState, useRef, useEffect, useCallback, type CSSProperties, type KeyboardEvent, type ChangeEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useTheme } from "../theme";
import { AiEvents } from "@enjoys/monaco-vanced/core/events";

// ── Types ────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  action?: "explain" | "generate" | "fix";
  attachedFiles?: string[];
}

export interface AiChatProps {
  eventBus: {
    emit(ev: string, payload: unknown): void;
    on(ev: string, fn: (p: unknown) => void): void;
    off(ev: string, fn: (p: unknown) => void): void;
  };
  aiApi: {
    chat(messages: { role: string; content: string }[], opts?: Record<string, unknown>): Promise<{ content: string; metadata?: Record<string, unknown> }>;
    abort(): void;
    getStatus(): string;
  };
  visible: boolean;
  onClose: () => void;
  files?: { uri: string; name: string }[];
}

// ── Sparkle icon SVG ─────────────────────────────────────────
const SparkleIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l1.7 4.3L14 7l-4.3 1.7L8 13l-1.7-4.3L2 7l4.3-1.7L8 1z"/></svg>`;
const SendIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1.5l14 6.5-14 6.5V9l10-1-10-1V1.5z"/></svg>`;
const StopIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="1"/></svg>`;
const CloseIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8.707l3.646 3.647.708-.708L8.707 8l3.647-3.646-.708-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.708L8 8.707z"/></svg>`;
const ClearIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.11 9.34l-.71.71L8 8.71l-2.4 2.34-.71-.71L7.29 8 4.89 5.66l.71-.71L8 7.29l2.4-2.34.71.71L8.71 8l2.4 2.34z"/></svg>`;
const AttachIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M11.006 3.73l-4.97 4.97a1.496 1.496 0 002.117 2.117l5.678-5.677a2.992 2.992 0 00-4.232-4.232L3.92 6.587a4.487 4.487 0 006.348 6.348l.007-.007 4.97-4.97-.707-.707-4.97 4.97-.007.007a3.488 3.488 0 01-4.934-4.934l5.678-5.678a1.992 1.992 0 112.818 2.818L7.454 11.11a.496.496 0 01-.703-.703l4.97-4.97-.707-.707z"/></svg>`;
const FileIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h8l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8z"/></svg>`;
const AtIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 107 7 1 1 0 00-2 0 5 5 0 11-5-5 3 3 0 013 3v1a1 1 0 01-2 0V7a1 1 0 012 0 3 3 0 11-3-3 5 5 0 015 5v1a3 3 0 01-6 0V7a5 5 0 00-5 5 7 7 0 007 7z"/></svg>`;

// ── File extension → color mapping ───────────────────────────
function fileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
    css: "#264de4", html: "#e34c26", json: "#292929", md: "#083fa1",
    py: "#3572A5", rs: "#dea584", go: "#00ADD8", svg: "#ffb13b",
  };
  return map[ext] || "#888";
}

// ── Suggested prompts ────────────────────────────────────────
const SUGGESTIONS = [
  { label: "Explain this code", icon: "💡", prompt: "Explain the currently selected code in detail" },
  { label: "Fix errors", icon: "🔧", prompt: "Find and fix any bugs or errors in the selected code" },
  { label: "Generate tests", icon: "🧪", prompt: "Generate unit tests for the selected code" },
  { label: "Refactor", icon: "✨", prompt: "Suggest a cleaner refactoring for this code" },
];

// ── Markdown-lite renderer ───────────────────────────────────
function renderContent(text: string): string {
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px 10px;border-radius:4px;overflow-x:auto;margin:6px 0;font-size:12px;line-height:1.45"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.25);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Bullet lists
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px">• $1</div>')
    // Numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:12px">$1. $2</div>')
    // Line breaks
    .replace(/\n/g, "<br/>");
}

// ── Component ────────────────────────────────────────────────
export function AiChat({ eventBus, aiApi, visible, onClose, files = [] }: AiChatProps) {
  const { tokens: t } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  const nextId = () => `msg-${++msgIdRef.current}`;

  // ── Resize handle logic ──────────────────────────────────
  const handleResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelRef.current?.offsetWidth ?? panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      const newW = Math.max(280, Math.min(700, startW - (ev.clientX - startX)));
      setPanelWidth(newW);
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  // ── File mention filtering ───────────────────────────────
  const filteredFiles = mentionQuery
    ? files.filter((f) => f.uri.toLowerCase().includes(mentionQuery.toLowerCase()) || f.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : files.slice(0, 8);

  const addFileAttachment = useCallback((uri: string) => {
    setAttachedFiles((prev) => prev.includes(uri) ? prev : [...prev, uri]);
    // Remove the @query from input
    setInput((prev) => {
      const atIdx = prev.lastIndexOf("@");
      return atIdx >= 0 ? prev.slice(0, atIdx) : prev;
    });
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIdx(0);
    inputRef.current?.focus();
  }, []);

  const removeAttachment = useCallback((uri: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f !== uri));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 100);
  }, [visible]);

  // Send a chat message
  const sendMessage = useCallback(async (text: string, action?: "explain" | "generate" | "fix") => {
    if (!text.trim() || isStreaming) return;

    const currentAttached = [...attachedFiles];
    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text.trim(), timestamp: Date.now(), action, attachedFiles: currentAttached.length > 0 ? currentAttached : undefined };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedFiles([]);
    setIsStreaming(true);

    // Add a placeholder for assistant
    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "Thinking…", timestamp: Date.now() }]);

    try {
      const prefix = action === "explain" ? "[EXPLAIN] " : action === "generate" ? "[GENERATE] " : action === "fix" ? "[FIX] " : "";
      // Build file context from attachments
      let fileContext = "";
      if (currentAttached.length > 0) {
        const fileSnippets = currentAttached.map((uri) => {
          const file = files.find((f) => f.uri === uri);
          return file ? `File: ${file.uri}` : null;
        }).filter(Boolean);
        fileContext = `\n\nReferenced files:\n${fileSnippets.join("\n")}`;
      }
      const res = await aiApi.chat([
        { role: "system", content: "You are a helpful AI coding assistant embedded in Monaco Vanced IDE." },
        ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: `${prefix}${text.trim()}${fileContext}` },
      ]);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: res.content, timestamp: Date.now() } : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m)));
    } finally {
      setIsStreaming(false);
    }
  }, [aiApi, isStreaming, messages, attachedFiles, files]);

  // Listen for context menu AI actions
  useEffect(() => {
    const handleExplain = () => {
      const sel = getEditorSelection();
      if (sel) sendMessage(`Explain this code:\n\`\`\`\n${sel}\n\`\`\``, "explain");
    };
    const handleGenerate = () => {
      const sel = getEditorSelection();
      sendMessage(sel ? `Generate code based on:\n\`\`\`\n${sel}\n\`\`\`` : "Generate a useful utility function", "generate");
    };
    const handleFix = () => {
      const sel = getEditorSelection();
      if (sel) sendMessage(`Fix this code:\n\`\`\`\n${sel}\n\`\`\``, "fix");
    };
    const handleChatResponse = (p: unknown) => {
      const { action, content } = p as { action?: string; content: string };
      if (action && content) {
        // If the response came from outside (e.g. command palette AI actions),
        // show it in the chat panel too
        const exists = messages.some((m) => m.content === content);
        if (!exists) {
          setMessages((prev) => [...prev, {
            id: nextId(), role: "assistant", content,
            timestamp: Date.now(), action: action as "explain" | "generate" | "fix",
          }]);
        }
      }
    };

    eventBus.on(AiEvents.Explain, handleExplain);
    eventBus.on(AiEvents.Generate, handleGenerate);
    eventBus.on(AiEvents.Fix, handleFix);
    eventBus.on(AiEvents.ChatResponse, handleChatResponse);

    return () => {
      eventBus.off(AiEvents.Explain, handleExplain);
      eventBus.off(AiEvents.Generate, handleGenerate);
      eventBus.off(AiEvents.Fix, handleFix);
      eventBus.off(AiEvents.ChatResponse, handleChatResponse);
    };
  }, [eventBus, sendMessage, messages]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => Math.min(i + 1, filteredFiles.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredFiles[mentionIdx]) addFileAttachment(filteredFiles[mentionIdx].uri);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    // Detect @ mention
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0) {
      const afterAt = val.slice(atIdx + 1);
      // Only open if no space before the query part (simple heuristic)
      if (!afterAt.includes("\n")) {
        setMentionOpen(true);
        setMentionQuery(afterAt);
        setMentionIdx(0);
      } else {
        setMentionOpen(false);
      }
    } else {
      setMentionOpen(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  if (!visible) return null;

  // ── Styles ───────────────────────────────────────────────
  const S: Record<string, CSSProperties> = {
    panel: {
      display: "flex", flexDirection: "column",
      width: panelWidth, minWidth: 280, height: "100%",
      background: t.sidebarBg,
      borderLeft: `1px solid ${t.border}`,
      overflow: "hidden", position: "relative",
    },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: 35, minHeight: 35, padding: "0 8px 0 12px",
      borderBottom: `1px solid ${t.border}`,
      background: t.panelHeaderBg,
    },
    headerTitle: {
      display: "flex", alignItems: "center", gap: 6,
      fontSize: 11, fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.5px", color: t.fgDim,
    },
    headerActions: { display: "flex", alignItems: "center", gap: 2 },
    iconBtn: {
      width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", borderRadius: 4, border: "none", background: "transparent",
      color: t.fgDim, padding: 0,
    },
    messages: {
      flex: 1, overflowY: "auto", overflowX: "hidden",
      padding: "12px 12px 8px",
    },
    empty: {
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      flex: 1, padding: 24, textAlign: "center", gap: 16,
    },
    emptyIcon: { color: t.accent, opacity: 0.7 },
    emptyTitle: { fontSize: 14, fontWeight: 600, color: t.fg },
    emptySubtitle: { fontSize: 12, color: t.fgDim, lineHeight: "1.5" },
    suggestions: {
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "100%", maxWidth: 300,
    },
    suggestionBtn: {
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 10px", borderRadius: 6,
      border: `1px solid ${t.border}`, background: t.cardBg,
      cursor: "pointer", fontSize: 12, color: t.fg, textAlign: "left",
    },
    userMsg: {
      display: "flex", flexDirection: "column", alignItems: "flex-end",
      marginBottom: 12,
    },
    userBubble: {
      maxWidth: "85%", padding: "8px 12px", borderRadius: "12px 12px 2px 12px",
      background: t.accent, color: "#fff",
      fontSize: 13, lineHeight: "1.45", wordBreak: "break-word",
    },
    assistantMsg: {
      display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-start",
    },
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
    inputArea: {
      padding: "8px 12px 12px", borderTop: `1px solid ${t.border}`,
      background: t.sidebarBg,
    },
    inputWrap: {
      display: "flex", alignItems: "flex-end", gap: 6,
      background: t.inputBg, borderRadius: 8,
      border: `1px solid ${t.inputBorder}`,
      padding: "6px 8px",
    },
    textarea: {
      flex: 1, border: "none", background: "transparent",
      color: t.fg, fontSize: 13, lineHeight: "1.4",
      resize: "none", outline: "none", padding: "2px 0",
      fontFamily: "inherit", minHeight: 20, maxHeight: 120,
    },
    sendBtn: {
      width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 6, border: "none", cursor: "pointer",
      background: isStreaming ? t.errorRed : t.accent,
      color: "#fff", padding: 0, flexShrink: 0,
      opacity: (input.trim() || isStreaming) ? 1 : 0.4,
    },
    statusLine: {
      display: "flex", alignItems: "center", gap: 4,
      padding: "4px 12px 0", fontSize: 11, color: t.fgDim,
    },
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div ref={panelRef} className="vsc-ai-chat" style={S.panel}>
      {/* Resize handle (left edge) */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: "absolute", left: -2, top: 0, bottom: 0, width: 4,
          cursor: "col-resize", zIndex: 5,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.accent; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      />

      {/* Header */}
      <div style={S.header}>
        <div style={S.headerTitle}>
          <span dangerouslySetInnerHTML={{ __html: SparkleIcon }} />
          <span>Copilot</span>
        </div>
        <div style={S.headerActions}>
          <button
            title="Clear chat"
            style={S.iconBtn}
            onClick={clearChat}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            dangerouslySetInnerHTML={{ __html: ClearIcon }}
          />
          <button
            title="Close panel"
            style={S.iconBtn}
            onClick={onClose}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            dangerouslySetInnerHTML={{ __html: CloseIcon }}
          />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="vsc-ai-chat-messages" style={S.messages}>
        {messages.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyIcon} dangerouslySetInnerHTML={{ __html: SparkleIcon.replace('width="16"', 'width="40"').replace('height="16"', 'height="40"') }} />
            <div style={S.emptyTitle}>How can I help you?</div>
            <div style={S.emptySubtitle}>
              Ask me about your code, or use the suggestions below to get started.
              <br />Type <strong>@</strong> to attach a file as context.
            </div>
            <div style={S.suggestions}>
              {SUGGESTIONS.map((s) => (
                <div
                  key={s.label}
                  style={S.suggestionBtn}
                  onClick={() => sendMessage(s.prompt)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.accent; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = t.border; }}
                >
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} style={S.userMsg}>
                {/* Attached file chips on user message */}
                {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, justifyContent: "flex-end" }}>
                    {msg.attachedFiles.map((uri) => {
                      const name = uri.split("/").pop() ?? uri;
                      return (
                        <span key={uri} style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "2px 6px", borderRadius: 4, fontSize: 11,
                          background: "rgba(255,255,255,0.1)", color: t.fgDim,
                        }}>
                          <span dangerouslySetInnerHTML={{ __html: FileIcon }} style={{ color: fileColor(name) }} />
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div style={S.userBubble}>{msg.content}</div>
                <div style={S.timestamp}>{formatTime(msg.timestamp)}</div>
              </div>
            ) : msg.role === "assistant" ? (
              <div key={msg.id} style={S.assistantMsg}>
                <div style={S.assistantAvatar}>
                  <span dangerouslySetInnerHTML={{ __html: SparkleIcon.replace('width="16"', 'width="14"').replace('height="16"', 'height="14"') }} />
                </div>
                <div>
                  <div
                    style={{
                      ...S.assistantBubble,
                      ...(msg.content === "Thinking…" ? { fontStyle: "italic", opacity: 0.7 } : {}),
                    }}
                    dangerouslySetInnerHTML={{ __html: msg.content === "Thinking…" ? "Thinking…" : renderContent(msg.content) }}
                  />
                  <div style={S.timestamp}>{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ) : null,
          )
        )}
      </div>

      {/* Input area */}
      <div style={S.inputArea}>
        {isStreaming && (
          <div style={S.statusLine}>
            <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>●</span>
            <span>Copilot is thinking…</span>
          </div>
        )}

        {/* Attached files chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {attachedFiles.map((uri) => {
              const name = uri.split("/").pop() ?? uri;
              return (
                <span key={uri} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 4, fontSize: 12,
                  background: t.cardBg, border: `1px solid ${t.border}`, color: t.fg,
                }}>
                  <span dangerouslySetInnerHTML={{ __html: FileIcon }} style={{ color: fileColor(name), flexShrink: 0 }} />
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  <span
                    style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }}
                    onClick={() => removeAttachment(uri)}
                    title="Remove"
                  >×</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Input row with mention dropdown */}
        <div style={{ position: "relative" }}>
          {/* @ Mention dropdown */}
          {mentionOpen && filteredFiles.length > 0 && (
            <div
              ref={mentionRef}
              style={{
                position: "absolute", bottom: "100%", left: 0, right: 0,
                background: t.menuBg, border: `1px solid ${t.border}`,
                borderRadius: 6, boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
                maxHeight: 200, overflowY: "auto", zIndex: 10,
                marginBottom: 4,
              }}
            >
              <div style={{ padding: "4px 8px", fontSize: 11, color: t.fgDim, borderBottom: `1px solid ${t.border}` }}>
                Attach file as context
              </div>
              {filteredFiles.map((f, i) => (
                <div
                  key={f.uri}
                  onClick={() => addFileAttachment(f.uri)}
                  onMouseEnter={() => setMentionIdx(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "5px 8px", cursor: "pointer", fontSize: 12,
                    background: i === mentionIdx ? t.listHover : "transparent",
                    color: t.fg,
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: FileIcon }} style={{ color: fileColor(f.name), flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.uri}</span>
                  {attachedFiles.includes(f.uri) && (
                    <span style={{ fontSize: 10, color: t.accent }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={S.inputWrap}>
            <button
              title="Attach file (@)"
              style={{ ...S.iconBtn, flexShrink: 0 }}
              onClick={() => { setMentionOpen(!mentionOpen); setMentionQuery(""); inputRef.current?.focus(); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              dangerouslySetInnerHTML={{ __html: AttachIcon }}
            />
            <textarea
              ref={inputRef}
              style={S.textarea}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Copilot… (@ to attach file)"
              rows={1}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
              onBlur={() => { setTimeout(() => setMentionOpen(false), 200); }}
            />
            <button
              style={S.sendBtn}
              onClick={() => isStreaming ? aiApi.abort() : sendMessage(input)}
              title={isStreaming ? "Stop" : "Send (Enter)"}
              dangerouslySetInnerHTML={{ __html: isStreaming ? StopIcon : SendIcon }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helper: get editor selection text ────────────────────────
function getEditorSelection(): string {
  const editor = (window as Record<string, unknown>).editor as {
    getModel(): { getValueInRange(r: unknown): string } | null;
    getSelection(): { isEmpty(): boolean; startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
  } | undefined;
  if (!editor) return "";
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel || sel.isEmpty()) return "";
  return model.getValueInRange(sel);
}
