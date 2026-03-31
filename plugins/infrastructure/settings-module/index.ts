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
import { SettingsEvents, SnippetEvents, CommandEvents, FsEvents, LayoutEvents, EditorEvents } from "@core/events";

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
  // ── IStandaloneEditorConstructionOptions (own) ─────────
  "editor.theme":                          { type: "string",  default: "vs-dark", description: "Editor theme: 'vs', 'vs-dark', 'hc-black', 'hc-light'" },
  "editor.autoDetectHighContrast":         { type: "boolean", default: true, description: "Auto-switch to high contrast theme based on OS setting" },

  // ── IGlobalEditorOptions ──────────────────────────────
  "editor.tabSize":                        { type: "number",  default: 2, description: "Tab size in spaces" },
  "editor.insertSpaces":                   { type: "boolean", default: true, description: "Insert spaces when pressing Tab" },
  "editor.detectIndentation":              { type: "boolean", default: true, description: "Auto-detect tabSize and insertSpaces from file content" },
  "editor.trimAutoWhitespace":             { type: "boolean", default: true, description: "Remove trailing auto-inserted whitespace" },
  "editor.largeFileOptimizations":         { type: "boolean", default: true, description: "Disable memory-intensive features for large files" },
  "editor.wordBasedSuggestions":           { type: "enum",    default: "currentDocument", description: "Word-based completions source" },
  "editor.stablePeek":                     { type: "boolean", default: false, description: "Keep peek editors open even when double-clicking" },
  "editor.maxTokenizationLineLength":      { type: "number",  default: 20000, description: "Max line length for tokenization" },

  // ── Font & Typography ──────────────────────────────────
  "editor.fontFamily":                     { type: "string",  default: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, monospace", description: "Font family" },
  "editor.fontSize":                       { type: "number",  default: 14, description: "Font size in pixels" },
  "editor.fontWeight":                     { type: "string",  default: "normal", description: "Font weight ('normal', 'bold', '100'-'900')" },
  "editor.fontLigatures":                  { type: "boolean", default: true, description: "Enable font ligatures" },
  "editor.fontVariations":                 { type: "boolean", default: false, description: "Enable font variations" },
  "editor.lineHeight":                     { type: "number",  default: 0, description: "Line height (0 = auto from fontSize)" },
  "editor.letterSpacing":                  { type: "number",  default: 0, description: "Letter spacing in pixels" },

  // ── Cursor ─────────────────────────────────────────────
  "editor.cursorBlinking":                 { type: "enum",    default: "smooth", description: "Cursor blinking style: 'blink', 'smooth', 'phase', 'expand', 'solid'" },
  "editor.cursorSmoothCaretAnimation":     { type: "enum",    default: "on", description: "Smooth caret animation: 'off', 'explicit', 'on'" },
  "editor.cursorStyle":                    { type: "enum",    default: "line", description: "Cursor style: 'line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'" },
  "editor.cursorWidth":                    { type: "number",  default: 0, description: "Cursor width in pixels (0 = default for cursor style)" },
  "editor.cursorSurroundingLines":         { type: "number",  default: 0, description: "Min visible lines around cursor" },
  "editor.cursorSurroundingLinesStyle":    { type: "enum",    default: "default", description: "When cursorSurroundingLines is enforced: 'default', 'all'" },

  // ── Scrolling ──────────────────────────────────────────
  "editor.smoothScrolling":                { type: "boolean", default: true, description: "Animate scrolling" },
  "editor.scrollBeyondLastLine":           { type: "boolean", default: false, description: "Scroll past the last line" },
  "editor.scrollBeyondLastColumn":         { type: "number",  default: 5, description: "Extra columns scrollable past last character" },
  "editor.mouseWheelZoom":                 { type: "boolean", default: false, description: "Zoom with Ctrl+mouse wheel" },
  "editor.mouseWheelScrollSensitivity":    { type: "number",  default: 1, description: "Mouse wheel scroll speed multiplier" },
  "editor.fastScrollSensitivity":          { type: "number",  default: 5, description: "Fast scroll multiplier with Alt key" },
  "editor.scrollPredominantAxis":          { type: "boolean", default: true, description: "Scroll only predominant axis on diagonal scroll" },

  // ── Minimap ────────────────────────────────────────────
  "editor.minimap.enabled":                { type: "boolean", default: true, description: "Show minimap" },

  // ── Sticky Scroll ──────────────────────────────────────
  "editor.stickyScroll.enabled":           { type: "boolean", default: false, description: "Sticky scroll" },

  // ── Line Numbers & Gutter ──────────────────────────────
  "editor.lineNumbers":                    { type: "enum",    default: "on", description: "Line numbers mode: 'on', 'off', 'relative', 'interval'" },
  "editor.lineNumbersMinChars":            { type: "number",  default: 5, description: "Min chars reserved for line numbers" },
  "editor.glyphMargin":                    { type: "boolean", default: true, description: "Show glyph margin" },
  "editor.selectOnLineNumbers":            { type: "boolean", default: true, description: "Select line on line number click" },

  // ── Line Rendering ─────────────────────────────────────
  "editor.renderLineHighlight":            { type: "enum",    default: "all", description: "Current line highlight: 'none', 'gutter', 'line', 'all'" },
  "editor.renderLineHighlightOnlyWhenFocus": { type: "boolean", default: false, description: "Line highlight only when editor is focused" },
  "editor.renderWhitespace":               { type: "enum",    default: "selection", description: "Render whitespace: 'none', 'boundary', 'selection', 'trailing', 'all'" },
  "editor.renderControlCharacters":        { type: "boolean", default: true, description: "Render control characters" },
  "editor.renderFinalNewline":             { type: "enum",    default: "on", description: "Render final newline: 'on', 'off', 'dimmed'" },
  "editor.renderValidationDecorations":    { type: "enum",    default: "editable", description: "Render validation decorations: 'editable', 'on', 'off'" },

  // ── Wrapping ───────────────────────────────────────────
  "editor.wordWrap":                       { type: "enum",    default: "off", description: "Word wrap: 'off', 'on', 'wordWrapColumn', 'bounded'" },
  "editor.wordWrapColumn":                 { type: "number",  default: 80, description: "Column at which to wrap" },
  "editor.wrappingIndent":                 { type: "enum",    default: "none", description: "Wrapped line indent: 'none', 'same', 'indent', 'deepIndent'" },
  "editor.wrappingStrategy":               { type: "enum",    default: "simple", description: "Wrapping algorithm: 'simple', 'advanced'" },

  // ── Folding ────────────────────────────────────────────
  "editor.folding":                        { type: "boolean", default: true, description: "Enable code folding" },
  "editor.foldingStrategy":                { type: "enum",    default: "auto", description: "Folding strategy: 'auto', 'indentation'" },
  "editor.foldingHighlight":               { type: "boolean", default: true, description: "Highlight folded regions" },
  "editor.foldingImportsByDefault":        { type: "boolean", default: true, description: "Auto fold imports" },
  "editor.foldingMaximumRegions":          { type: "number",  default: 5000, description: "Max foldable regions" },
  "editor.showFoldingControls":            { type: "enum",    default: "mouseover", description: "Fold controls visibility: 'always', 'never', 'mouseover'" },
  "editor.unfoldOnClickAfterEndOfLine":    { type: "boolean", default: false, description: "Unfold when clicking after end of folded line" },

  // ── Bracket Matching & Colorization ────────────────────
  "editor.matchBrackets":                  { type: "enum",    default: "always", description: "Bracket matching: 'never', 'near', 'always'" },
  "editor.bracketPairColorization":        { type: "boolean", default: true, description: "Colorize bracket pairs" },

  // ── Suggestions & Completions ──────────────────────────
  "editor.quickSuggestions":               { type: "boolean", default: true, description: "Quick (shadow) suggestions" },
  "editor.quickSuggestionsDelay":          { type: "number",  default: 10, description: "Quick suggestions delay in ms" },
  "editor.suggestOnTriggerCharacters":     { type: "boolean", default: true, description: "Show suggestions on trigger characters" },
  "editor.acceptSuggestionOnEnter":        { type: "enum",    default: "on", description: "Accept suggestion on Enter: 'on', 'smart', 'off'" },
  "editor.acceptSuggestionOnCommitCharacter": { type: "boolean", default: true, description: "Accept suggestion on provider-defined commit characters" },
  "editor.snippetSuggestions":             { type: "enum",    default: "inline", description: "Snippet suggestions: 'top', 'bottom', 'inline', 'none'" },
  "editor.suggestSelection":              { type: "enum",    default: "first", description: "Suggestion selection: 'first', 'recentlyUsed', 'recentlyUsedByPrefix'" },
  "editor.suggestFontSize":               { type: "number",  default: 0, description: "Suggest widget font size (0 = editor font size)" },
  "editor.suggestLineHeight":             { type: "number",  default: 0, description: "Suggest widget line height (0 = editor line height)" },
  "editor.tabCompletion":                  { type: "enum",    default: "off", description: "Tab completion: 'on', 'off', 'onlySnippets'" },
  "editor.suggest.showMethods":            { type: "boolean", default: true, description: "Show methods in suggestions" },
  "editor.suggest.showFunctions":          { type: "boolean", default: true, description: "Show functions in suggestions" },
  "editor.inlineSuggest.enabled":          { type: "boolean", default: true, description: "Inline suggestions (ghost text)" },

  // ── Padding ────────────────────────────────────────────
  "editor.padding.top":                    { type: "number",  default: 8, description: "Top padding in pixels" },
  "editor.padding.bottom":                 { type: "number",  default: 8, description: "Bottom padding in pixels" },

  // ── Formatting ─────────────────────────────────────────
  "editor.formatOnSave":                   { type: "boolean", default: false, description: "Format on save" },
  "editor.formatOnPaste":                  { type: "boolean", default: false, description: "Format on paste" },
  "editor.formatOnType":                   { type: "boolean", default: false, description: "Format on type" },

  // ── Selection & Multi-Cursor ───────────────────────────
  "editor.selectionHighlight":             { type: "boolean", default: true, description: "Highlight matching selections" },
  "editor.occurrencesHighlight":           { type: "enum",    default: "singleFile", description: "Semantic occurrences: 'off', 'singleFile', 'multiFile'" },
  "editor.columnSelection":               { type: "boolean", default: false, description: "Column selection mode" },
  "editor.multiCursorModifier":            { type: "enum",    default: "alt", description: "Multi-cursor modifier key: 'ctrlCmd', 'alt'" },
  "editor.multiCursorMergeOverlapping":    { type: "boolean", default: true, description: "Merge overlapping selections" },
  "editor.multiCursorPaste":               { type: "enum",    default: "spread", description: "Multi-cursor paste: 'spread', 'full'" },
  "editor.emptySelectionClipboard":        { type: "boolean", default: true, description: "Copy current line when no selection" },
  "editor.copyWithSyntaxHighlighting":     { type: "boolean", default: true, description: "Copy with syntax highlighting" },
  "editor.roundedSelection":               { type: "boolean", default: true, description: "Rounded selection borders" },

  // ── Auto-Closing & Auto-Surround ──────────────────────
  "editor.autoClosingBrackets":            { type: "enum",    default: "languageDefined", description: "Auto-close brackets: 'always', 'languageDefined', 'beforeWhitespace', 'never'" },
  "editor.autoClosingComments":            { type: "enum",    default: "languageDefined", description: "Auto-close comments: 'always', 'languageDefined', 'beforeWhitespace', 'never'" },
  "editor.autoClosingQuotes":              { type: "enum",    default: "languageDefined", description: "Auto-close quotes: 'always', 'languageDefined', 'beforeWhitespace', 'never'" },
  "editor.autoClosingDelete":              { type: "enum",    default: "auto", description: "Backspace behavior near auto-closed brackets/quotes" },
  "editor.autoClosingOvertype":            { type: "enum",    default: "auto", description: "Type over closing quotes/brackets" },
  "editor.autoSurround":                   { type: "enum",    default: "languageDefined", description: "Auto surrounding: 'languageDefined', 'quotes', 'brackets', 'never'" },
  "editor.autoIndent":                     { type: "enum",    default: "advanced", description: "Auto indentation: 'none', 'keep', 'brackets', 'advanced', 'full'" },
  "editor.linkedEditing":                  { type: "boolean", default: false, description: "Enable linked editing (rename tag pairs)" },

  // ── Code Lens ──────────────────────────────────────────
  "editor.codeLens":                       { type: "boolean", default: true, description: "Show code lens" },
  "editor.codeLensFontFamily":             { type: "string",  default: "", description: "Code lens font family (empty = editor font)" },
  "editor.codeLensFontSize":               { type: "number",  default: 0, description: "Code lens font size (0 = 90% of editor font)" },

  // ── Links & Colors ─────────────────────────────────────
  "editor.links":                          { type: "boolean", default: true, description: "Detect and render clickable links" },
  "editor.colorDecorators":                { type: "boolean", default: true, description: "Show inline color decorators" },
  "editor.colorDecoratorsActivatedOn":     { type: "enum",    default: "clickAndHover", description: "Color picker activation: 'clickAndHover', 'click', 'hover'" },
  "editor.colorDecoratorsLimit":           { type: "number",  default: 500, description: "Max color decorators per editor" },
  "editor.defaultColorDecorators":         { type: "enum",    default: "auto", description: "Default color decorations: 'auto', 'always', 'never'" },

  // ── Miscellaneous ──────────────────────────────────────
  "editor.automaticLayout":                { type: "boolean", default: true, description: "Auto-resize editor on container size change" },
  "editor.fixedOverflowWidgets":           { type: "boolean", default: true, description: "Render overflow widgets as fixed" },
  "editor.overviewRulerLanes":             { type: "number",  default: 3, description: "Overview ruler vertical lanes" },
  "editor.overviewRulerBorder":            { type: "boolean", default: true, description: "Border around overview ruler" },
  "editor.rulers":                         { type: "array",   default: [], description: "Vertical ruler columns" },
  "editor.readOnly":                       { type: "boolean", default: false, description: "Read-only mode" },
  "editor.domReadOnly":                    { type: "boolean", default: false, description: "DOM readonly attribute on textarea" },
  "editor.dragAndDrop":                    { type: "boolean", default: false, description: "Drag and drop text selections" },
  "editor.contextmenu":                    { type: "boolean", default: true, description: "Custom context menu" },
  "editor.accessibilitySupport":           { type: "enum",    default: "auto", description: "Accessibility support: 'auto', 'off', 'on'" },
  "editor.showUnused":                     { type: "boolean", default: true, description: "Fade unused variables" },
  "editor.showDeprecated":                 { type: "boolean", default: true, description: "Strikethrough deprecated variables" },
  "editor.useTabStops":                    { type: "boolean", default: true, description: "Tab/Backspace follows tab stops" },
  "editor.stickyTabStops":                 { type: "boolean", default: false, description: "Emulate tab selection with spaces" },
  "editor.peekWidgetDefaultFocus":         { type: "enum",    default: "tree", description: "Peek widget default focus: 'tree', 'editor'" },
  "editor.definitionLinkOpensInPeek":      { type: "boolean", default: false, description: "Ctrl+click opens in peek instead of navigate" },
  "editor.hideCursorInOverviewRuler":      { type: "boolean", default: false, description: "Hide cursor in overview ruler" },
  "editor.stopRenderingLineAfter":         { type: "number",  default: 10000, description: "Stop rendering line after x characters" },
  "editor.wordSeparators":                 { type: "string",  default: "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?", description: "Word separators for word navigation" },
  "editor.unusualLineTerminators":         { type: "enum",    default: "prompt", description: "Handle unusual line terminators: 'auto', 'off', 'prompt'" },
  "editor.inDiffEditor":                   { type: "boolean", default: false, description: "Editor is inside a diff editor" },
  "editor.mouseStyle":                     { type: "enum",    default: "text", description: "Mouse pointer style: 'text', 'default', 'copy'" },
  "editor.experimentalGpuAcceleration":    { type: "enum",    default: "off", description: "WebGPU rendering: 'on', 'off'" },
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
      ctx?.emit(SettingsEvents.Change, event);
    },

    reset(key: string, layer?: SettingsLayer): void {
      const previousValue = store.get(key);
      store.reset(key, layer);
      const newValue = store.get(key);
      watcher.notify({ key, value: newValue, previousValue, layer: layer ?? "defaults" });
      ctx?.emit(SettingsEvents.Reset, { key, layer });
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
      ctx?.emit(SettingsEvents.SchemaRegister, { namespace: schema.namespace });
    },

    export(layer: SettingsLayer): string {
      const data = store.exportLayer(layer);
      ctx?.emit(SettingsEvents.Export, { layer });
      return jsonEditor.serialize(data);
    },

    import(json: string, layer: SettingsLayer): void {
      const parsed = jsonEditor.parse(json);
      const count = store.importNested(parsed, layer);
      ctx?.emit(SettingsEvents.Import, { layer, count });
    },

    openUI(section?: string): void {
      ctx?.emit(SettingsEvents.UIOpen, { section });
    },

    openJSON(layer: SettingsLayer = "user"): void {
      ctx?.emit(SettingsEvents.JSONOpen, { layer });
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
      ctx?.emit(SnippetEvents.Register, { language, count: Object.keys(snippetFile).length });
    },
  };

  // ── Plugin ─────────────────────────────────────────────

  const plugin: MonacoPlugin = {
    id: "infrastructure.settings",
    name: "Settings Module",
    version: "1.0.0",
    description: "VSCode-style 3-layer settings with schema validation, dot-object paths, snippets, and Settings UI",
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
      ctx.emit(SettingsEvents.ApiReady, api);

      // Register commands
      ctx.emit(CommandEvents.Register, {
        id: "preferences.openSettings",
        title: "Preferences: Open Settings",
        handler: () => api.openUI(),
      });
      ctx.emit(CommandEvents.Register, {
        id: "preferences.openSettingsJSON",
        title: "Preferences: Open Settings (JSON)",
        handler: () => api.openJSON("user"),
      });

      // Listen for external settings:change requests
      disposables.push(
        ctx.on(SettingsEvents.Set, (data?: unknown) => {
          const d = data as { key?: string; value?: unknown; layer?: SettingsLayer } | undefined;
          if (d?.key !== undefined && d?.value !== undefined) {
            api.set(d.key, d.value, d.layer);
          }
        }),
      );

      // Listen for workspace settings.json changes (hot reload)
      disposables.push(
        ctx.on(FsEvents.Change, (data?: unknown) => {
          const d = data as { path?: string } | undefined;
          if (d?.path?.endsWith(".vscode/settings.json")) {
            ctx?.emit(FsEvents.Read, {
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
        ctx.on(SettingsEvents.UIOpen, (data?: unknown) => {
          const d = data as { section?: string } | undefined;
          ctx?.emit(LayoutEvents.RegisterRightView, {
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
        ctx.on(SettingsEvents.JSONOpen, (data?: unknown) => {
          const d = data as { layer?: SettingsLayer } | undefined;
          const layer = d?.layer ?? "user";
          const json = api.export(layer);
          ctx?.emit(EditorEvents.OpenVirtual, {
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
