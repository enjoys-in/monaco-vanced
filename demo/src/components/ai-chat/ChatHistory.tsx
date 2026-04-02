// ── Chat History Panel — conversation list ───────────────────

import type { CSSProperties } from "react";
import type { ThemeTokens } from "../theme";
import type { ChatConversation } from "../../stores/chat-store";

export interface ChatHistoryProps {
  tokens: ThemeTokens;
  conversations: ChatConversation[];
  activeConvId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ChatHistory({ tokens: t, conversations, activeConvId, onSwitch, onDelete, onClose }: ChatHistoryProps) {
  const iconBtn: CSSProperties = {
    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", borderRadius: 4, border: "none", background: "transparent",
    color: t.fgDim, padding: 0,
  };

  return (
    <div style={{
      position: "absolute", top: 35, left: 0, right: 0, bottom: 0,
      background: t.sidebarBg, zIndex: 20, display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "8px 12px", fontSize: 12, fontWeight: 600, color: t.fg,
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span>Chat History</span>
        <button style={{ ...iconBtn, fontSize: 11, width: "auto", padding: "2px 6px" }} onClick={onClose}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
        {conversations.length === 0 && (
          <div style={{ padding: 16, textAlign: "center", color: t.fgDim, fontSize: 12 }}>No conversations yet</div>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => onSwitch(conv.id)}
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
              style={{ ...iconBtn, width: 18, height: 18, fontSize: 12, flexShrink: 0 }}
              onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
