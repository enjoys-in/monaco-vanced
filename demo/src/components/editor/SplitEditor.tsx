// ── Split Editor — secondary editor pane (split right/down) ──

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { LayoutEvents, EditorEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import { useTheme } from "../theme";

export interface SplitEditorProps {
  eventBus: InstanceType<typeof EventBus>;
  primaryEditorRef: HTMLDivElement | null;
}

interface SplitState {
  direction: "right" | "down";
  uri: string;
  /** 0–1 size ratio for the secondary pane */
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
    const ed = (window as Record<string, unknown>).editor as
      import("monaco-editor").editor.IStandaloneCodeEditor | undefined;
    ed?.layout();
  }, []);

  // ── Listen for LayoutEvents.Split ──────────────────────────
  useEffect(() => {
    const handle = (payload: unknown) => {
      const { direction, uri } = payload as { direction: "right" | "down"; uri: string };
      setSplit((prev) =>
        prev && prev.uri === uri && prev.direction === direction
          ? null                                         // toggle off
          : { direction, uri, ratio: 0.5 },
      );
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
      // Make the primary editor's own wrapper fill the remaining space
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

      const monacoUri = monaco.Uri.parse(`file:///${split.uri}`);
      const model = monaco.editor.getModel(monacoUri)
        ?? ((window as Record<string, unknown>).editor as import("monaco-editor").editor.IStandaloneCodeEditor | undefined)?.getModel()
        ?? null;

      if (editorRef.current) editorRef.current.dispose();

      const primary = (window as Record<string, unknown>).editor as
        import("monaco-editor").editor.IStandaloneCodeEditor | undefined;
      const opts = primary?.getOptions();

      const ed = monaco.editor.create(secondaryRef.current, {
        model,
        readOnly: false,
        theme: document.documentElement.getAttribute("data-theme") === "light" ? "vs" : "vs-dark",
        minimap: { enabled: (opts?.get(73 as never) as { enabled?: boolean })?.enabled ?? true },
        fontSize: (opts?.get(52 as never) as number | undefined) ?? 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
      });
      editorRef.current = ed;

      ed.onDidFocusEditorWidget(() => {
        eventBus.emit(EditorEvents.Focus, { source: "split-secondary" });
      });
    });

    return () => {
      disposed = true;
      if (editorRef.current) { editorRef.current.dispose(); editorRef.current = null; }
    };
  }, [split, eventBus]);

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
  const fileName = split.uri.split("/").pop() ?? split.uri;

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
  };

  const header: CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    height: 28, minHeight: 28, padding: "0 8px",
    background: t.tabInactiveBg, borderBottom: `1px solid ${t.border}`,
    fontSize: 12, color: t.fgDim, flexShrink: 0,
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
        <div style={header}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
          <button
            onClick={closeSplit}
            title="Close split"
            style={{
              width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent", color: t.fgDim, cursor: "pointer",
              borderRadius: 3, padding: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.hover; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z"/>
            </svg>
          </button>
        </div>
        <div ref={secondaryRef} style={{ flex: 1, overflow: "hidden" }} />
      </div>
    </>
  );
}
