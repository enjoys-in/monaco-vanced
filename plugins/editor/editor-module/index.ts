// ── Editor plugin — boots Monaco, manages models, applies themes ──
import type { MonacoPlugin, PluginContext, Monaco } from "@core/types";
import { ModelManager } from "./model-manager";
import { mergeEditorOptions } from "./options";
import type { EditorConfig } from "./types";
import { FileEvents, TabEvents, EditorEvents } from "@core/events";

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
      ctx.on(FileEvents.Read, (payload) => {
        const { path, data } = payload as { path: string; data: string };
        const model = modelManager.create(path, data);
        editor.setModel(model);
      });

      // Listen for file:open → switch to existing model or wait for read
      ctx.on(FileEvents.Open, (payload) => {
        const { path } = payload as { path: string };
        const existing = modelManager.get(path);
        if (existing) {
          editor.setModel(existing);
          ctx.emit(TabEvents.Switch, { uri: path });
        }
      });

      // Listen for file:written → mark model clean
      ctx.on(FileEvents.Written, (payload) => {
        const { path } = payload as { path: string };
        modelManager.markClean(path);
      });

      // Listen for file:close → dispose model if configured
      if (config?.autoDisposeModels !== false) {
        ctx.on(FileEvents.Close, (payload) => {
          const { path } = payload as { path: string };
          modelManager.dispose(path);
        });
      }

      ctx.emit(EditorEvents.Ready, { instance: editor });
    },

    onLanguageChange(language: string, ctx: PluginContext) {
      ctx.emit(EditorEvents.LanguageChange, { language });
    },

    onDispose() {
      modelManager?.disposeAll();
    },
  };
}

export { ModelManager } from "./model-manager";
export { mergeEditorOptions, defaultEditorOptions } from "./options";
export type { EditorConfig, ModelState } from "./types";
