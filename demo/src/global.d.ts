// ── Global type augmentations ────────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { PluginEngine } from "@core/plugin-engine";
import type { EventBus } from "@core/event-bus";

declare global {
  interface Window {
    /** Monaco namespace — exposed for dev console */
    monaco: typeof monacoNs;
    /** Active editor instance */
    editor: monacoNs.editor.IStandaloneCodeEditor;
    /** Plugin engine (register/boot/destroy plugins) */
    engine: PluginEngine;
    /** Shared event bus (emit/on cross-plugin events) */
    eventBus: EventBus;
  }
}
