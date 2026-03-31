// ── Editor plugin — boots Monaco, manages models, applies themes ──
import type { MonacoPlugin, PluginContext, Monaco } from "../../../core/types";
import { ModelManager } from "./model-manager";
import { mergeEditorOptions } from "./options";
import type { EditorConfig } from "./types";

export function createEditorPlugin(config?: EditorConfig): MonacoPlugin {
  let modelManager: ModelManager;

  return {
    id: "editor-module",
    name: "Editor Module",
    version: "1.0.0",
    description: "Boots Monaco editor, manages text models, applies themes and options",
    priority: 100,
    defaultEnabled: true,

    onBeforeMount(_monaco: Monaco) {
      // Apply default editor options globally before editor creation
      mergeEditorOptions(config?.editorOptions);
    },

    onMount(ctx: PluginContext) {
      const { monaco, editor } = ctx;
      modelManager = new ModelManager(monaco, ctx);

      // Listen for file:read → create model
      ctx.on("file:read", (payload) => {
        const { path, data } = payload as { path: string; data: string };
        const model = modelManager.create(path, data);
        editor.setModel(model);
      });

      // Listen for file:open → switch to existing model or wait for read
      ctx.on("file:open", (payload) => {
        const { path } = payload as { path: string };
        const existing = modelManager.get(path);
        if (existing) {
          editor.setModel(existing);
          ctx.emit("tab:switch", { uri: path });
        }
      });

      // Listen for file:written → mark model clean
      ctx.on("file:written", (payload) => {
        const { path } = payload as { path: string };
        modelManager.markClean(path);
      });

      // Listen for file:close → dispose model if configured
      if (config?.autoDisposeModels !== false) {
        ctx.on("file:close", (payload) => {
          const { path } = payload as { path: string };
          modelManager.dispose(path);
        });
      }

      ctx.emit("editor:ready", { instance: editor });
    },

    onLanguageChange(language: string, ctx: PluginContext) {
      ctx.emit("editor:language-change", { language });
    },

    onDispose() {
      modelManager?.disposeAll();
    },
  };
}

export { ModelManager } from "./model-manager";
export { mergeEditorOptions, defaultEditorOptions } from "./options";
export type { EditorConfig, ModelState } from "./types";
