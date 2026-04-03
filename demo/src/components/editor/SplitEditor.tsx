// ── Split Editor — secondary editor pane (split right/down) ──

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { LayoutEvents, EditorEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import { useTheme } from "../theme";

export interface SplitEditorProps {
  eventBus: InstanceType<typeof EventBus>;
  primaryEditorRef: HTMLDivElement | null;
}

interface SplitTab {
  uri: string;
  label: string;
  dirty: boolean;
}

interface SplitState {
  direction: "right" | "down";
  tabs: SplitTab[];
  activeUri: string;
  ratio: number;
}

/**
 * Renders as siblings inside #editor-container (which becomes a flex row/col).
 * Returns a React fragment with (divider + secondary pane), or null when inactive.
 */
export function SplitEditor({ eventBus }: SplitEditorProps) {
  const { tokens: t } = useTheme();
  const [split, setSplit] = useState<SplitState | null>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null);
  const resizing = useRef(false);

  const relayoutPrimary = useCallback(() => {
    window.editor?.layout();
  }, []);

  // ── Listen for LayoutEvents.Split ──────────────────────────
  useEffect(() => {
    const handle = (payload: unknown) => {
      const { direction, uri } = payload as { direction: "right" | "down"; uri: string };
      setSplit((prev) => {
        // Toggle off if same file + direction
        if (prev && prev.activeUri === uri && prev.direction === direction) return null;
        const label = uri.split("/").pop() ?? uri;
        if (prev) {
          // Already split — add tab if not present, switch to it
          const existing = prev.tabs.find((tab) => tab.uri === uri);
          if (existing) {
            return { ...prev, activeUri: uri, direction };
          }
          return { ...prev, tabs: [...prev.tabs, { uri, label, dirty: false }], activeUri: uri, direction };
        }
        // New split — single tab with the requested file only
        return { direction, tabs: [{ uri, label, dirty: false }], activeUri: uri, ratio: 0.5 };
      });
    };
    eventBus.on(LayoutEvents.Split, handle);
    return () => { eventBus.off(LayoutEvents.Split, handle); };
  }, [eventBus]);

  // ── Switch #editor-container to flex when split is active ──
  useEffect(() => {
    const container = document.getElementById("editor-container");
    if (!container) return;

    if (split) {
      container.style.display = "flex";
      container.style.flexDirection = split.direction === "right" ? "row" : "column";
      const monacoEl = container.querySelector<HTMLElement>(".monaco-editor");
      const wrapper = monacoEl?.parentElement;
      if (wrapper && wrapper !== container) {
        wrapper.style.flex = "1";
        wrapper.style.overflow = "hidden";
        wrapper.style.minWidth = "0";
        wrapper.style.minHeight = "0";
      }
    } else {
      container.style.display = "";
      container.style.flexDirection = "";
      const monacoEl = container.querySelector<HTMLElement>(".monaco-editor");
      const wrapper = monacoEl?.parentElement;
      if (wrapper && wrapper !== container) {
        wrapper.style.flex = "";
        wrapper.style.overflow = "";
        wrapper.style.minWidth = "";
        wrapper.style.minHeight = "";
      }
    }

    setTimeout(() => {
      relayoutPrimary();
      editorRef.current?.layout();
    }, 30);
  }, [split, relayoutPrimary]);

  // ── Re-apply flex when panel becomes visible again ─────────
  useEffect(() => {
    if (!split) return;
    const reapply = () => {
      const container = document.getElementById("editor-container");
      if (container && container.style.display !== "none" && container.style.display !== "flex") {
        container.style.display = "flex";
        container.style.flexDirection = split.direction === "right" ? "row" : "column";
        setTimeout(() => { relayoutPrimary(); editorRef.current?.layout(); }, 30);
      }
    };
    eventBus.on(FileEvents.Open, reapply);
    return () => { eventBus.off(FileEvents.Open, reapply); };
  }, [split, eventBus, relayoutPrimary]);

  // ── Create / destroy secondary editor ──────────────────────
  useEffect(() => {
    if (!split || !secondaryRef.current) {
      if (editorRef.current) { editorRef.current.dispose(); editorRef.current = null; }
      return;
    }

    let disposed = false;

    import("monaco-editor").then((monaco) => {
      if (disposed || !secondaryRef.current) return;

      const monacoUri = monaco.Uri.parse(`file:///${split.activeUri}`);
      let model = monaco.editor.getModel(monacoUri);

      if (!model) {
        const primaryModel = window.editor?.getModel();
        if (primaryModel && primaryModel.uri.toString() === monacoUri.toString()) {
          model = primaryModel;
        } else {
          model = monaco.editor.createModel("", undefined, monacoUri);
        }
      }

      if (editorRef.current) {
        // Reuse existing editor, just switch model
        if (editorRef.current.getModel() !== model) {
          editorRef.current.setModel(model);
        }
        return;
      }

      const opts = window.editor?.getOptions();

      const ed = monaco.editor.create(secondaryRef.current, {
        model,
        readOnly: false,
        minimap: { enabled: (opts?.get(73 as never) as { enabled?: boolean })?.enabled ?? true },
        fontSize: (opts?.get(52 as never) as number | undefined) ?? 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
      });
      editorRef.current = ed;

      // Track dirty state for split tabs
      ed.onDidChangeModelContent(() => {
        const currentModel = ed.getModel();
        if (!currentModel) return;
        const uri = currentModel.uri.path.replace(/^\//, "");
        setSplit((prev) => {
          if (!prev) return null;
          return { ...prev, tabs: prev.tabs.map((tab) => tab.uri === uri ? { ...tab, dirty: true } : tab) };
        });
      });

      ed.onDidFocusEditorWidget(() => {
        eventBus.emit(EditorEvents.Focus, { source: "split-secondary" });
      });
    });

    return () => {
      disposed = true;
    };
  }, [split?.activeUri, eventBus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dispose editor fully when split closes ─────────────────
  useEffect(() => {
    if (split) return;
    if (editorRef.current) { editorRef.current.dispose(); editorRef.current = null; }
  }, [split]);

  // ── Switch model when active tab changes ───────────────────
  useEffect(() => {
    if (!split || !editorRef.current) return;
    import("monaco-editor").then((monaco) => {
      if (!editorRef.current) return;
      const monacoUri = monaco.Uri.parse(`file:///${split.activeUri}`);
      const model = monaco.editor.getModel(monacoUri);
      if (model && editorRef.current.getModel() !== model) {
        editorRef.current.setModel(model);
      }
    });
  }, [split?.activeUri]);

  // ── Tab actions ────────────────────────────────────────────
  const activateTab = useCallback((uri: string) => {
    setSplit((prev) => prev ? { ...prev, activeUri: uri } : null);
  }, []);

  const closeTab = useCallback((uri: string) => {
    setSplit((prev) => {
      if (!prev) return null;
      const remaining = prev.tabs.filter((tab) => tab.uri !== uri);
      if (remaining.length === 0) return null; // Close split entirely
      const newActive = prev.activeUri === uri
        ? remaining[Math.min(prev.tabs.findIndex((tab) => tab.uri === uri), remaining.length - 1)].uri
        : prev.activeUri;
      return { ...prev, tabs: remaining, activeUri: newActive };
    });
    setTimeout(relayoutPrimary, 50);
  }, [relayoutPrimary]);

  // ── Resize handle ──────────────────────────────────────────
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!split) return;
    e.preventDefault();
    resizing.current = true;
    const isH = split.direction === "right";
    document.body.style.cursor = isH ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    const startPos = isH ? e.clientX : e.clientY;
    const container = document.getElementById("editor-container");
    if (!container) return;
    const totalSize = isH ? container.offsetWidth : container.offsetHeight;
    const startRatio = split.ratio;

    const onMove = (ev: MouseEvent) => {
      const pos = isH ? ev.clientX : ev.clientY;
      const delta = (pos - startPos) / totalSize;
      setSplit((prev) => prev ? { ...prev, ratio: Math.max(0.15, Math.min(0.85, startRatio + delta)) } : null);
    };
    const onUp = () => {
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setTimeout(() => { relayoutPrimary(); editorRef.current?.layout(); }, 10);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [split, relayoutPrimary]);

  const closeSplit = useCallback(() => {
    setSplit(null);
    setTimeout(relayoutPrimary, 50);
  }, [relayoutPrimary]);

  // ── Render nothing when no split ───────────────────────────
  if (!split) return null;

  const isH = split.direction === "right";

  const divider: CSSProperties = {
    [isH ? "width" : "height"]: 4,
    [isH ? "minWidth" : "minHeight"]: 4,
    background: t.border,
    cursor: isH ? "col-resize" : "row-resize",
    flexShrink: 0,
    transition: "background .15s",
  };

  const pane: CSSProperties = {
    flex: `0 0 ${split.ratio * 100}%`,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minWidth: 0, minHeight: 0,
    background: t.editorBg,
  };

  return (
    <>
      <div
        style={divider}
        onMouseDown={handleResizeStart}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.accent; }}
        onMouseLeave={(e) => { if (!resizing.current) (e.currentTarget as HTMLElement).style.background = t.border; }}
      />
      <div style={pane}>
        {/* Tab bar */}
        <SplitTabBar
          tabs={split.tabs}
          activeUri={split.activeUri}
          tokens={t}
          onActivate={activateTab}
          onClose={closeTab}
          onCloseAll={closeSplit}
        />
        <div ref={secondaryRef} style={{ flex: 1, overflow: "hidden" }} />
      </div>
    </>
  );
}

// ── Split Tab Bar ────────────────────────────────────────────

function SplitTabBar({ tabs, activeUri, tokens: t, onActivate, onClose, onCloseAll }: {
  tabs: SplitTab[];
  activeUri: string;
  tokens: ReturnType<typeof useTheme>["tokens"];
  onActivate: (uri: string) => void;
  onClose: (uri: string) => void;
  onCloseAll: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "stretch",
      height: 32, minHeight: 32,
      background: t.tabBg, borderBottom: `1px solid ${t.border}`,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, overflowX: "auto", overflowY: "hidden" }}>
        {tabs.map((tab) => (
          <SplitTabItem
            key={tab.uri}
            tab={tab}
            isActive={tab.uri === activeUri}
            tokens={t}
            onActivate={() => onActivate(tab.uri)}
            onClose={() => onClose(tab.uri)}
          />
        ))}
      </div>
      <button
        onClick={onCloseAll}
        title="Close split editor"
        style={{
          width: 28, height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
          border: "none", background: "transparent", color: t.fgDim, cursor: "pointer",
          padding: 0, flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
        </svg>
      </button>
    </div>
  );
}

function SplitTabItem({ tab, isActive, tokens: t, onActivate, onClose }: {
  tab: SplitTab;
  isActive: boolean;
  tokens: ReturnType<typeof useTheme>["tokens"];
  onActivate: () => void;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onActivate}
      onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onClose(); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "0 4px 0 10px", height: "100%", cursor: "pointer",
        borderRight: `1px solid ${t.border}`, fontSize: 12,
        whiteSpace: "nowrap", minWidth: 0,
        background: isActive ? t.tabActiveBg : hovered ? t.hover : t.tabInactiveBg,
        color: isActive ? t.fgBright : t.fgDim,
        borderTop: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
        borderBottom: isActive ? `1px solid ${t.tabActiveBg}` : "1px solid transparent",
        transition: "background .1s", userSelect: "none",
      }}
    >
      <span style={{
        overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120,
        fontStyle: tab.dirty ? "italic" : "normal",
      }}>
        {tab.label}
      </span>
      <span style={{
        width: 18, height: 18, display: "flex", alignItems: "center",
        justifyContent: "center", flexShrink: 0,
      }}>
        {hovered ? (
          <span
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              cursor: "pointer", borderRadius: 3, display: "flex",
              alignItems: "center", justifyContent: "center",
              width: 18, height: 18, color: t.fgDim,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
            </svg>
          </span>
        ) : tab.dirty ? (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.fg }} />
        ) : null}
      </span>
    </div>
  );
}
