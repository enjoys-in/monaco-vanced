// ── AI Chat Panel — Copilot-style right sidebar ──────────────
// Sub-components: ChatEmpty, ChatMessage, ChatInput, ChatHistory

import { useState, useRef, useEffect, useCallback, type CSSProperties, type MouseEvent as ReactMouseEvent, type DragEvent } from "react";
import { useTheme } from "../theme";
import { AiEvents } from "@enjoys/monaco-vanced/core/events";
import {
  createConversation, listConversations, addMessage, getMessages,
  deleteConversation, updateConversation, deriveTitle,
  type ChatConversation, type ChatMessageRecord,
} from "../../stores/chat-store";
import type { AiChatProps, ChatMessage, AttachedSymbol, AttachedSelection, ChatAction } from "./types";
import { SparkleIcon, CloseIcon, ClearIcon, SLASH_COMMANDS, getEditorSelection, getFileContent } from "./constants";
import { ChatEmpty } from "./ChatEmpty";
import { ChatMessageList } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatHistory } from "./ChatHistory";

export type { AiChatProps };

// ── Component ────────────────────────────────────────────────
export function AiChat({ eventBus, aiApi, indexerApi, visible, onClose, files = [] }: AiChatProps) {
  const { tokens: t } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [attachedSymbols, setAttachedSymbols] = useState<AttachedSymbol[]>([]);
  const [attachedSelection, setAttachedSelection] = useState<AttachedSelection | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  const nextId = () => `msg-${Date.now()}-${++msgIdRef.current}`;

  // ── Load conversations on mount ────────────────────────────
  useEffect(() => {
    if (visible) {
      listConversations().then((convs) => {
        setConversations(convs);
        // If no active conv, create one
        if (!activeConvId && convs.length === 0) {
          createConversation().then((c) => {
            setActiveConvId(c.id);
            setConversations([c]);
          });
        } else if (!activeConvId && convs.length > 0) {
          // Load most recent
          setActiveConvId(convs[0].id);
          getMessages(convs[0].id).then((msgs) => {
            setMessages(msgs.map((m) => ({
              id: m.id, role: m.role, content: m.content, timestamp: m.timestamp,
              action: m.action, attachedFiles: m.attachedFiles,
              attachedSymbols: m.attachedSymbols, attachedSelection: m.attachedSelection,
            })));
          });
        }
      });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Switch conversation ────────────────────────────────────
  const switchConversation = useCallback(async (convId: string) => {
    setActiveConvId(convId);
    setShowHistory(false);
    const msgs = await getMessages(convId);
    setMessages(msgs.map((m) => ({
      id: m.id, role: m.role, content: m.content, timestamp: m.timestamp,
      action: m.action, attachedFiles: m.attachedFiles,
      attachedSymbols: m.attachedSymbols, attachedSelection: m.attachedSelection,
    })));
  }, []);

  const startNewChat = useCallback(async () => {
    const c = await createConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveConvId(c.id);
    setMessages([]);
    setShowHistory(false);
    setInput("");
  }, []);

  const handleDeleteConversation = useCallback(async (convId: string) => {
    await deleteConversation(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      if (remaining.length > 0) {
        switchConversation(remaining[0].id);
      } else {
        startNewChat();
      }
    }
  }, [activeConvId, conversations, switchConversation, startNewChat]);

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

  // ── Drag & drop ────────────────────────────────────────────
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    // Try to get text/uri or text/plain from drag data
    const uriData = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || "";
    if (uriData) {
      const uris = uriData.split("\n").map((u) => u.trim()).filter(Boolean);
      for (const uri of uris) {
        // Clean up URI — remove file:/// prefix
        const cleanUri = uri.replace(/^file:\/\/\//, "");
        setAttachedFiles((prev) => prev.includes(cleanUri) ? prev : [...prev, cleanUri]);
      }
      return;
    }

    // Handle dragged items via custom data attribute
    const dragPath = e.dataTransfer.getData("application/x-monaco-path");
    if (dragPath) {
      setAttachedFiles((prev) => prev.includes(dragPath) ? prev : [...prev, dragPath]);
    }
  }, []);

  const addFileAttachment = useCallback((uri: string) => {
    setAttachedFiles((prev) => prev.includes(uri) ? prev : [...prev, uri]);
  }, []);

  const addSymbolAttachment = useCallback((sym: { name: string; kind: string; path: string; line: number }) => {
    setAttachedSymbols((prev) => {
      const key = `${sym.path}:${sym.name}:${sym.line}`;
      if (prev.some((s) => `${s.file}:${s.name}:${s.line}` === key)) return prev;
      return [...prev, { name: sym.name, kind: sym.kind, file: sym.path, line: sym.line }];
    });
  }, []);

  const removeAttachment = useCallback((uri: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f !== uri));
  }, []);

  const removeSymbolAttachment = useCallback((key: string) => {
    setAttachedSymbols((prev) => prev.filter((s) => `${s.file}:${s.name}:${s.line}` !== key));
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Persist message to Dexie ───────────────────────────────
  const persistMessage = useCallback(async (msg: ChatMessage) => {
    if (!activeConvId) return;
    const record: ChatMessageRecord = {
      id: msg.id,
      conversationId: activeConvId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      action: msg.action,
      attachedFiles: msg.attachedFiles,
      attachedSymbols: msg.attachedSymbols,
      attachedSelection: msg.attachedSelection,
    };
    await addMessage(record);

    // Auto-title on first user message
    if (msg.role === "user") {
      const conv = conversations.find((c) => c.id === activeConvId);
      if (conv?.title === "New Chat") {
        const title = deriveTitle(msg.content);
        await updateConversation(activeConvId, { title });
        setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, title } : c));
      }
    }
  }, [activeConvId, conversations]);

  // Send a chat message
  const sendMessage = useCallback(async (text: string, action?: ChatAction) => {
    if (!text.trim() || isStreaming) return;

    // Handle slash commands
    if (text.startsWith("/")) {
      const cmd = SLASH_COMMANDS.find((c) => text.trim().startsWith(c.cmd));
      if (cmd) {
        if (cmd.cmd === "/clear") {
          setMessages([]);
          setInput("");
          return;
        }
        if (cmd.cmd === "/new") {
          await startNewChat();
          return;
        }
        // For action commands, strip the command and use the rest as prompt
        const rest = text.slice(cmd.cmd.length).trim();
        const sel = getEditorSelection();
        const prompt = rest || (sel ? `${cmd.description}:\n\`\`\`\n${sel}\n\`\`\`` : cmd.description);
        return sendMessage(prompt, cmd.action);
      }
    }

    const currentAttached = [...attachedFiles];
    const currentSymbols = [...attachedSymbols];
    const currentSelection = attachedSelection;
    const userMsg: ChatMessage = {
      id: nextId(), role: "user", content: text.trim(), timestamp: Date.now(), action,
      attachedFiles: currentAttached.length > 0 ? currentAttached : undefined,
      attachedSymbols: currentSymbols.length > 0 ? currentSymbols : undefined,
      attachedSelection: currentSelection ?? undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    persistMessage(userMsg);
    setInput("");
    setAttachedFiles([]);
    setAttachedSymbols([]);
    setAttachedSelection(null);
    setIsStreaming(true);

    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "Thinking…", timestamp: Date.now() }]);

    try {
      const prefix = action === "explain" ? "[EXPLAIN] " : action === "generate" ? "[GENERATE] " : action === "fix" ? "[FIX] " : "";
      let fileContext = "";
      if (currentAttached.length > 0) {
        const fileSnippets = currentAttached.map((uri) => {
          const file = files.find((f) => f.uri === uri);
          if (!file) return null;
          const content = file.content ?? (getFileContent(uri) || "");
          const preview = content.split("\n").slice(0, 50).join("\n");
          return `--- File: ${file.uri} ---\n${preview}${content.split("\n").length > 50 ? "\n... (truncated)" : ""}`;
        }).filter(Boolean);
        fileContext = `\n\nAttached files:\n${fileSnippets.join("\n\n")}`;
      }
      let symbolContext = "";
      if (currentSymbols.length > 0) {
        const symDescriptions = currentSymbols.map((s) => `${s.kind} ${s.name} (${s.file}:${s.line})`);
        symbolContext = `\n\nReferenced symbols:\n${symDescriptions.join("\n")}`;
      }
      let selectionContext = "";
      if (currentSelection) {
        selectionContext = `\n\nSelected code (${currentSelection.file} L${currentSelection.startLine}-${currentSelection.endLine}):\n\`\`\`\n${currentSelection.text}\n\`\`\``;
      }
      const res = await aiApi.chat([
        { role: "system", content: "You are a helpful AI coding assistant embedded in Monaco Vanced IDE." },
        ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: `${prefix}${text.trim()}${fileContext}${symbolContext}${selectionContext}` },
      ]);
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: res.content, timestamp: Date.now() };
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? assistantMsg : m)));
      persistMessage(assistantMsg);
    } catch {
      const errMsg: ChatMessage = { id: assistantId, role: "assistant", content: "Sorry, something went wrong. Please try again.", timestamp: Date.now() };
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? errMsg : m)));
      persistMessage(errMsg);
    } finally {
      setIsStreaming(false);
    }
  }, [aiApi, isStreaming, messages, attachedFiles, attachedSymbols, attachedSelection, files, persistMessage, startNewChat]);

  // Listen for context menu AI actions + attach events
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
        const exists = messages.some((m) => m.content === content);
        if (!exists) {
          setMessages((prev) => [...prev, {
            id: nextId(), role: "assistant", content,
            timestamp: Date.now(), action: action as "explain" | "generate" | "fix",
          }]);
        }
      }
    };
    const handleAttachFile = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) setAttachedFiles((prev) => prev.includes(uri) ? prev : [...prev, uri]);
    };
    const handleAttachFolder = (p: unknown) => {
      const { uri } = p as { uri: string };
      if (uri) setAttachedFiles((prev) => prev.includes(uri) ? prev : [...prev, uri]);
    };

    eventBus.on(AiEvents.Explain, handleExplain);
    eventBus.on(AiEvents.Generate, handleGenerate);
    eventBus.on(AiEvents.Fix, handleFix);
    eventBus.on(AiEvents.ChatResponse, handleChatResponse);
    eventBus.on(AiEvents.AttachFile, handleAttachFile);
    eventBus.on(AiEvents.AttachFolder, handleAttachFolder);

    return () => {
      eventBus.off(AiEvents.Explain, handleExplain);
      eventBus.off(AiEvents.Generate, handleGenerate);
      eventBus.off(AiEvents.Fix, handleFix);
      eventBus.off(AiEvents.ChatResponse, handleChatResponse);
      eventBus.off(AiEvents.AttachFile, handleAttachFile);
      eventBus.off(AiEvents.AttachFolder, handleAttachFolder);
    };
  }, [eventBus, sendMessage, messages]);

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  if (!visible) return null;

  const iconBtn: CSSProperties = {
    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", borderRadius: 4, border: "none", background: "transparent",
    color: t.fgDim, padding: 0,
  };

  return (
    <div
      ref={panelRef}
      className="vsc-ai-chat"
      style={{
        display: "flex", flexDirection: "column",
        width: panelWidth, minWidth: 280, height: "100%",
        background: t.sidebarBg, borderLeft: `1px solid ${t.border}`,
        overflow: "hidden", position: "relative",
        ...(dragOver ? { outline: `2px dashed ${t.accent}`, outlineOffset: -2 } : {}),
      }}
      onDragOver={handleDragOver as unknown as React.DragEventHandler}
      onDragLeave={handleDragLeave as unknown as React.DragEventHandler}
      onDrop={handleDrop as unknown as React.DragEventHandler}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{ position: "absolute", left: -2, top: 0, bottom: 0, width: 4, cursor: "col-resize", zIndex: 5 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.accent; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 35, minHeight: 35, padding: "0 8px 0 12px",
        borderBottom: `1px solid ${t.border}`, background: t.panelHeaderBg,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: t.fgDim }}>
          <span dangerouslySetInnerHTML={{ __html: SparkleIcon }} />
          <span>Copilot</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button title="New chat" style={iconBtn} onClick={startNewChat}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          ><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v6H2v2h6v6h2V9h6V7H10V1H8z"/></svg></button>
          <button title="Chat history" style={{ ...iconBtn, ...(showHistory ? { background: t.hover } : {}) }}
            onClick={() => setShowHistory(!showHistory)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { if (!showHistory) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          ><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.507 12.324a7 7 0 0 0 .065-8.56A7 7 0 0 0 2 4.393V2H1v3.5l.5.5H5V5H2.811a6.008 6.008 0 1 1-.135 5.77l-.887.462a7 7 0 0 0 11.718 1.092zM8 4v4.5l.5.5H12v-1H9V4H8z"/></svg></button>
          <button title="Clear chat" style={iconBtn} onClick={clearChat}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            dangerouslySetInnerHTML={{ __html: ClearIcon }} />
          <button title="Close panel" style={iconBtn} onClick={onClose}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            dangerouslySetInnerHTML={{ __html: CloseIcon }} />
        </div>
      </div>

      {/* History overlay */}
      {showHistory && (
        <ChatHistory
          tokens={t}
          conversations={conversations}
          activeConvId={activeConvId}
          onSwitch={switchConversation}
          onDelete={handleDeleteConversation}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Drag overlay */}
      {dragOver && (
        <div style={{
          position: "absolute", top: 35, left: 0, right: 0, bottom: 0,
          background: `${t.accent}15`, display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 15, pointerEvents: "none",
        }}>
          <div style={{
            padding: "16px 24px", borderRadius: 8, background: t.cardBg,
            border: `2px dashed ${t.accent}`, color: t.fg, fontSize: 13, fontWeight: 500,
          }}>Drop files or folders to attach</div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="vsc-ai-chat-messages" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 12px 8px" }}>
        {messages.length === 0 ? (
          <ChatEmpty tokens={t} onSend={(prompt) => sendMessage(prompt)} />
        ) : (
          <ChatMessageList messages={messages} tokens={t} eventBus={eventBus} />
        )}
      </div>

      {/* Input */}
      <ChatInput
        tokens={t}
        input={input}
        onInputChange={setInput}
        onSend={() => sendMessage(input)}
        onAbort={() => aiApi.abort()}
        isStreaming={isStreaming}
        attachedFiles={attachedFiles}
        attachedSymbols={attachedSymbols}
        attachedSelection={attachedSelection}
        onAddFile={addFileAttachment}
        onRemoveFile={removeAttachment}
        onAddSymbol={addSymbolAttachment}
        onRemoveSymbol={removeSymbolAttachment}
        onSetSelection={setAttachedSelection}
        indexerApi={indexerApi}
        files={files}
        eventBus={eventBus}
      />
    </div>
  );
}
