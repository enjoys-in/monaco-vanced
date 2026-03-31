// ── Global type augmentations ────────────────────────────────
import type * as monacoNs from "monaco-editor";
import { PluginEngine, EventBus } from "@enjoys/monaco-vanced";

declare global {
  interface Window {
    /** Monaco namespace — exposed for dev console */
    monaco: typeof monacoNs;
    /** Active editor instance */
    editor: monacoNs.editor.IStandaloneCodeEditor;
    /** Plugin engine (register/boot/destroy plugins) */
    engine: InstanceType<typeof PluginEngine>;
    /** Shared event bus (emit/on cross-plugin events) */
    eventBus: InstanceType<typeof EventBus>;
  }
}
