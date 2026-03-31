// ── Public API — single entry point for creating a Monaco Vanced IDE instance ──

import type { MonacoPlugin, Monaco, MonacoEditor, BootConfig } from "./types";
import { EventBus } from "./event-bus";
import { PluginEngine } from "./plugin-engine";

export interface CreateIDEOptions {
  /** Container element (or CSS selector) for the editor */
  container: HTMLElement | string;
  /** Plugins to load */
  plugins: MonacoPlugin[];
  /** Initial editor value */
  value?: string;
  /** Initial language */
  language?: string;
  /** Monaco editor options */
  editorOptions?: Record<string, unknown>;
  /** Boot configuration (error strategy, callbacks) */
  bootConfig?: BootConfig;
  /** Shared event bus (created automatically if omitted) */
  eventBus?: EventBus;
}

export interface MonacoVancedInstance {
  /** The underlying Monaco editor */
  editor: MonacoEditor;
  /** Plugin engine for runtime plugin management */
  engine: PluginEngine;
  /** Event bus shared across all plugins */
  eventBus: EventBus;
  /** Add a plugin at runtime */
  addPlugin(plugin: MonacoPlugin): Promise<void>;
  /** Remove a plugin at runtime */
  removePlugin(id: string): Promise<void>;
  /** Destroy the entire IDE instance */
  destroy(): Promise<void>;
}

/**
 * Creates a Monaco Vanced IDE instance.
 *
 * ```ts
 * const ide = await createMonacoIDE({
 *   container: '#editor',
 *   plugins: [myPlugin, anotherPlugin],
 *   language: 'typescript',
 * });
 * ```
 */
export async function createMonacoIDE(
  options: CreateIDEOptions,
): Promise<MonacoVancedInstance> {
  const { plugins, value, language, editorOptions, bootConfig } = options;

  const container =
    typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)
      : options.container;

  if (!container) {
    throw new Error("Monaco Vanced: container element not found.");
  }

  // Resolve Monaco global
  const monacoGlobal = (globalThis as Record<string, unknown>).monaco as Monaco | undefined;
  if (!monacoGlobal) {
    throw new Error("Monaco Vanced: `monaco` global not found. Ensure monaco-editor is loaded.");
  }

  // Create event bus + engine
  const eventBus = options.eventBus ?? new EventBus();
  const engine = new PluginEngine(eventBus, bootConfig);

  // Register all plugins
  engine.registerAll(plugins);

  // Create editor
  const editor = monacoGlobal.editor.create(container, {
    value: value ?? "",
    language: language ?? "plaintext",
    automaticLayout: true,
    ...editorOptions,
  });

  // Boot — runs Phase 1-5 lifecycle
  await engine.boot(monacoGlobal, editor);

  eventBus.emit("editor:create", { languageId: language ?? "plaintext" });

  return {
    editor,
    engine,
    eventBus,
    addPlugin: (plugin) => engine.addPlugin(plugin, monacoGlobal, editor),
    removePlugin: (id) => engine.removePlugin(id),
    destroy: async () => {
      await engine.destroyAll();
      editor.dispose();
      eventBus.emit("editor:destroy", {});
    },
  };
}
