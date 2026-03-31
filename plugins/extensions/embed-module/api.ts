// ── Embed Module — EmbedAPI ──────────────────────────────────
// Provides programmatic control to host page embedding the editor.

import type { PluginContext } from "@core/types";
import { MessageBridge } from "./message-handler";

export class EmbedAPI {
  private ctx: PluginContext | null = null;
  private bridge: MessageBridge;
  private changeHandlers: Array<(content: string) => void> = [];

  constructor(bridge: MessageBridge) {
    this.bridge = bridge;
  }

  /** Bind to a plugin context (called during mount) */
  bind(ctx: PluginContext): void {
    this.ctx = ctx;
  }

  /** Set the editor content */
  setValue(value: string): void {
    this.ctx?.setContent(value);
  }

  /** Get the current editor content */
  getValue(): string {
    return this.ctx?.getContent() ?? "";
  }

  /** Set the editor language */
  setLanguage(languageId: string): void {
    this.ctx?.setLanguage(languageId);
  }

  /** Set the editor theme */
  setTheme(themeId: string): void {
    this.ctx?.monaco.editor.setTheme(themeId);
  }

  /** Register a content change callback */
  onContentChange(handler: (content: string) => void): void {
    this.changeHandlers.push(handler);
  }

  /** Internal: notify all change handlers */
  notifyChange(content: string): void {
    for (const handler of this.changeHandlers) {
      try {
        handler(content);
      } catch (err) {
        console.warn("[embed-api] change handler error:", err);
      }
    }
  }

  /** Send a message via the bridge to parent */
  sendToHost(type: string, payload: unknown): void {
    if (window.parent && window.parent !== window) {
      this.bridge.postMessage(window.parent, {
        type,
        payload,
        source: "monaco-vanced",
      });
    }
  }

  dispose(): void {
    this.ctx = null;
    this.changeHandlers = [];
  }
}
