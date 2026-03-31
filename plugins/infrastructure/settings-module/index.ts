// ── Settings Module — Plugin Entry ─────────────────────────────
// Spec-compliant 3-layer settings with dot-object, Dexie persistence,
// per-language overrides, snippets subsystem, Settings UI panel, and JSON editor.

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  SettingSchema,
  SettingSchemaRegistration,
  SettingsConfig,
  SettingsLayer,
  SettingsModuleAPI,
  SettingsChangeEvent,
  ValidationResult,
  SnippetFile,
  SettingsCategory,
  SettingType,
} from "./types";
import { SchemaRegistry } from "./schema-registry";
import { SettingsStore } from "./store";
import { SettingsValidator } from "./validator";
import { SettingsJSONEditor } from "./json-editor";
import { SettingsWatcher } from "./watcher";
import { SnippetsRegistry } from "./snippets";

// ── Re-exports ───────────────────────────────────────────────

export type {
  SettingSchema,
  SettingSchemaRegistration,
  SettingsConfig,
  SettingsLayer,
  SettingsModuleAPI,
  SettingsChangeEvent,
  ValidationResult,
  SettingType,
  SettingsCategory,
  SnippetFile,
} from "./types";
export { SchemaRegistry } from "./schema-registry";
export { SettingsStore } from "./store";
export { SettingsValidator } from "./validator";
export { SettingsJSONEditor } from "./json-editor";
export { SettingsMigrator } from "./migration";
export { SettingsWatcher } from "./watcher";
export { SnippetsRegistry } from "./snippets";
export { renderSettingsUI } from "./settings-ui";

// ── Default editor options (spec: IStandaloneEditorConstructionOptions) ──

const DEFAULT_EDITOR_SETTINGS: Record<string, { type: SettingType; default: unknown; description: string }> = {
  "editor.automaticLayout":            { type: "boolean", default: true, description: "Auto-resize editor on container size change" },
  "editor.fontSize":                   { type: "number",  default: 14,  description: "Font size in pixels" },
  "editor.fontFamily":                 { type: "string",  default: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, monospace", description: "Font family" },
  "editor.fontLigatures":              { type: "boolean", default: true, description: "Enable font ligatures" },
  "editor.minimap.enabled":            { type: "boolean", default: true, description: "Show minimap" },
  "editor.scrollBeyondLastLine":       { type: "boolean", default: false, description: "Scroll past the last line" },
  "editor.smoothScrolling":            { type: "boolean", default: true, description: "Smooth scrolling" },
  "editor.cursorBlinking":             { type: "enum",    default: "smooth", description: "Cursor blinking style" },
  "editor.cursorSmoothCaretAnimation": { type: "enum",    default: "on", description: "Smooth caret animation" },
  "editor.bracketPairColorization":    { type: "boolean", default: true, description: "Colorize bracket pairs" },
  "editor.padding.top":                { type: "number",  default: 8, description: "Top padding in pixels" },
  "editor.padding.bottom":             { type: "number",  default: 8, description: "Bottom padding in pixels" },
  "editor.renderLineHighlight":        { type: "enum",    default: "all", description: "Line highlight mode" },
  "editor.tabSize":                    { type: "number",  default: 2, description: "Tab size in spaces" },
  "editor.wordWrap":                   { type: "enum",    default: "off", description: "Word wrap mode" },
  "editor.lineNumbers":                { type: "enum",    default: "on", description: "Line numbers mode" },
  "editor.folding":                    { type: "boolean", default: true, description: "Enable code folding" },
  "editor.glyphMargin":                { type: "boolean", default: true, description: "Show glyph margin" },
  "editor.fixedOverflowWidgets":       { type: "boolean", default: true, description: "Fixed overflow widgets" },
  "editor.formatOnSave":               { type: "boolean", default: false, description: "Format on save" },
  "editor.formatOnPaste":              { type: "boolean", default: false, description: "Format on paste" },
  "editor.formatOnType":               { type: "boolean", default: false, description: "Format on type" },
  "editor.rulers":                     { type: "array",   default: [], description: "Vertical ruler columns" },
  "editor.stickyScroll.enabled":       { type: "boolean", default: false, description: "Sticky scroll" },
  "editor.inlineSuggest.enabled":      { type: "boolean", default: true, description: "Inline suggestions" },
  "editor.suggest.showMethods":        { type: "boolean", default: true, description: "Show methods in suggestions" },
  "editor.suggest.showFunctions":      { type: "boolean", default: true, description: "Show functions in suggestions" },
};

const DEFAULT_THEME_SETTINGS: Record<string, { type: SettingType; default: unknown; description: string }> = {
  "themes.colorTheme": { type: "string", default: "dark-plus", description: "Active color theme" },
  "themes.iconTheme":  { type: "string", default: "material-icons", description: "Active icon theme" },
};

const DEFAULT_LAYOUT_SETTINGS: Record<string, { type: SettingType; default: unknown; description: string }> = {
  "layout.sidebarPosition":    { type: "enum",    default: "left", description: "Sidebar position" },
  "layout.sidebarWidth":       { type: "number",  default: 240, description: "Sidebar width" },
  "layout.rightPanelWidth":    { type: "number",  default: 320, description: "Right panel width" },
  "layout.bottomPanelHeight":  { type: "number",  default: 200, description: "Bottom panel height" },
  "layout.editorGroups":       { type: "number",  default: 1, description: "Editor group count" },
  "layout.panelVisible":       { type: "boolean", default: true, description: "Bottom panel visible" },
  "layout.rightPanelVisible":  { type: "boolean", default: true, description: "Right panel visible" },
  "layout.activityBarVisible": { type: "boolean", default: true, description: "Activity bar visible" },
  "layout.statusBarVisible":   { type: "boolean", default: true, description: "Status bar visible" },
  "layout.minimap":            { type: "boolean", default: true, description: "Minimap visible" },
  "layout.breadcrumbs":        { type: "boolean", default: true, description: "Breadcrumbs visible" },
  "layout.stickyScroll":       { type: "boolean", default: false, description: "Sticky scroll" },
};

// ── Plugin factory ───────────────────────────────────────────

export function createSettingsPlugin(config: SettingsConfig = {}): {
  plugin: MonacoPlugin;
  api: SettingsModuleAPI;
} {
  const schemaRegistry = new SchemaRegistry();
  const store = new SettingsStore(schemaRegistry, config.persistKey);
  const validator = new SettingsValidator();
  const jsonEditor = new SettingsJSONEditor();
  const watcher = new SettingsWatcher();
  const snippets = new SnippetsRegistry();
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  // ── Register built-in schemas ──────────────────────────

  function registerBuiltinSchemas(): void {
    const groups: [string, Record<string, { type: SettingType; default: unknown; description: string }>, SettingsCategory][] = [
      ["editor", DEFAULT_EDITOR_SETTINGS, "editor"],
      ["themes", DEFAULT_THEME_SETTINGS, "themes"],
      ["layout", DEFAULT_LAYOUT_SETTINGS, "layout"],
    ];
    for (const [_ns, defs, cat] of groups) {
      for (const [key, def] of Object.entries(defs)) {
        schemaRegistry.register({ key, ...def, category: cat });
      }
      // Seed defaults layer
      const defaults: Record<string, unknown> = {};
      for (const [key, def] of Object.entries(defs)) {
        defaults[key] = def.default;
      }
      store.setDefaults(defaults);
    }
  }

  // ── API ────────────────────────────────────────────────

  const api: SettingsModuleAPI = {
    get<T = unknown>(key: string, layer?: SettingsLayer): T {
      return store.get<T>(key, layer);
    },

    set<T = unknown>(key: string, value: T, layer: SettingsLayer = "user"): void {
      const schema = schemaRegistry.get(key);
      if (schema) {
        const result = validator.validate(value, schema);
        if (!result.valid) {
          console.warn(`[settings] Validation failed for "${key}":`, result.errors);
          return;
        }
      }
      const previousValue = store.get(key);
      store.set(key, value, layer);
      const event: SettingsChangeEvent = { key, value, previousValue, layer };
      watcher.notify(event);
      ctx?.emit("settings:change", event);
    },

    reset(key: string, layer?: SettingsLayer): void {
      const previousValue = store.get(key);
      store.reset(key, layer);
      const newValue = store.get(key);
      watcher.notify({ key, value: newValue, previousValue, layer: layer ?? "defaults" });
      ctx?.emit("settings:reset", { key, layer });
    },

    getAll(namespace: string): Record<string, unknown> {
      return store.getNamespace(namespace);
    },

    watch(key: string, cb: (value: unknown) => void): IDisposable {
      return watcher.watch(key, (event) => cb(event.value));
    },

    register(schema: SettingSchemaRegistration): void {
      schemaRegistry.registerNamespace(schema);
      // Seed defaults
      for (const [key, def] of Object.entries(schema.schema)) {
        const current = store.get(key);
        if (current === undefined) {
          store.set(key, def.default, "defaults");
        }
      }
      ctx?.emit("settings:schema-register", { namespace: schema.namespace });
    },

    export(layer: SettingsLayer): string {
      const data = store.exportLayer(layer);
      ctx?.emit("settings:export", { layer });
      return jsonEditor.serialize(data);
    },

    import(json: string, layer: SettingsLayer): void {
      const parsed = jsonEditor.parse(json);
      const count = store.importNested(parsed, layer);
      ctx?.emit("settings:import", { layer, count });
    },

    openUI(section?: string): void {
      ctx?.emit("settings:ui-open", { section });
    },

    openJSON(layer: SettingsLayer = "user"): void {
      ctx?.emit("settings:json-open", { layer });
    },

    // ── Extras ───────────────────────────────────────────

    getSchema(key: string): SettingSchema | undefined {
      return schemaRegistry.get(key);
    },

    validate(key: string, value: unknown): ValidationResult {
      const schema = schemaRegistry.get(key);
      if (!schema) return { valid: true, errors: [] };
      return validator.validate(value, schema);
    },

    registerSnippets(language: string, snippetFile: SnippetFile): void {
      snippets.register(language, snippetFile);
      ctx?.emit("snippets:register", { language, count: Object.keys(snippetFile).length });
    },
  };

  // ── Plugin ─────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "infrastructure.settings",
    name: "Settings Module",
    version: "1.0.0",
    description: "VSCode-style 3-layer settings with schema validation, dot-object paths, snippets, and Settings UI",
    dependencies: ["infrastructure.storage", "filesystem.fs", "editor.commands"],
    priority: 95,

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Wait for IndexedDB restore
      await store.ready();

      // Register built-in schemas & defaults
      registerBuiltinSchemas();

      // Register snippets as completion providers for all tracked languages
      snippets.mountProviders(ctx);

      // Signal to the engine that settings API is ready for injection
      ctx.emit("settings:api-ready", api);

      // Register commands
      ctx.emit("command:register", {
        id: "preferences.openSettings",
        title: "Preferences: Open Settings",
        handler: () => api.openUI(),
      });
      ctx.emit("command:register", {
        id: "preferences.openSettingsJSON",
        title: "Preferences: Open Settings (JSON)",
        handler: () => api.openJSON("user"),
      });

      // Listen for external settings:change requests
      disposables.push(
        ctx.on("settings:set", (data?: unknown) => {
          const d = data as { key?: string; value?: unknown; layer?: SettingsLayer } | undefined;
          if (d?.key !== undefined && d?.value !== undefined) {
            api.set(d.key, d.value, d.layer);
          }
        }),
      );

      // Listen for workspace settings.json changes (hot reload)
      disposables.push(
        ctx.on("fs:change", (data?: unknown) => {
          const d = data as { path?: string } | undefined;
          if (d?.path?.endsWith(".vscode/settings.json")) {
            ctx?.emit("fs:read", {
              path: d.path,
              callback: (content: string) => {
                try {
                  api.import(content, "workspace");
                } catch (e) {
                  console.warn("[settings] Failed to reload workspace settings:", e);
                }
              },
            });
          }
        }),
      );

      // Listen for settings:ui-open to render Settings UI panel
      disposables.push(
        ctx.on("settings:ui-open", (data?: unknown) => {
          const d = data as { section?: string } | undefined;
          ctx?.emit("layout:register-right-view", {
            id: "settings-panel",
            title: "Settings",
            render: (container: HTMLElement) => {
              // Dynamically import to avoid circular deps
              import("./settings-ui").then(({ renderSettingsUI }) => {
                renderSettingsUI(container, {
                  schemaRegistry,
                  store,
                  api,
                  section: d?.section,
                });
              });
            },
          });
        }),
      );

      // Listen for settings:json-open to open JSON in editor
      disposables.push(
        ctx.on("settings:json-open", (data?: unknown) => {
          const d = data as { layer?: SettingsLayer } | undefined;
          const layer = d?.layer ?? "user";
          const json = api.export(layer);
          ctx?.emit("editor:open-virtual", {
            uri: `settings://${layer}/settings.json`,
            language: "json",
            content: json,
          });
        }),
      );
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      watcher.dispose();
      snippets.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
