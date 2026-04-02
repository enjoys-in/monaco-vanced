// ── AI Chat Panel — Copilot-style right sidebar ──────────────

import { useState, useRef, useEffect, useCallback, type CSSProperties, type KeyboardEvent, type ChangeEvent, type MouseEvent as ReactMouseEvent, type DragEvent } from "react";
import { useTheme } from "../theme";
import { AiEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import {
  createConversation, listConversations, addMessage, getMessages,
  getConversation, deleteConversation, clearAllConversations, updateConversation, deriveTitle,
  type ChatConversation, type ChatMessageRecord,
} from "../../stores/chat-store";

// ── Types ────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  action?: "explain" | "generate" | "fix";
  attachedFiles?: string[];
  attachedSymbols?: AttachedSymbol[];
  attachedSelection?: { text: string; file: string; startLine: number; endLine: number };
}

interface AttachedSymbol {
  name: string;
  kind: string;
  file: string;
  line: number;
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
  indexerApi?: {
    query(q: { query: string; kind?: string; path?: string; limit?: number }): { name: string; kind: string; path: string; line: number; column: number }[];
    getFileSymbols(path: string): { name: string; kind: string; path: string; line: number; column: number }[];
    isReady(): boolean;
  };
  visible: boolean;
  onClose: () => void;
  files?: { uri: string; name: string; content?: string }[];
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
const SymbolIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.5 1h-7L3 2.5v11l1.5 1.5h7l1.5-1.5v-11L11.5 1zM11 13H5V3h6v10z"/><path d="M7 5h2v1H7V5zm0 2h3v1H7V7zm0 2h3v1H7V9z"/></svg>`;
const SelectionIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h8v1H2V8zm0 3h10v1H2v-1z"/></svg>`;
const HashIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 2L2.5 8h3l-.5 3h-2l-.2 1h2l-.3 2h1l.3-2h2l-.3 2h1l.3-2h2l.2-1h-2l.5-3h2l.2-1h-2L7.7 2h-1L6.2 7h-2L4.5 2h-1zm3.2 5l-.5 3h-2l.5-3h2z"/></svg>`;

// ── Symbol kind → icon color ─────────────────────────────────
function symbolKindColor(kind: string): string {
  const map: Record<string, string> = {
    function: "#dcdcaa", method: "#dcdcaa", class: "#4ec9b0",
    interface: "#4ec9b0", variable: "#9cdcfe", constant: "#4fc1ff",
    enum: "#b5cea8", property: "#9cdcfe", type: "#4ec9b0",
    module: "#c586c0", namespace: "#c586c0", import: "#c586c0",
  };
  return map[kind.toLowerCase()] || "#d4d4d4";
}

// ── Symbol kind → short label ────────────────────────────────
function symbolKindLabel(kind: string): string {
  const map: Record<string, string> = {
    function: "fn", method: "fn", class: "class", interface: "iface",
    variable: "var", constant: "const", enum: "enum", property: "prop",
    type: "type", module: "mod", namespace: "ns", import: "imp",
  };
  return map[kind.toLowerCase()] || kind.slice(0, 4);
}

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

// ── Slash commands ───────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: "/explain", description: "Explain the selected code", action: "explain" as const },
  { cmd: "/fix", description: "Fix errors in the selected code", action: "fix" as const },
  { cmd: "/generate", description: "Generate code from a prompt", action: "generate" as const },
  { cmd: "/tests", description: "Generate unit tests", action: "generate" as const },
  { cmd: "/refactor", description: "Suggest a refactoring", action: "explain" as const },
  { cmd: "/clear", description: "Clear chat history", action: undefined },
  { cmd: "/new", description: "Start a new conversation", action: undefined },
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
export function AiChat({ eventBus, aiApi, indexerApi, visible, onClose, files = [] }: AiChatProps) {
  const { tokens: t } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [attachedSymbols, setAttachedSymbols] = useState<AttachedSymbol[]>([]);
  const [attachedSelection, setAttachedSelection] = useState<ChatMessage["attachedSelection"] | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionMode, setMentionMode] = useState<"file" | "symbol">("file");
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIdx, setMentionIdx] = useState(0);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIdx, setSlashIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  // ── History state ──────────────────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<HTMLDivElement>(null);
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
    setTimeout(() => inputRef.current?.focus(), 100);
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

  // ── File mention filtering ───────────────────────────────
  const filteredFiles = mentionQuery
    ? files.filter((f) => f.uri.toLowerCase().includes(mentionQuery.toLowerCase()) || f.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8)
    : files.slice(0, 8);

  // ── Symbol mention filtering ─────────────────────────────
  const filteredSymbols = (() => {
    if (!indexerApi?.isReady()) return [];
    if (mentionQuery) {
      return indexerApi.query({ query: mentionQuery }).slice(0, 10);
    }
    const model = (window as Record<string, unknown>).editor as { getModel(): { uri: { path: string } } | null } | undefined;
    const currentPath = model?.getModel()?.uri.path?.replace(/^\/+/, "") ?? "";
    if (currentPath) return indexerApi.getFileSymbols(currentPath).slice(0, 10);
    return [];
  })();

  // ── Slash command filtering ──────────────────────────────
  const filteredSlash = slashQuery
    ? SLASH_COMMANDS.filter((c) => c.cmd.startsWith("/" + slashQuery.toLowerCase()))
    : SLASH_COMMANDS;

  // Unified filtered list for active mention mode
  const mentionItems = mentionMode === "file"
    ? filteredFiles.map((f) => ({ id: f.uri, label: f.uri, secondary: f.name, kind: "file" as const, color: fileColor(f.name) }))
    : filteredSymbols.map((s) => ({ id: `${s.path}:${s.name}:${s.line}`, label: s.name, secondary: `${symbolKindLabel(s.kind)} — ${s.path}:${s.line}`, kind: "symbol" as const, color: symbolKindColor(s.kind), _sym: s }));

  const addFileAttachment = useCallback((uri: string) => {
    setAttachedFiles((prev) => prev.includes(uri) ? prev : [...prev, uri]);
    setInput((prev) => {
      const atIdx = prev.lastIndexOf("@");
      return atIdx >= 0 ? prev.slice(0, atIdx) : prev;
    });
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIdx(0);
    inputRef.current?.focus();
  }, []);

  const addSymbolAttachment = useCallback((sym: { name: string; kind: string; path: string; line: number }) => {
    setAttachedSymbols((prev) => {
      const key = `${sym.path}:${sym.name}:${sym.line}`;
      if (prev.some((s) => `${s.file}:${s.name}:${s.line}` === key)) return prev;
      return [...prev, { name: sym.name, kind: sym.kind, file: sym.path, line: sym.line }];
    });
    setInput((prev) => {
      const hashIdx = prev.lastIndexOf("#");
      return hashIdx >= 0 ? prev.slice(0, hashIdx) : prev;
    });
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIdx(0);
    inputRef.current?.focus();
  }, []);

  const addSelectionAttachment = useCallback(() => {
    const sel = getEditorSelectionDetail();
    if (sel) setAttachedSelection(sel);
  }, []);

  const removeAttachment = useCallback((uri: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f !== uri));
  }, []);

  const removeSymbolAttachment = useCallback((key: string) => {
    setAttachedSymbols((prev) => prev.filter((s) => `${s.file}:${s.name}:${s.line}` !== key));
  }, []);

  // ── Open file on click (for file references in messages) ──
  const openFileReference = useCallback((uri: string) => {
    const name = uri.split("/").pop() ?? uri;
    eventBus.emit(FileEvents.Open, { uri, label: name });
  }, [eventBus]);

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
  const sendMessage = useCallback(async (text: string, action?: "explain" | "generate" | "fix") => {
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

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash command dropdown navigation
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIdx((i) => Math.min(i + 1, filteredSlash.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const cmd = filteredSlash[slashIdx];
        if (cmd) {
          setInput(cmd.cmd + " ");
          setSlashOpen(false);
          setSlashQuery("");
          setSlashIdx(0);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
        return;
      }
    }
    // Mention dropdown navigation
    if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => Math.min(i + 1, mentionItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const item = mentionItems[mentionIdx];
        if (item) {
          if (item.kind === "file") addFileAttachment(item.id);
          else if (item.kind === "symbol" && "_sym" in item) addSymbolAttachment((item as unknown as { _sym: { name: string; kind: string; path: string; line: number } })._sym);
        }
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

    // Detect / slash command (only at start of input)
    if (val.startsWith("/")) {
      const afterSlash = val.slice(1).split(" ")[0] ?? "";
      if (!val.includes(" ")) {
        setSlashOpen(true);
        setSlashQuery(afterSlash);
        setSlashIdx(0);
        setMentionOpen(false);
        return;
      }
    }
    setSlashOpen(false);

    // Detect # symbol mention (takes priority if cursor is after #)
    const hashIdx = val.lastIndexOf("#");
    const atIdx = val.lastIndexOf("@");

    if (hashIdx >= 0 && hashIdx > atIdx) {
      const afterHash = val.slice(hashIdx + 1);
      if (!afterHash.includes("\n") && indexerApi?.isReady()) {
        setMentionOpen(true);
        setMentionMode("symbol");
        setMentionQuery(afterHash);
        setMentionIdx(0);
        return;
      }
    }
    // Detect @ file mention
    if (atIdx >= 0) {
      const afterAt = val.slice(atIdx + 1);
      if (!afterAt.includes("\n")) {
        setMentionOpen(true);
        setMentionMode("file");
        setMentionQuery(afterAt);
        setMentionIdx(0);
        return;
      }
    }
    setMentionOpen(false);
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
    setSlashOpen(false);
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
      ...(dragOver ? { outline: `2px dashed ${t.accent}`, outlineOffset: -2 } : {}),
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
    <div
      ref={panelRef}
      className="vsc-ai-chat"
      style={S.panel}
      onDragOver={handleDragOver as unknown as React.DragEventHandler}
      onDragLeave={handleDragLeave as unknown as React.DragEventHandler}
      onDrop={handleDrop as unknown as React.DragEventHandler}
    >
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
            title="New chat"
            style={S.iconBtn}
            onClick={startNewChat}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1v6H2v2h6v6h2V9h6V7H10V1H8z"/></svg>
          </button>
          <button
            title="Chat history"
            style={{ ...S.iconBtn, ...(showHistory ? { background: t.hover } : {}) }}
            onClick={() => setShowHistory(!showHistory)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { if (!showHistory) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.507 12.324a7 7 0 0 0 .065-8.56A7 7 0 0 0 2 4.393V2H1v3.5l.5.5H5V5H2.811a6.008 6.008 0 1 1-.135 5.77l-.887.462a7 7 0 0 0 11.718 1.092zM8 4v4.5l.5.5H12v-1H9V4H8z"/></svg>
          </button>
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

      {/* Conversation history sidebar */}
      {showHistory && (
        <div style={{
          position: "absolute", top: 35, left: 0, right: 0, bottom: 0,
          background: t.sidebarBg, zIndex: 20, display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: t.fg, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Chat History</span>
            <button
              style={{ ...S.iconBtn, fontSize: 11, width: "auto", padding: "2px 6px", color: t.fgDim }}
              onClick={() => setShowHistory(false)}
            >✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
            {conversations.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: t.fgDim, fontSize: 12 }}>No conversations yet</div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => switchConversation(conv.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontSize: 12,
                  background: conv.id === activeConvId ? t.listHover : "transparent",
                  color: conv.id === activeConvId ? t.fg : t.fgDim,
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => { if (conv.id !== activeConvId) (e.currentTarget as HTMLElement).style.background = t.hover; }}
                onMouseLeave={(e) => { if (conv.id !== activeConvId) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: conv.id === activeConvId ? 500 : 400 }}>{conv.title}</div>
                  <div style={{ fontSize: 10, color: t.fgDim }}>{new Date(conv.updatedAt).toLocaleDateString()}</div>
                </div>
                <button
                  title="Delete conversation"
                  style={{ ...S.iconBtn, width: 18, height: 18, fontSize: 12, color: t.fgDim, flexShrink: 0 }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                >✕</button>
              </div>
            ))}
          </div>
        </div>
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
      <div ref={scrollRef} className="vsc-ai-chat-messages" style={S.messages}>
        {messages.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyIcon} dangerouslySetInnerHTML={{ __html: SparkleIcon.replace('width="16"', 'width="40"').replace('height="16"', 'height="40"') }} />
            <div style={S.emptyTitle}>How can I help you?</div>
            <div style={S.emptySubtitle}>
              Ask me about your code, or use the suggestions below to get started.
              <br />Type <strong>@</strong> to attach file, <strong>#</strong> to reference symbol, <strong>/</strong> for commands.
              <br />You can also <strong>drag & drop</strong> files or folders from the explorer.
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
                {((msg.attachedFiles && msg.attachedFiles.length > 0) || (msg.attachedSymbols && msg.attachedSymbols.length > 0) || msg.attachedSelection) && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4, justifyContent: "flex-end" }}>
                    {msg.attachedFiles?.map((uri) => {
                      const name = uri.split("/").pop() ?? uri;
                      return (
                        <span key={uri} onClick={() => openFileReference(uri)} style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "2px 6px", borderRadius: 4, fontSize: 11,
                          background: "rgba(255,255,255,0.1)", color: t.fgDim,
                          cursor: "pointer",
                        }} title={`Open ${uri}`}>
                          <span dangerouslySetInnerHTML={{ __html: FileIcon }} style={{ color: fileColor(name) }} />
                          {name}
                        </span>
                      );
                    })}
                    {msg.attachedSymbols?.map((sym) => (
                      <span key={`${sym.file}:${sym.name}:${sym.line}`} style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 6px", borderRadius: 4, fontSize: 11,
                        background: "rgba(255,255,255,0.1)", color: t.fgDim,
                      }}>
                        <span style={{ color: symbolKindColor(sym.kind), fontWeight: 600, fontSize: 10 }}>{symbolKindLabel(sym.kind)}</span>
                        <span style={{ color: symbolKindColor(sym.kind) }}>{sym.name}</span>
                      </span>
                    ))}
                    {msg.attachedSelection && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        padding: "2px 6px", borderRadius: 4, fontSize: 11,
                        background: "rgba(255,255,255,0.1)", color: t.fgDim,
                      }}>
                        <span dangerouslySetInnerHTML={{ __html: SelectionIcon }} style={{ color: "#569cd6" }} />
                        <span>L{msg.attachedSelection.startLine}-{msg.attachedSelection.endLine}</span>
                      </span>
                    )}
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
                  <span dangerouslySetInnerHTML={{ __html: FileIcon }} onClick={() => openFileReference(uri)} style={{ color: fileColor(name), flexShrink: 0, cursor: "pointer" }} title={`Open ${uri}`} />
                  <span onClick={() => openFileReference(uri)} style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }} title={`Open ${uri}`}>{name}</span>
                  <span
                    style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }}
                    onClick={() => removeAttachment(uri)}
                    title="Remove"
                  >×</span>
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
                }}>
                  <span dangerouslySetInnerHTML={{ __html: SymbolIcon }} style={{ color: symbolKindColor(sym.kind), flexShrink: 0 }} />
                  <span style={{ color: symbolKindColor(sym.kind), fontWeight: 500 }}>{sym.name}</span>
                  <span style={{ fontSize: 10, color: t.fgDim }}>{symbolKindLabel(sym.kind)}</span>
                  <span
                    style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }}
                    onClick={() => removeSymbolAttachment(key)}
                    title="Remove"
                  >×</span>
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
                <span
                  style={{ cursor: "pointer", color: t.fgDim, marginLeft: 2, fontSize: 14, lineHeight: 1 }}
                  onClick={() => setAttachedSelection(null)}
                  title="Remove"
                >×</span>
              </span>
            )}
          </div>
        )}

        {/* Input row with mention/slash dropdown */}
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
                  onClick={() => { setInput(cmd.cmd + " "); setSlashOpen(false); setSlashQuery(""); setSlashIdx(0); inputRef.current?.focus(); }}
                  onMouseEnter={() => setSlashIdx(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", cursor: "pointer", fontSize: 12,
                    background: i === slashIdx ? t.listHover : "transparent",
                    color: t.fg,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{cmd.icon}</span>
                  <span style={{ fontWeight: 500, color: t.accent }}>{cmd.cmd}</span>
                  <span style={{ color: t.fgDim, fontSize: 11, flex: 1 }}>{cmd.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Unified mention dropdown (@ files, # symbols) */}
          {mentionOpen && mentionItems.length > 0 && (
            <div
              ref={mentionRef}
              style={{
                position: "absolute", bottom: "100%", left: 0, right: 0,
                background: t.menuBg, border: `1px solid ${t.border}`,
                borderRadius: 6, boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
                maxHeight: 220, overflowY: "auto", zIndex: 10,
                marginBottom: 4,
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
                    else if (item.kind === "symbol" && "_sym" in item) addSymbolAttachment((item as unknown as { _sym: { name: string; kind: string; path: string; line: number } })._sym);
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
                    <span dangerouslySetInnerHTML={{ __html: SymbolIcon }} style={{ color: item.color, flexShrink: 0 }} />
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

          <div style={S.inputWrap}>
            <button
              title="Attach file (@)"
              style={{ ...S.iconBtn, flexShrink: 0 }}
              onClick={() => { setMentionOpen(!mentionOpen); setMentionMode("file"); setMentionQuery(""); inputRef.current?.focus(); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              dangerouslySetInnerHTML={{ __html: AttachIcon }}
            />
            <button
              title="Attach selection"
              style={{ ...S.iconBtn, flexShrink: 0 }}
              onClick={addSelectionAttachment}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              dangerouslySetInnerHTML={{ __html: SelectionIcon }}
            />
            {indexerApi && (
              <button
                title="Reference symbol (#)"
                style={{ ...S.iconBtn, flexShrink: 0 }}
                onClick={() => { setMentionOpen(!mentionOpen); setMentionMode("symbol"); setMentionQuery(""); inputRef.current?.focus(); }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                dangerouslySetInnerHTML={{ __html: HashIcon }}
              />
            )}
            <textarea
              ref={inputRef}
              style={S.textarea}
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

// ── Helper: get editor selection with detail ────────────────
function getEditorSelectionDetail(): ChatMessage["attachedSelection"] | null {
  const editor = (window as Record<string, unknown>).editor as {
    getModel(): { getValueInRange(r: unknown): string; uri: { path: string } } | null;
    getSelection(): { isEmpty(): boolean; startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
  } | undefined;
  if (!editor) return null;
  const model = editor.getModel();
  const sel = editor.getSelection();
  if (!model || !sel || sel.isEmpty()) return null;
  return {
    text: model.getValueInRange(sel),
    file: model.uri.path.replace(/^\/+/, ""),
    startLine: sel.startLineNumber,
    endLine: sel.endLineNumber,
  };
}

// ── Helper: get file content from Monaco models ─────────────
function getFileContent(uri: string): string | null {
  const monaco = (window as Record<string, unknown>).monaco as {
    Uri: { parse(s: string): unknown };
    editor: { getModel(uri: unknown): { getValue(): string } | null };
  } | undefined;
  if (!monaco) return null;
  const monacoUri = monaco.Uri.parse(`file:///${uri}`);
  const model = monaco.editor.getModel(monacoUri);
  return model ? model.getValue() : null;
}
