// ── Global type augmentations ────────────────────────────────
import type * as monacoNs from "monaco-editor";
import type { PluginEngine } from "@enjoys/monaco-vanced/core/plugin-engine";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { ConcurrencyModuleAPI, StreamingModuleAPI, WorkerModuleAPI } from "@enjoys/monaco-vanced";

// ── CSS module declarations ──────────────────────────────────
declare module "*.css" {
  const content: string;
  export default content;
}
declare module "*.scss" {
  const content: string;
  export default content;
}

// ── Worker import declarations (Vite ?worker suffix) ─────────
declare module "*?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module "monaco-editor/esm/vs/editor/editor.worker?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
declare module "monaco-editor/esm/vs/language/typescript/ts.worker?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
declare module "monaco-editor/esm/vs/language/json/json.worker?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
declare module "monaco-editor/esm/vs/language/css/css.worker?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
declare module "monaco-editor/esm/vs/language/html/html.worker?worker" {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

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
    /** Dev-only: all plugin APIs */
    __apis: Record<string, unknown>;
    /** Dev-only: concurrency API */
    __concurrencyApi: ConcurrencyModuleAPI;
    /** Dev-only: streaming API */
    __streamingApi: StreamingModuleAPI;
    /** Dev-only: worker API */
    __workerApi: WorkerModuleAPI;
    /** Dev-only: explorer API */
    __explorerApi: {
      newFile(): void;
      newFolder(): void;
      collapseAll(): void;
      refresh(): void;
    };
  }
}
