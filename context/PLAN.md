Instruction: Update PLAN.md on every step if any changes, use git-diff or blame

## BUILD STATUS: ✅ ALL 79 COMPONENTS IMPLEMENTED

| Section | Modules | Files | Status |
|---------|---------|-------|--------|
| Core Engine | 1 | 8 | ✅ Complete |
| Event Enums | — | 40 | ✅ Complete |
| Editor | 6 | 30 | ✅ Complete |
| Language | 9 | 63 | ✅ Complete |
| Filesystem | 4 | 29 | ✅ Complete |
| Layout | 8 | 42 | ✅ Complete |
| AI | 10 | 60 | ✅ Complete |
| SCM | 5 | 35 | ✅ Complete |
| Devtools | 6 | 30 | ✅ Complete |
| Extensions | 4 | 38 | ✅ Complete |
| Theming | 2 | 13 | ✅ Complete |
| Infrastructure | 8 | 45 | ✅ Complete |
| Platform | 9 | 60 | ✅ Complete |
| Enterprise | 9 | 85 | ✅ Complete |
| **TOTAL** | **80** | **578+** | **✅ All Done** |

Build: `npx tsc --noEmit` → 0 errors

## CRITICAL NOTE:
Every thing should be strongly Typed. No Use of any.
While Emtting and listening on Events Always use enum of Events 
 - for eg:
  ctx.emit("preview:provider-added", { id:"value" }); // Wrong
  ctx.emit(PreviewEvents.ProviderAdded, { id:"value" }); // Correct

# Monaco Vanced — Full IDE Build Plan (79 Components)

> Every feature is a plugin. Nothing is hardcoded. Plugins talk through events, never import each other.
> 72 modules + 7 standalone plugins = 79 components across 12 plugin categories.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         HOST APP (React)                             │
│  Mounts <MonacoEditor plugins={[...]} config={...} />               │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────────┐
│                     PLUGIN ENGINE (core)                             │
│  1. Resolves dependency graph (topological sort)                     │
│  2. Calls onBeforeMount(monaco) in order                             │
│  3. Creates editor instance                                          │
│  4. Builds PluginContext per plugin                                   │
│  5. Calls onMount(ctx) in order                                      │
│  6. Routes lifecycle events (language/content/config change)         │
│  7. Calls onDispose() on teardown                                    │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Built-in Plugins   Context Engine     User Plugins
   (ship with IDE)    (CDN packs)        (custom)
```

**Rule**: The host app passes an array of `MonacoPlugin[]`. The engine sorts them, injects context, and runs lifecycle hooks. Every module below is one `MonacoPlugin`. No module imports another module directly — they use `ctx.emit()` / `ctx.on()`.

---

## Module Master List (72 total)

### Core Modules (23)

| # | Module ID | Summary |
|---|---|---|
| 1 | `core-engine` | Plugin lifecycle, dependency resolution, EventBus, DI container, global state |
| 2 | `editor-module` | Boots Monaco, creates/destroys text models, applies themes, editor options |
| 3 | `context-module` | Registers all 26 Monaco language intelligence providers |
| 4 | `ai-module` | AI chat client. Configurable baseUrl. Transport: SSE / REST / WebSocket / Socket. Custom request/response schema |
| 5 | `vsix-module` | Fetches VSIX extensions, extracts themes/grammars/icons, converts to Monaco format |
| 6 | `theme-module` | Loads/converts/applies themes. VS Code tokenColor → IStandaloneThemeData |
| 7 | `icon-module` | Extension → SVG icon mapping. Lazy-fetch, Cache Storage API, file tree icons |
| 8 | `fs-module` | FS adapter abstraction. CRUD + watch. SFTP / API / Local backends |
| 9 | `indexer-module` | Web Worker symbol parser. Symbol table. Powers go-to-def, references, workspace symbols |
| 10 | `storage-module` | IndexedDB/OPFS. KV async API with TTL. Used by all modules for persistence |
| 11 | `sidebar-module` | Panel container. View panels, active state, collapse/expand, width resize |
| 12 | `tabs-module` | Tab strip. Open/close, active, dirty state, reorder, overflow menu |
| 13 | `statusbar-module` | Bottom bar. Cursor, language, encoding, errors, AI status, git branch |
| 14 | `terminal-module` | xterm.js terminal. PTY via WebSocket. stderr → diagnostics. Multi-tab |
| 15 | `command-module` | Central command registry. Command palette. When-clause context. Quick-open |
| 16 | `keybinding-module` | Key → command ID mapping. Chords, context overrides, VS Code import |
| 17 | `layout-module` | Split panes, resizable dividers, editor groups, panel visibility, drag-drop |
| 18 | `diagnostics-module` | Collects errors → Monaco markers. Problems panel. Quick-fix integration |
| 19 | `collab-module` | Real-time multi-user editing. OT/CRDT. Shared cursors. Presence |
| 20 | `notification-module` | Toast queue. Progress bars. Modal alerts. Severity levels |
| 21 | `extension-module` | Runtime extension management. Enable/disable. Manifest validation. Hot-reload |
| 22 | `title-module` | Title bar — displays active file/workspace name, breadcrumb path, dirty indicator |
| 23 | `header-module` | Custom header bar (anti-gravity / Electron-style). Menu bar, layout controls, auth & profile dropdown |

### Advanced Modules (19)

| # | Module ID | Summary |
|---|---|---|
| 24 | `agent-module` | Autonomous multi-step AI tasks. Read/edit/test/iterate |
| 25 | `memory-module` | Persistent AI context across sessions. Coding conventions, project summary |
| 26 | `rag-module` | Vector index of workspace. Embedding + retrieval for AI context |
| 27 | `eval-module` | Scores AI output. Tracks accept/reject. Fine-tune prompting |
| 28 | `lsp-bridge-module` | WebSocket bridge to real LSP servers (pyright, tsserver, rust-analyzer, etc.) |
| 29 | `debugger-module` | DAP implementation. Breakpoints, call stack, variables, step in/out |
| 30 | `git-module` | Source control. Diff, stage, commit, push/pull, branch, conflict resolution |
| 31 | `test-module` | Test discovery + runner (Jest, Vitest, pytest). Gutter icons. Coverage |
| 32 | `auth-module` | OAuth2 PKCE for GitHub/Google/custom. Token storage. Auto-refresh |
| 33 | `audit-module` | Action logging. Redaction. Export to console/HTTP/S3/Kafka |
| 34 | `secrets-module` | Vault/AWS Secrets/Doppler integration. Terminal env injection |
| 35 | `telemetry-module` | OpenTelemetry spans. Startup, file load, AI latency, LSP timing |
| 36 | `marketplace-module` | Extension discovery browser. Install/uninstall/update. Ratings |
| 37 | `embed-module` | iframe SDK. postMessage API for embedding in any web app |
| 38 | `notebook-module` | Jupyter-style cells. Kernel management. Inline output |
| 39 | `profiler-module` | CPU flame graphs, memory tracking, performance hotspot annotations |
| 40 | `review-module` | GitHub/GitLab PR comments as inline Monaco decorations |
| 41 | `snapshot-module` | Time-travel undo. Captures full IDE state. Restore to any point |
| 42 | `search-module` | Workspace full-text search. Regex + semantic via rag-module |

### v2.1 Modules (2)

| # | Module ID | Summary |
|---|---|---|
| 43 | `eslint-module` | ESLint integration. Config loading, diagnostics, auto-fix on save -  browser based/webworkers |
| 44 | `prettier-module` | Prettier integration. Format on save, per-language config -  browser based/webworkers |

### v2.2 Modules (2)

| # | Module ID | Summary |
|---|---|---|
| 45 | `settings-module` | VSCode-style 3-layer config (default → user → workspace). UI + JSON + API |
| 46 | `symbol-index-module` | In-memory + IndexedDB symbol index. Powers 6 providers via SymbolProviderFactory |

### Phase 1 — Gap Analysis Modules (7)

→ Full spec in `context/advanced-modules.txt` Sections 1-6

| # | Module ID | Summary |
|---|---|---|
| 47 | `performance-module` | Startup timing, lazy-load orchestration, bundle budget enforcement |
| 48 | `accessibility-module` | ARIA roles, screen reader, high-contrast, keyboard navigation, focus traps |
| 49 | `i18n-module` | ICU MessageFormat, lazy locale packs, RTL layout, plurals |
| 50 | `security-module` | CSP builder, iframe sandboxing, credential redaction, XSS prevention |
| 51 | `offline-module` | Service Worker, offline queue, cache-first strategies, sync on reconnect |
| 52 | `migration-module` | Schema versioning, IndexedDB migration runner, rollback support |
| 53 | `testing-harness-module` | MockFSAdapter, MockAIAdapter, PluginTestBed, contract assertions |

### Phase 2 — Additional Layers (11)

→ Full spec in `context/advanced-modules.txt` Sections 7-12

| # | Module ID | Summary |
|---|---|---|
| 54 | `crash-recovery-module` | Uncaught error capture, auto-save, crash report, warm restart |
| 55 | `sync-module` | Cross-tab state sync via BroadcastChannel, leader election |
| 56 | `resource-module` | Memory/CPU budgets, GC pressure tracking, tab throttling |
| 57 | `concurrency-module` | Web Worker pool, SharedArrayBuffer, task scheduler, deadlock detection |
| 58 | `intent-module` | User intent inference from editor actions, predictive preloading hints |
| 59 | `workspace-module` | Multi-root workspace management, folder config, workspace trust |
| 60 | `deep-link-module` | URL → editor state (file, line, selection, panel), shareable links |
| 61 | `knowledge-graph-module` | Symbol relationships, call graphs, import trees, dependency visualization |
| 62 | `streaming-module` | SSE/WebSocket streaming for AI responses, chunked file uploads |
| 63 | `virtualization-module` | Virtual scrolling for large file trees, search results, logs |
| 64 | `policy-module` | Org-wide rules enforcement, banned APIs, required linters |

### Phase 3 — Orchestration, Intelligence, Platform (8)

→ Full spec in `context/advanced-modules.txt` Sections 13-18

| # | Module ID | Summary |
|---|---|---|
| 65 | `context-fusion-module` | Multi-signal AI context assembly (editor + git + terminal + symbols) |
| 66 | `predictive-module` | Predictive preloading of files, completions, and panels |
| 67 | `ai-memory-module` | Persistent AI memory across sessions, project conventions learning |
| 68 | `fallback-module` | Graceful degradation — feature flags, capability detection, fallback UI |
| 69 | `api-stability-module` | Semver enforcement, deprecation tracking, breaking change detection |
| 70 | `saas-tenant-module` | Multi-tenant isolation, per-org config, data partitioning |
| 71 | `billing-module` | Usage metering, quota enforcement, plan-based feature gates |
| 72 | `realtime-module` | Real-time collaboration infrastructure, presence, conflict resolution |

---

## Core Engine (`core/`)

The only non-plugin code. Everything else receives `PluginContext`.

| File | Responsibility |
|---|---|
| `core/plugin-engine.ts` | Dependency resolution, lifecycle orchestration, hot-reload |
| `core/plugin-context.ts` | Builds `PluginContext` per plugin (wraps all 26 `register*` methods, auto-tracks `IDisposable`) |
| `core/event-bus.ts` | `emit(event, data)`, `on(event, handler) → IDisposable`, `once()`, wildcard (`file:*`) |
| `core/disposable-store.ts` | Tracks all `IDisposable` per plugin, bulk dispose on teardown |
| `core/language-registry.ts` | Tracks registered language IDs to prevent duplicates |
| `core/types.ts` | `MonacoPlugin`, `PluginContext`, `Monaco`, `IDisposable`, shared types |
| `core/events/*.events.ts` | Typed event name enums (FileEvent, FSEvent, AuthEvent, EditorEvent, AIEvent, etc.) |
| `core/events/index.ts` | Barrel re-export of all event enums |

### Plugin Engine Lifecycle

```
registerPlugins(plugins: MonacoPlugin[])
  │
  ├─ topoSort by dependencies + priority
  │
  ├─ Phase 1: onBeforeMount(monaco) — sequential, await each
  │   (register languages, themes, monarch grammars — no editor yet)
  │
  ├─ Phase 2: create monaco.editor.create(container, config)
  │
  ├─ Phase 3: onMount(ctx) — sequential, await each
  │   (register providers, keybindings, actions, decorations)
  │
  ├─ Phase 4: runtime event routing
  │   editor.onDidChangeModelLanguage → plugin.onLanguageChange()
  │   editor.onDidChangeModelContent  → plugin.onContentChange() (debounced)
  │   config changes                  → plugin.onConfigChange()
  │
  └─ Phase 5: dispose
      onDispose() per plugin + bulk-dispose all tracked IDisposables
```

---

## Module Details — All 44

---

### M01. `core-engine`

The engine itself. Not a plugin — the bootstrap runtime.

| File | What |
|---|---|
| `core/plugin-engine.ts` | Topological sort, lifecycle, DI container |
| `core/plugin-context.ts` | Factory that builds PluginContext per plugin |
| `core/event-bus.ts` | Pub/sub with namespaces and wildcards |
| `core/disposable-store.ts` | Per-plugin IDisposable tracking |
| `core/types.ts` | All shared interfaces |
| `core/language-registry.ts` | Deduplicate language registrations |
| `core/events/*.events.ts` | Typed event name enums (FileEvent, FSEvent, AuthEvent, etc.) |
| `core/events/index.ts` | Barrel re-export of all event enums |

---

### M02. `editor-module`

Boots Monaco. Creates/destroys text models. Applies themes. Manages editor options.

| File | What |
|---|---|
| `plugins/editor-module/index.ts` | `createEditorPlugin()` |
| `plugins/editor-module/model-manager.ts` | Create/dispose models per URI |
| `plugins/editor-module/options.ts` | Default Monaco editor options, merge user overrides |
| `plugins/editor-module/types.ts` | `EditorConfig`, `ModelState` |

---

### M03. `context-module`

Registers all 26 Monaco language intelligence providers. The bridge between the symbol index and Monaco.

| File | What |
|---|---|
| `plugins/context-module/index.ts` | `createContextPlugin()` |
| `plugins/context-module/provider-registry.ts` | Tracks which providers are registered per language |
| `plugins/context-module/types.ts` | Provider registration state |

---

### M04. `ai-module`

Thin AI chat client. Only handles communication with an AI backend — no editor integration, no ghost text, no prompting logic. The user provides a `baseUrl` and picks a transport. Request/response schema is fully customizable.

| File | What |
|---|---|
| `plugins/ai-module/index.ts` | `createAIPlugin()` |
| `plugins/ai-module/client.ts` | Core AI client — sends messages, receives responses |
| `plugins/ai-module/transports/sse.ts` | Server-Sent Events transport |
| `plugins/ai-module/transports/rest.ts` | REST API transport (fetch-based) |
| `plugins/ai-module/transports/websocket.ts` | WebSocket transport |
| `plugins/ai-module/transports/socket.ts` | Raw Socket / Socket.IO transport |
| `plugins/ai-module/schema.ts` | User-defined request/response schema validation |
| `plugins/ai-module/types.ts` | `AIConfig`, `Transport`, `ChatMessage`, `AIRequestSchema`, `AIResponseSchema` |

**User API:**

```typescript
const ai = createAIPlugin({
  baseUrl: "https://api.example.com/v1",
  transport: "sse",            // "sse" | "rest" | "websocket" | "socket"
  headers: { Authorization: "Bearer ..." },

  // Custom request/response schema — map YOUR backend shape
  schema: {
    request: {
      endpoint: "/chat/completions",
      method: "POST",
      body: (messages, opts) => ({
        model: opts.model ?? "gpt-4",
        messages,
        stream: opts.stream ?? true,
      }),
    },
    response: {
      // extract the assistant message from your backend's response shape
      parse: (chunk) => chunk.choices?.[0]?.delta?.content ?? "",
      done:  (chunk) => chunk.choices?.[0]?.finish_reason === "stop",
    },
  },
});
```

**Events:**

| Event | Direction | Payload |
|---|---|---|
| `ai:chat-request` | in | `{ messages: ChatMessage[], opts? }` |
| `ai:stream` | out | `{ token: string, done: boolean }` |
| `ai:chat-response` | out | `{ content: string, metadata? }` |
| `ai:status` | out | `{ state: "idle" \| "streaming" \| "error" }` |
| `ai:error` | out | `{ message: string, code? }` |

---

### M05. `vsix-module`

Fetches VS Code VSIX extension files. Extracts package.json, themes, TextMate grammars, icon themes, snippets. Converts everything to Monaco-compatible formats.

| File | What |
|---|---|
| `plugins/vsix-module/index.ts` | `createVSIXPlugin()` — main plugin entry |
| `plugins/vsix-module/fetcher.ts` | Download VSIX from Open VSX Registry / marketplace URL |
| `plugins/vsix-module/extractor.ts` | Unzip VSIX (it's a ZIP). Parse `extension/package.json` |
| `plugins/vsix-module/manifest-parser.ts` | Parse `contributes` — themes, grammars, iconThemes, snippets, languages, commands |
| `plugins/vsix-module/loaders/theme-loader.ts` | Load `contributes.themes[]` → JSON → emit `theme:register` |
| `plugins/vsix-module/loaders/grammar-loader.ts` | Load `contributes.grammars[]` → TextMate → convert to Monarch or wire to `vscode-textmate` |
| `plugins/vsix-module/loaders/icon-loader.ts` | Load `contributes.iconThemes[]` → icon definition JSON → emit to icon-module |
| `plugins/vsix-module/loaders/snippet-loader.ts` | Load `contributes.snippets[]` → emit `snippets:register` |
| `plugins/vsix-module/loaders/language-loader.ts` | Load `contributes.languages[]` → `monaco.languages.register()` + language config |
| `plugins/vsix-module/loaders/command-loader.ts` | Load `contributes.commands[]` → register commands |
| `plugins/vsix-module/loaders/keybinding-loader.ts` | Load `contributes.keybindings[]` → emit keybinding events |
| `plugins/vsix-module/converters/textmate-to-monarch.ts` | TextMate grammar → Monarch IMonarchLanguage conversion |
| `plugins/vsix-module/converters/theme-converter.ts` | VS Code theme JSON → `IStandaloneThemeData` |
| `plugins/vsix-module/converters/icon-converter.ts` | Icon theme definition → SVG icon map |
| `plugins/vsix-module/cache.ts` | Cache extracted extension data in IndexedDB |
| `plugins/vsix-module/registry.ts` | Installed VSIX registry — tracks which extensions are active |
| `plugins/vsix-module/types.ts` | `VSIXManifest`, `VSIXContributes`, `ExtensionInfo`, `GrammarContribution` |

**VSIX Install Flow:**

```
User or plugin emits vsix:install-request { url }
  │
  ├─ fetcher.ts → download .vsix (ZIP binary)
  ├─ extractor.ts → unzip, read extension/package.json
  ├─ manifest-parser.ts → parse all contributes sections
  │
  ├─ theme-loader.ts → for each theme:
  │    read JSON → theme-converter.ts → emit theme:register
  │
  ├─ grammar-loader.ts → for each grammar:
  │    read .tmLanguage.json → textmate-to-monarch.ts → setMonarchTokensProvider
  │
  ├─ icon-loader.ts → for each icon theme:
  │    read icon definition → icon-converter.ts → emit icon:register
  │
  ├─ snippet-loader.ts → for each snippet file:
  │    read JSON → emit snippets:register
  │
  ├─ language-loader.ts → for each language:
  │    monaco.languages.register() + setLanguageConfiguration()
  │
  ├─ command-loader.ts → for each command: emit command:register
  ├─ keybinding-loader.ts → for each keybinding: emit keybinding:register
  │
  ├─ cache.ts → store extracted data in IndexedDB
  ├─ registry.ts → mark extension as installed
  └─ emit vsix:installed { extensionId, contributes }
```

**What a VSIX file contains:**

```
extension.vsix (ZIP)
├── extension/
│   ├── package.json             ← manifest with contributes
│   ├── themes/
│   │   ├── dark.json            ← VS Code color theme
│   │   └── light.json
│   ├── syntaxes/
│   │   ├── python.tmLanguage.json  ← TextMate grammar
│   │   └── go.tmLanguage.json
│   ├── icons/
│   │   ├── icon-theme.json      ← icon definitions
│   │   └── svgs/                ← SVG icon files
│   ├── snippets/
│   │   ├── typescript.json      ← snippet definitions
│   │   └── python.json
│   └── language-configuration.json
└── [Content_Types].xml
```

**package.json `contributes` sections parsed:**

| Section | Loader | Output |
|---|---|---|
| `themes` | `loaders/theme-loader.ts` | → `converters/theme-converter.ts` → `ctx.emit("theme:register")` |
| `grammars` | `loaders/grammar-loader.ts` | → `converters/textmate-to-monarch.ts` → `setMonarchTokensProvider()` |
| `iconThemes` | `loaders/icon-loader.ts` | → `converters/icon-converter.ts` → `ctx.emit("icon:register")` |
| `snippets` | `loaders/snippet-loader.ts` | → `ctx.emit("snippets:register")` |
| `languages` | `loaders/language-loader.ts` | → `monaco.languages.register()` + `setLanguageConfiguration()` |
| `commands` | `loaders/command-loader.ts` | → `ctx.emit("command:register")` |
| `keybindings` | `loaders/keybinding-loader.ts` | → `ctx.emit("keybinding:register")` |

**Events:**

| Event | Direction | Payload |
|---|---|---|
| `vsix:install-request` | in | `{ url } or { publisher, name, version? }` |
| `vsix:install-progress` | out | `{ extensionId, phase, percent }` |
| `vsix:installed` | out | `{ extensionId, contributes: string[] }` |
| `vsix:uninstall-request` | in | `{ extensionId }` |
| `vsix:uninstalled` | out | `{ extensionId }` |
| `vsix:error` | out | `{ extensionId, message }` |
| `vsix:list-request` | in | `{}` |
| `vsix:list` | out | `{ extensions: ExtensionInfo[] }` |

**User API:**

```typescript
const vsix = createVSIXPlugin({
  autoInstall: [
    "https://open-vsx.org/api/.../dracula.vsix",
    { publisher: "PKief", name: "material-icon-theme" },
    { publisher: "esbenp", name: "prettier-vscode", version: "10.4.0" },
  ],
  registryUrl: "https://open-vsx.org/api",
  cache: true,
  allowedContributes: ["themes", "grammars", "iconThemes", "snippets"],
});
```

---

### M06. `theme-module`

Loads, converts, applies themes. VS Code JSON themes directly. Dynamic switching.

| File | What |
|---|---|
| `plugins/theme-module/index.ts` | `createThemePlugin()` |
| `plugins/theme-module/converter.ts` | VS Code JSON → `IStandaloneThemeData` |
| `plugins/theme-module/registry.ts` | Theme registry — all available themes |
| `plugins/theme-module/types.ts` | `ThemeConfig`, `ThemeEntry` |
| `plugins/theme-module/builtin/one-dark.json` | One Dark Pro |
| `plugins/theme-module/builtin/dracula.json` | Dracula |
| `plugins/theme-module/builtin/github-dark.json` | GitHub Dark |
| `plugins/theme-module/builtin/github-light.json` | GitHub Light |
| `plugins/theme-module/builtin/monokai.json` | Monokai |

---

### M07. `icon-module`

| File | What |
|---|---|
| `plugins/icon-module/index.ts` | `createIconPlugin()` |
| `plugins/icon-module/icon-map.ts` | Extension/filename → icon ID map |
| `plugins/icon-module/svg-cache.ts` | Cache Storage API for SVG icons |
| `plugins/icon-module/types.ts` | `IconTheme`, `IconDefinition` |

---

### M08. `fs-module`

| File | What |
|---|---|
| `plugins/fs-module/index.ts` | `createFSPlugin()` |
| `plugins/fs-module/adapter.ts` | `FSAdapter` interface |
| `plugins/fs-module/adapters/sftp.ts` | `SFTPAdapter` |
| `plugins/fs-module/adapters/api.ts` | `APIAdapter` |
| `plugins/fs-module/adapters/local.ts` | `LocalAdapter` |
| `plugins/fs-module/watcher.ts` | File watch (poll, websocket, SSE, native) |
| `plugins/fs-module/conflict.ts` | Conflict detection |
| `plugins/fs-module/types.ts` | `FSAdapter`, `DirEntry`, `FileStat` |

---

### M09. `indexer-module`

| File | What |
|---|---|
| `plugins/indexer-module/index.ts` | `createIndexerPlugin()` |
| `plugins/indexer-module/worker.ts` | Web Worker entry |
| `plugins/indexer-module/parser.ts` | Language-aware symbol extraction |
| `plugins/indexer-module/symbol-table.ts` | In-memory Map |
| `plugins/indexer-module/persistence.ts` | IndexedDB save/restore |
| `plugins/indexer-module/types.ts` | `SymbolEntry`, `SymbolKind` |

---

### M10. `storage-module`

| File | What |
|---|---|
| `plugins/storage-module/index.ts` | `createStoragePlugin()` |
| `plugins/storage-module/idb.ts` | IndexedDB wrapper |
| `plugins/storage-module/opfs.ts` | OPFS wrapper |
| `plugins/storage-module/types.ts` | `StorageEntry`, `StorageOptions` |

---

### M11. `sidebar-module`

| File | What |
|---|---|
| `plugins/sidebar-module/index.ts` | `createSidebarPlugin()` |
| `plugins/sidebar-module/panel-registry.ts` | Registered view panels |
| `plugins/sidebar-module/types.ts` | `SidebarViewConfig` |

---

### M12. `tabs-module`

| File | What |
|---|---|
| `plugins/tabs-module/index.ts` | `createTabsPlugin()` |
| `plugins/tabs-module/tab-state.ts` | Active, dirty, order |
| `plugins/tabs-module/types.ts` | `TabEntry`, `TabGroup` |

---

### M13. `statusbar-module`

| File | What |
|---|---|
| `plugins/statusbar-module/index.ts` | `createStatusbarPlugin()` |
| `plugins/statusbar-module/slot-registry.ts` | Left/right slot registration |
| `plugins/statusbar-module/types.ts` | `StatusbarItem` |

---

### M14. `terminal-module`

| File | What |
|---|---|
| `plugins/terminal-module/index.ts` | `createTerminalPlugin()` |
| `plugins/terminal-module/pty-client.ts` | WebSocket PTY connection |
| `plugins/terminal-module/error-parser.ts` | stderr → diagnostics events |
| `plugins/terminal-module/types.ts` | `TerminalConfig`, `PTYOptions` |

---

### M15. `command-module`

| File | What |
|---|---|
| `plugins/command-module/index.ts` | `createCommandPlugin()` |
| `plugins/command-module/registry.ts` | Command ID → handler map |
| `plugins/command-module/when-clause.ts` | Context condition evaluator |
| `plugins/command-module/palette.ts` | Command palette UI logic |
| `plugins/command-module/types.ts` | `CommandEntry`, `WhenClause` |

---

### M16. `keybinding-module`

| File | What |
|---|---|
| `plugins/keybinding-module/index.ts` | `createKeybindingPlugin()` |
| `plugins/keybinding-module/resolver.ts` | Key combo → command resolution |
| `plugins/keybinding-module/conflict-detector.ts` | Conflicting bindings |
| `plugins/keybinding-module/parser.ts` | VS Code keybindings.json parser |
| `plugins/keybinding-module/types.ts` | `KeybindingEntry` |

---

### M17. `layout-module`

| File | What |
|---|---|
| `plugins/layout-module/index.ts` | `createLayoutPlugin()` |
| `plugins/layout-module/split-manager.ts` | H/V split logic |
| `plugins/layout-module/panel-manager.ts` | Panel visibility |
| `plugins/layout-module/persistence.ts` | Save/restore layout |
| `plugins/layout-module/types.ts` | `LayoutState`, `SplitDirection` |

---

### M18. `diagnostics-module`

| File | What |
|---|---|
| `plugins/diagnostics-module/index.ts` | `createDiagnosticsPlugin()` |
| `plugins/diagnostics-module/marker-store.ts` | Per-owner, per-URI markers |
| `plugins/diagnostics-module/deduplicator.ts` | Merge overlapping diagnostics |
| `plugins/diagnostics-module/types.ts` | `DiagnosticEntry` |

---

### M19. `collab-module`

| File | What |
|---|---|
| `plugins/collab-module/index.ts` | `createCollabPlugin()` |
| `plugins/collab-module/sync-engine.ts` | OT/CRDT operations |
| `plugins/collab-module/cursor-overlay.ts` | Remote cursor decorations |
| `plugins/collab-module/presence.ts` | User presence tracking |
| `plugins/collab-module/transport.ts` | WebSocket management |
| `plugins/collab-module/types.ts` | `CollabUser`, `Operation` |

---

### M20. `notification-module`

| File | What |
|---|---|
| `plugins/notification-module/index.ts` | `createNotificationPlugin()` |
| `plugins/notification-module/toast-queue.ts` | FIFO queue with auto-dismiss |
| `plugins/notification-module/types.ts` | `NotificationConfig` |

---

### M21. `extension-module`

| File | What |
|---|---|
| `plugins/extension-module/index.ts` | `createExtensionPlugin()` |
| `plugins/extension-module/manifest-validator.ts` | Validate extension package.json |
| `plugins/extension-module/sandbox.ts` | Web Worker sandbox |
| `plugins/extension-module/lifecycle.ts` | Enable/disable/hot-reload |
| `plugins/extension-module/types.ts` | `ExtensionManifest`, `ExtensionState` |

---

### M22. `title-module`

Title bar — displays the active file/workspace name, breadcrumb path, dirty indicator.

| File | What |
|---|---|
| `plugins/title-module/index.ts` | `createTitlePlugin()` |
| `plugins/title-module/title-state.ts` | Active file/workspace name, dirty indicator |
| `plugins/title-module/breadcrumb.ts` | Breadcrumb path builder |
| `plugins/title-module/types.ts` | `TitleConfig`, `TitleState` |

---

### M23. `header-module`

Custom header bar (anti-gravity / Electron-style). Contains menu bar, layout controls, auth & profile dropdown.

| File | What |
|---|---|
| `plugins/header-module/index.ts` | `createHeaderPlugin()` |
| `plugins/header-module/menu-bar.ts` | File/Edit/View/... menus |
| `plugins/header-module/profile.ts` | Auth profile dropdown |
| `plugins/header-module/window-controls.ts` | Min/max/close (Electron) |
| `plugins/header-module/types.ts` | `HeaderConfig`, `MenuEntry` |

---

### M24. `agent-module`

| File | What |
|---|---|
| `plugins/agent-module/index.ts` | `createAgentPlugin()` |
| `plugins/agent-module/task-runner.ts` | Multi-step execution loop |
| `plugins/agent-module/planner.ts` | Task decomposition |
| `plugins/agent-module/types.ts` | `AgentTask`, `AgentStep` |

---

### M25. `memory-module`

| File | What |
|---|---|
| `plugins/memory-module/index.ts` | `createMemoryPlugin()` |
| `plugins/memory-module/context-store.ts` | Read/write memory entries |
| `plugins/memory-module/injector.ts` | Injects memory into AI prompts |
| `plugins/memory-module/types.ts` | `MemoryEntry` |

---

### M26. `rag-module`

| File | What |
|---|---|
| `plugins/rag-module/index.ts` | `createRAGPlugin()` |
| `plugins/rag-module/embedder.ts` | Embedding model client |
| `plugins/rag-module/vector-store.ts` | Vector index + IndexedDB |
| `plugins/rag-module/retriever.ts` | Top-K retrieval |
| `plugins/rag-module/chunker.ts` | Code-aware chunking |
| `plugins/rag-module/types.ts` | `Chunk`, `RetrievalResult` |

---

### M27. `eval-module`

| File | What |
|---|---|
| `plugins/eval-module/index.ts` | `createEvalPlugin()` |
| `plugins/eval-module/scorer.ts` | Quality scoring |
| `plugins/eval-module/tracker.ts` | Accept/reject tracking |
| `plugins/eval-module/types.ts` | `EvalScore` |

---

### M28. `lsp-bridge-module`

Dual-mode LSP client. V1 (Custom): direct WebSocket + manual JSON-RPC 2.0. V2 (Built-in): full LSP lifecycle with initialize handshake, 24 typed Monaco providers, document sync, diagnostics bridge. User chooses via `lsp.mode` setting.

→ Full spec in `context/lsp-bridge-module.txt` (1297 lines, 15 sections)

| File | What |
|---|---|
| `plugins/lsp-bridge-module/index.ts` | `LspBridgePlugin` — plugin init, mode switching, auto-connect |
| `plugins/lsp-bridge-module/types.ts` | `LspConnectionConfig`, `LspMode`, `JsonRpcRequest/Response/Notification`, `LspConnectionOptions` |
| `plugins/lsp-bridge-module/languages.ts` | `LSP_LANGUAGES` map (70+ langs), `hasLSPSupport()`, `buildLSPWebSocketUrl()` |
| `plugins/lsp-bridge-module/connection.ts` | `LspConnectionManager` — shared retry/state machine for V1 & V2 |
| `plugins/lsp-bridge-module/v1-custom-client.ts` | `CustomLspClient` — direct WebSocket, manual JSON-RPC, ProviderFactory bridge |
| `plugins/lsp-bridge-module/provider-bridge.ts` | `LspProviderBridge` — V1 generic provider registration |
| `plugins/lsp-bridge-module/protocol.ts` | V1 JSON-RPC 2.0 method map (29+ LSP methods) |
| `plugins/lsp-bridge-module/v2-builtin-client.ts` | `BuiltinLspClient` — full LSP lifecycle, initialize handshake, didOpen/didChange |
| `plugins/lsp-bridge-module/v2-providers.ts` | 24 typed Monaco provider registrations for V2 |
| `plugins/lsp-bridge-module/converters.ts` | LSP ↔ Monaco type converters (position, range, completion, hover, diagnostics, etc.) |

---

### M29. `debugger-module`

| File | What |
|---|---|
| `plugins/debugger-module/index.ts` | `createDebuggerPlugin()` |
| `plugins/debugger-module/dap-client.ts` | DAP WebSocket client |
| `plugins/debugger-module/breakpoint-manager.ts` | Breakpoint state + gutter decorations |
| `plugins/debugger-module/call-stack.ts` | Call stack view |
| `plugins/debugger-module/variables.ts` | Variable watch + inspection |
| `plugins/debugger-module/types.ts` | `DebugConfig`, `Breakpoint`, `StackFrame` |

---

### M30. `git-module`

| File | What |
|---|---|
| `plugins/git-module/index.ts` | `createGitPlugin()` |
| `plugins/git-module/client.ts` | Git operations (isomorphic-git or API) |
| `plugins/git-module/diff.ts` | Monaco diff editor |
| `plugins/git-module/staging.ts` | Stage/unstage hunks |
| `plugins/git-module/branch.ts` | Branch create/switch/merge |
| `plugins/git-module/conflict.ts` | Inline conflict resolution |
| `plugins/git-module/decorations.ts` | File status decorations (M/A/D/R) |
| `plugins/git-module/types.ts` | `GitStatus`, `DiffHunk`, `BranchInfo` |

---

### M31. `test-module`

| File | What |
|---|---|
| `plugins/test-module/index.ts` | `createTestPlugin()` |
| `plugins/test-module/discovery.ts` | Find test files/functions |
| `plugins/test-module/runner.ts` | Execute via terminal |
| `plugins/test-module/coverage.ts` | Coverage overlay |
| `plugins/test-module/types.ts` | `TestResult`, `CoverageData` |

---

### M32. `auth-module`

| File | What |
|---|---|
| `plugins/auth-module/index.ts` | `createAuthPlugin()` |
| `plugins/auth-module/providers/github.ts` | GitHub OAuth PKCE |
| `plugins/auth-module/providers/google.ts` | Google OAuth PKCE |
| `plugins/auth-module/providers/custom.ts` | User-defined OAuth |
| `plugins/auth-module/token-store.ts` | Encrypted token storage |
| `plugins/auth-module/session.ts` | Session restore |
| `plugins/auth-module/types.ts` | `User`, `AuthProvider` |

---

### M33. `audit-module`

| File | What |
|---|---|
| `plugins/audit-module/index.ts` | `createAuditPlugin()` |
| `plugins/audit-module/collector.ts` | Listens to all events |
| `plugins/audit-module/redactor.ts` | Configurable redaction |
| `plugins/audit-module/exporters/console.ts` | Console exporter |
| `plugins/audit-module/exporters/http.ts` | HTTP exporter |
| `plugins/audit-module/exporters/s3.ts` | S3 exporter |
| `plugins/audit-module/exporters/kafka.ts` | Kafka exporter |
| `plugins/audit-module/types.ts` | `AuditEntry`, `RedactionRule` |

---

### M34. `secrets-module`

| File | What |
|---|---|
| `plugins/secrets-module/index.ts` | `createSecretsPlugin()` |
| `plugins/secrets-module/providers/vault.ts` | HashiCorp Vault |
| `plugins/secrets-module/providers/aws.ts` | AWS Secrets Manager |
| `plugins/secrets-module/providers/doppler.ts` | Doppler |
| `plugins/secrets-module/injector.ts` | Terminal env injection |
| `plugins/secrets-module/types.ts` | `SecretEntry` |

---

### M35. `telemetry-module`

| File | What |
|---|---|
| `plugins/telemetry-module/index.ts` | `createTelemetryPlugin()` |
| `plugins/telemetry-module/span-manager.ts` | Create/end spans |
| `plugins/telemetry-module/exporters/jaeger.ts` | Jaeger |
| `plugins/telemetry-module/exporters/datadog.ts` | Datadog |
| `plugins/telemetry-module/exporters/console.ts` | Console |
| `plugins/telemetry-module/types.ts` | `TelemetrySpan` |

---

### M36. `marketplace-module`

| File | What |
|---|---|
| `plugins/marketplace-module/index.ts` | `createMarketplacePlugin()` |
| `plugins/marketplace-module/api-client.ts` | Registry API client |
| `plugins/marketplace-module/search.ts` | Search + filter |
| `plugins/marketplace-module/installer.ts` | Delegates to vsix-module |
| `plugins/marketplace-module/types.ts` | `MarketplaceEntry`, `SearchQuery` |

---

### M37. `embed-module`

| File | What |
|---|---|
| `plugins/embed-module/index.ts` | `createEmbedPlugin()` |
| `plugins/embed-module/message-handler.ts` | postMessage protocol |
| `plugins/embed-module/api.ts` | External API surface |
| `plugins/embed-module/types.ts` | `EmbedMessage` |

---

### M38. `notebook-module`

| File | What |
|---|---|
| `plugins/notebook-module/index.ts` | `createNotebookPlugin()` |
| `plugins/notebook-module/cell-manager.ts` | Code/markdown cell state |
| `plugins/notebook-module/kernel.ts` | Jupyter kernel WebSocket |
| `plugins/notebook-module/output-renderer.ts` | Text/images/charts |
| `plugins/notebook-module/ipynb.ts` | Import/export .ipynb |
| `plugins/notebook-module/types.ts` | `Cell`, `KernelConfig` |

---

### M39. `profiler-module`

| File | What |
|---|---|
| `plugins/profiler-module/index.ts` | `createProfilerPlugin()` |
| `plugins/profiler-module/flame-graph.ts` | Flame graph data + render |
| `plugins/profiler-module/memory-tracker.ts` | Memory over time |
| `plugins/profiler-module/types.ts` | `ProfileData` |

---

### M40. `review-module`

| File | What |
|---|---|
| `plugins/review-module/index.ts` | `createReviewPlugin()` |
| `plugins/review-module/github-client.ts` | GitHub PR comments |
| `plugins/review-module/gitlab-client.ts` | GitLab MR comments |
| `plugins/review-module/decorations.ts` | Inline comment decorations |
| `plugins/review-module/types.ts` | `ReviewComment`, `ReviewThread` |

---

### M41. `snapshot-module`

| File | What |
|---|---|
| `plugins/snapshot-module/index.ts` | `createSnapshotPlugin()` |
| `plugins/snapshot-module/capturer.ts` | Snapshot capture |
| `plugins/snapshot-module/store.ts` | IndexedDB storage |
| `plugins/snapshot-module/restorer.ts` | Full state restore |
| `plugins/snapshot-module/types.ts` | `Snapshot` |

---

### M42. `search-module`

| File | What |
|---|---|
| `plugins/search-module/index.ts` | `createSearchPlugin()` |
| `plugins/search-module/text-search.ts` | Regex/literal in Worker |
| `plugins/search-module/semantic-search.ts` | Vector search via rag-module |
| `plugins/search-module/replace.ts` | Find-and-replace across files |
| `plugins/search-module/types.ts` | `SearchQuery`, `SearchMatch` |

---

### M43. `eslint-module`

| File | What |
|---|---|
| `plugins/eslint-module/index.ts` | `createESLintPlugin()` |
| `plugins/eslint-module/runner.ts` | ESLint execution (Worker or API) |
| `plugins/eslint-module/config-loader.ts` | Find/load .eslintrc |
| `plugins/eslint-module/auto-fix.ts` | Apply fixes on save |
| `plugins/eslint-module/types.ts` | `ESLintConfig`, `LintResult` |

---

### M44. `prettier-module`

| File | What |
|---|---|
| `plugins/prettier-module/index.ts` | `createPrettierPlugin()` |
| `plugins/prettier-module/formatter.ts` | Prettier execution |
| `plugins/prettier-module/config-loader.ts` | Find/load .prettierrc |
| `plugins/prettier-module/types.ts` | `PrettierConfig` |

---

### M45. `settings-module`

| File | What |
|---|---|
| `plugins/settings-module/index.ts` | `createSettingsPlugin()` |
| `plugins/settings-module/store.ts` | Three-layer merge engine |
| `plugins/settings-module/schema-registry.ts` | Module schema registration |
| `plugins/settings-module/watcher.ts` | Watch changes → emit events |
| `plugins/settings-module/json-editor.ts` | settings.json IntelliSense |
| `plugins/settings-module/types.ts` | `SettingLayer`, `SettingSchema` |

---

### M46. `symbol-index-module`

| File | What |
|---|---|
| `plugins/symbol-index-module/index.ts` | `createSymbolIndexPlugin()` |
| `plugins/symbol-index-module/index-store.ts` | In-memory Map + IndexedDB |
| `plugins/symbol-index-module/worker.ts` | Web Worker for parsing |
| `plugins/symbol-index-module/provider-factory.ts` | `SymbolProviderFactory` — registers all 6 providers |
| `plugins/symbol-index-module/providers/definition.ts` | DefinitionProvider |
| `plugins/symbol-index-module/providers/reference.ts` | ReferenceProvider |
| `plugins/symbol-index-module/providers/document-symbol.ts` | DocumentSymbolProvider |
| `plugins/symbol-index-module/providers/workspace-symbol.ts` | WorkspaceSymbolProvider |
| `plugins/symbol-index-module/providers/hover.ts` | HoverProvider |
| `plugins/symbol-index-module/providers/rename.ts` | RenameProvider |
| `plugins/symbol-index-module/types.ts` | `SymbolEntry`, `SymbolKind` |

---

## Standalone Plugins (7 additional, same MonacoPlugin interface)

### `language-detection`

| File | What |
|---|---|
| `plugins/language-detection/index.ts` | `createLanguageDetectionPlugin()` |
| `plugins/language-detection/rules.ts` | Filename, extension, shebang, content heuristic rules |
| `plugins/language-detection/types.ts` | `DetectionRule`, `DetectionConfig` |

**Detects:** `shellscript` (.sh/.bash/.zsh/.fish), `dockerfile`, `dotenv`, `makefile`, `toml`, `ini`, `ignore`, `ssh-config`, `nginx`, `prisma`, `graphql`, `proto`

---

### `monarch-grammars`

| File | What |
|---|---|
| `plugins/monarch-grammars/index.ts` | `createMonarchGrammarPlugin()` |
| `plugins/monarch-grammars/grammars/dockerfile.ts` | Dockerfile tokenizer |
| `plugins/monarch-grammars/grammars/dotenv.ts` | .env tokenizer |
| `plugins/monarch-grammars/grammars/ini.ts` | INI tokenizer |
| `plugins/monarch-grammars/grammars/ignore.ts` | .gitignore tokenizer |
| `plugins/monarch-grammars/grammars/toml.ts` | TOML tokenizer |
| `plugins/monarch-grammars/grammars/nginx.ts` | nginx.conf tokenizer |
| `plugins/monarch-grammars/grammars/ssh-config.ts` | SSH config tokenizer |
| `plugins/monarch-grammars/grammars/makefile.ts` | Makefile tokenizer |
| `plugins/monarch-grammars/grammars/prisma.ts` | Prisma tokenizer |
| `plugins/monarch-grammars/grammars/graphql.ts` | GraphQL tokenizer |
| `plugins/monarch-grammars/grammars/proto.ts` | Protobuf tokenizer |

---

### `language-config`

| File | What |
|---|---|
| `plugins/language-config/index.ts` | `createLanguageConfigPlugin()` |
| `plugins/language-config/configs/shellscript.ts` | Shell brackets, comments, indent |
| `plugins/language-config/configs/dockerfile.ts` | Dockerfile config |
| `plugins/language-config/configs/dotenv.ts` | .env config |
| `plugins/language-config/configs/toml.ts` | TOML config |
| `plugins/language-config/configs/ini.ts` | INI config |
| `plugins/language-config/configs/ignore.ts` | Ignore file config |
| `plugins/language-config/configs/nginx.ts` | nginx config |
| `plugins/language-config/configs/prisma.ts` | Prisma config |
| `plugins/language-config/configs/graphql.ts` | GraphQL config |
| `plugins/language-config/configs/proto.ts` | Protobuf config |

---

### `context-engine`

→ Full spec in `context/custom-context-enginge.txt` (365 lines)

| File | What |
|---|---|
| `plugins/context-engine/index.ts` | `createContextEnginePlugin()` |
| `plugins/context-engine/api.ts` | CDN fetch (manifest, language data, commands) |
| `plugins/context-engine/storage.ts` | IndexedDB (two Dexie databases) |
| `plugins/context-engine/converters.ts` | 25 `to*Provider()` functions |
| `plugins/context-engine/providers.ts` | Registration orchestrator |
| `plugins/context-engine/interfaces/` | **32 files** — 29 provider interfaces + manifest.ts + lsp.ts + index.ts barrel |

---

### `snippets-module`

| File | What |
|---|---|
| `plugins/snippets-module/index.ts` | `createSnippetsPlugin()` |
| `plugins/snippets-module/parser.ts` | VS Code snippet JSON → Monaco CompletionItem |
| `plugins/snippets-module/types.ts` | `SnippetDefinition`, `SnippetConfig` |

---

### `context-menu-module`

| File | What |
|---|---|
| `plugins/context-menu-module/index.ts` | `createContextMenuPlugin()` |
| `plugins/context-menu-module/types.ts` | `MenuGroup`, `MenuItem`, `ContextCondition` |

---

### `decorations-module`

| File | What |
|---|---|
| `plugins/decorations-module/index.ts` | `createDecorationsPlugin()` |
| `plugins/decorations-module/types.ts` | `DecorationType`, `DecorationConfig` |

---

## Dependency Graph (all 79)

```
TIER 0 — No dependencies:
  storage-module, notification-module, language-detection, theme-module,
  icon-module, keybinding-module, decorations-module, snippets-module,
  context-menu-module, embed-module, telemetry-module, audit-module,
  fallback-module, api-stability-module, accessibility-module, i18n-module

TIER 1 — Depends on tier 0:
  settings-module ................ storage, fs, command
  editor-module .................. theme
  fs-module ...................... storage
  layout-module .................. storage
  sidebar-module ................. layout
  command-module ................. keybinding
  monarch-grammars ............... language-detection
  language-config ................ language-detection
  context-engine ................. language-detection
  auth-module .................... storage
  performance-module ............. telemetry
  offline-module ................. storage
  migration-module ............... storage
  security-module ................ storage
  crash-recovery-module .......... storage, notification

TIER 2 — Depends on tier 0+1:
  indexer-module ................. fs, storage
  tabs-module .................... editor, fs
  terminal-module ................ diagnostics, ai
  diagnostics-module ............. editor, terminal
  statusbar-module ............... editor, diagnostics, ai
  context-module ................. editor, indexer
  vsix-module .................... theme, icon, storage
  secrets-module ................. storage
  title-module ................... editor
  sync-module .................... storage, auth
  resource-module ................ telemetry, performance
  concurrency-module ............. storage
  workspace-module ............... fs, settings
  virtualization-module .......... layout
  policy-module .................. settings, auth
  testing-harness-module ......... fs, ai (mocks)
  streaming-module ............... auth
  deep-link-module ............... editor, fs

TIER 3 — Depends on tier 0+1+2:
  ai-module ...................... editor, context
  lsp-bridge-module .............. editor
  debugger-module ................ editor, fs
  git-module ..................... fs, auth
  collab-module .................. editor, terminal
  extension-module ............... vsix, storage
  symbol-index-module ............ fs, editor, storage
  marketplace-module ............. vsix, auth
  header-module .................. layout, auth, title-module
  intent-module .................. editor, command
  knowledge-graph-module ......... symbol-index, indexer
  billing-module ................. saas-tenant, telemetry
  realtime-module ................ auth, sync
  saas-tenant-module ............. storage, auth, security

TIER 4 — Depends on many modules:
  rag-module ..................... indexer, storage, ai
  memory-module .................. storage, indexer
  agent-module ................... ai, fs, terminal, diagnostics
  test-module .................... terminal, diagnostics
  eval-module .................... ai
  notebook-module ................ editor, terminal
  search-module .................. fs, indexer, rag
  review-module .................. auth, git
  snapshot-module ................ editor, storage
  profiler-module ................ editor
  eslint-module .................. diagnostics, fs
  prettier-module ................ editor, fs
  ai-memory-module ............... storage, rag, ai
  context-fusion-module .......... ai, editor, knowledge-graph, rag, terminal,
                                   git, symbol-index, intent
  predictive-module .............. knowledge-graph, intent, command, editor
```

---

## Custom Plugin Interface

Every module uses the same `MonacoPlugin` interface. Users write plugins identically:

```typescript
import type { MonacoPlugin, PluginContext } from "monaco-vanced";

const myPlugin: MonacoPlugin = {
  id: "my-custom-plugin",
  name: "My Custom Plugin",
  version: "1.0.0",
  description: "Does custom things",
  dependencies: ["diagnostics-module"],
  priority: 5,

  onBeforeMount(monaco) {
    monaco.languages.register({ id: "my-lang", extensions: [".mylang"] });
  },

  onMount(ctx) {
    // All 26 register* methods available:
    ctx.registerCompletionProvider("my-lang", { ... });
    ctx.registerHoverProvider("my-lang", { ... });
    ctx.registerDefinitionProvider("my-lang", { ... });
    ctx.registerCodeActionProvider("my-lang", { ... });
    ctx.registerInlineCompletionsProvider("my-lang", { ... });

    // Keybinding + command palette
    ctx.addKeybinding(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL, () => { ... });
    ctx.addAction({ id: "my-action", label: "My Action", run: () => { ... } });

    // Diagnostics, decorations
    ctx.setModelMarkers("my-linter", [{ ... }]);
    ctx.applyDecorations([{ range: ..., options: { ... } }]);

    // Event communication
    ctx.emit("my-plugin:ready", { version: "1.0.0" });
    ctx.on("file:saved", ({ path }) => { ... });
  },

  onLanguageChange(language, ctx) { },
  onContentChange(content, ctx) { },
  onConfigChange(config, ctx) { },
  onDispose() { },
};
```

---

## Module Count Verification

| Category | Count | Verified |
|---|---|---|
| Core modules | 23 | core-engine, editor, context, ai, vsix, theme, icon, fs, indexer, storage, sidebar, tabs, statusbar, terminal, command, keybinding, layout, diagnostics, collab, notification, extension, title, header |
| Advanced modules | 19 | agent, memory, rag, eval, lsp-bridge, debugger, git, test, auth, audit, secrets, telemetry, marketplace, embed, notebook, profiler, review, snapshot, search |
| v2.1 modules | 2 | eslint, prettier |
| v2.2 modules | 2 | settings, symbol-index |
| Phase 1 modules | 7 | performance, accessibility, i18n, security, offline, migration, testing-harness |
| Phase 2 modules | 11 | crash-recovery, sync, resource, concurrency, intent, workspace, deep-link, knowledge-graph, streaming, virtualization, policy |
| Phase 3 modules | 8 | context-fusion, predictive, ai-memory, fallback, api-stability, saas-tenant, billing, realtime |
| **Total modules** | **72** | **All accounted for** |
| Standalone plugins | 7 | language-detection, monarch-grammars, language-config, context-engine, snippets, context-menu, decorations |
| **Grand total** | **79** | 72 modules + 7 standalone plugins |

---

## Plugin Directory Structure (12 Categories)

All 80 plugin directories are organized into 12 categories under `plugins/`.
This matches the ACTUAL on-disk layout (verified against scaffolded directories).

```
plugins/
├── editor/          — editor-module, tabs-module, decorations-module, snippets-module,
│                      preview-module, virtualization-module
├── language/        — context-module, monarch-grammars, language-detection, language-config,
│                      symbol-index-module, diagnostics-module, lsp-bridge-module,
│                      eslint-module, prettier-module
├── filesystem/      — fs-module, indexer-module, search-module, workspace-module
├── layout/          — layout-module, sidebar-module, statusbar-module, title-module,
│                      header-module, context-menu-module, navigation-module, ui-module
├── ai/              — ai-module, agent-module, memory-module, rag-module, eval-module,
│                      ai-memory-module, context-fusion-module, predictive-module,
│                      intent-module, knowledge-graph-module
├── scm/             — git-module, review-module, collab-module, snapshot-module, sync-module
├── devtools/        — terminal-module, debugger-module, test-module, profiler-module,
│                      notebook-module, task-module
├── extensions/      — extension-module, vsix-module, marketplace-module, embed-module
├── theming/         — theme-module, icon-module
├── infrastructure/  — storage-module, command-module, keybinding-module, notification-module,
│                      settings-module, auth-module, deep-link-module, dialog-module
├── platform/        — security-module, concurrency-module, crash-recovery-module, fallback-module,
│                      performance-module, resource-module, streaming-module,
│                      feature-flags-module, worker-module
├── enterprise/      — context-engine, api-stability-module, audit-module, billing-module,
│                      policy-module, realtime-module, saas-tenant-module, secrets-module,
│                      telemetry-module
```

Total: 12 categories, 80 module directories, ~570 scaffold files.

**Modules not yet scaffolded** (in PLAN but no directory on disk):
- `accessibility-module`, `i18n-module`, `migration-module`, `offline-module`, `testing-harness-module`

**Extra modules on disk** (scaffolded but not in original 79-module PLAN):
- `navigation-module` (layout/) — breadcrumb navigation, file path bar
- `ui-module` (layout/) — shared UI components
- `task-module` (devtools/) — build/run task runner
- `dialog-module` (infrastructure/) — separated from notification-module per custom-dialog.txt
- `preview-module` (editor/) — file preview system per custom-dialog.txt
- `feature-flags-module` (platform/) — feature flag management
- `worker-module` (platform/) — web worker pool management

---

## FS System — 5 Adapters

| Adapter | Backend | Use Case |
|---|---|---|
| `SFTPAdapter` | SSH/SFTP server | Remote server files |
| `APIAdapter` | HTTP REST endpoints | Cloud storage / custom backends |
| `LocalFSAdapter` | File System Access API | Browser local files |
| `OPFSAdapter` | Origin Private File System | Browser-sandboxed fast storage |
| `IndexedDBAdapter` | IndexedDB (Dexie) | Virtual FS with ACID transactions |

All adapters implement the same `FSAdapter` interface with unified `{ path, data }` payloads.

**Extended features** (→ `context/filesystem-advanced.txt`):
- Per-operation custom handlers (Strategy Pattern) — mix transports per op
- FS lifecycle hooks (onSuccess/onError per operation, Observer Pattern)
- Plugin-extensible context menu for file explorer (6 zones, when-clauses)

---

## Plugin Lifecycle — onReady / onFailed

→ Full spec in `context/plugin-lifecycle.txt`

Every module gains `onReady()` and `onFailed(error)` callbacks in the `MonacoPlugin` interface. CoreEngine calls these after `init()` completes or throws. Global hooks: `onAllReady()`, `onAnyFailed()`. Boot config supports `skip`, `abort`, `retry` per-module error strategies.

Universal operation callbacks (`on: { onSuccess, onError }`) are standardized across ALL modules — not just FS.

---

## Webview Triggering — 8 Mechanisms

→ Full spec in `context/webview-triggers.txt`

`ctx.editor.createWebview()` returns a `WebviewPanel` with `show()`, `hide()`, `toggle()`, `dispose()`, `postMessage()`. `ctx.editor.registerWebview()` provides lazy/on-demand creation with auto-command and auto-keybinding registration.

**All 8 trigger patterns** (all route through commands):

| # | Trigger | API |
|---|---|---|
| 1 | Command palette | `ctx.commands.register(id, handler)` |
| 2 | Keybinding | `ctx.keybindings.register({ key, command })` |
| 3 | File explorer right-click | `ctx.contextMenu.register("explorer", { command })` |
| 4 | Editor right-click | `ctx.contextMenu.register("editor", { command })` |
| 5 | Sidebar icon | `ctx.layout.registerSidebarView({ onActivate })` |
| 6 | Status bar click | `ctx.layout.registerStatusbarItem({ command })` |
| 7 | Header bar button | `HeaderBar({ right: [{ onClick }] })` |
| 8 | Event-driven | `ctx.eventBus.on("event", () => panel.show())` |

---

## Extended Specification Files (22 spec + 2 meta = 24 total)

All spec files are in `context/`. See `context/index.txt` for the canonical read order.

### Core Architecture (11 files — extracted from original context.txt)

| # | File | Lines | Contents |
|---|---|---|---|
| 1 | `tech-stack.txt` | 90 | Bun, Vite, Rolldown, ESM+CJS, package exports, directory layout |
| 2 | `plugin-contract.txt` | 68 | Core philosophy, Plugin interface, ModuleContext, EventBus contract |
| 3 | `layout-shell.txt` | 1000 | Visual frame: header, title, sidebar, editor, panels, status bar, webviews |
| 4 | `auth-module.txt` | 97 | GitHub & Gmail OAuth, PKCE, token storage, route protection |
| 5 | `fs-connections.txt` | 678 | FSAdapter interface, 5 adapters (SFTP/API/Local/OPFS/IndexedDB), AI gating |
| 6 | `modules-core.txt` | 254 | 23 core modules + 19 advanced modules (42 module summaries) |
| 7 | `event-bus.txt` | 178 | Full event catalogue (~140 events across 18 domains) |
| 8 | `wiring-patterns.txt` | 208 | User-side handler patterns, registration order, data flow walkthroughs |
| 9 | `settings-module.txt` | 292 | VSCode-style configuration: layers, API, UI, snippets, JSON, events |
| 10 | `symbol-providers.txt` | 500 | Symbol index + 6 Monaco providers (definition, reference, hover, rename) |
| 11 | `registry-enums.txt` | 340 | Full module registry (78 modules, 12 categories) + event name enums |

### Extended Specifications (6 files)

| # | File | Lines | Contents |
|---|---|---|---|
| 12 | `advanced-modules.txt` | 1999 | Phase 1/2/3 — 26 new modules (#47-#72), 16 expansions |
| 13 | `filesystem-advanced.txt` | 666 | Strategy Pattern handlers, lifecycle hooks, FS context menu system |
| 14 | `plugin-lifecycle.txt` | 323 | Mount lifecycle (onReady/onFailed), universal operation callbacks |
| 15 | `webview-triggers.txt` | 706 | WebviewPanel API, lazy registration, 8 trigger mechanisms |
| 16 | `custom-context-enginge.txt` | 365 | Context Engine — CDN language packs, 25 providers, Dexie storage |
| 17 | `custom-plugins.txt` | 246 | Plugin system TypeScript interfaces — PluginContext, MonacoPlugin |

### Command & Extension System (2 files)

| # | File | Lines | Contents |
|---|---|---|---|
| 18 | `monaco-command-system.txt` | 678 | Command palette + editor context menu, preconditions, when-clauses |
| 19 | `custom-extension-host.txt` | 1022 | Extension host: OPFS VFS, Dexie.js index, contribution parser, webview panels |

### Interaction & Preview System (1 file)

| # | File | Lines | Contents |
|---|---|---|---|
| 20 | `custom-dialog.txt` | 1516 | Notification system (toasts) + Dialog system (modals) + File preview system |

### Language Server (1 file)

| # | File | Lines | Contents |
|---|---|---|---|
| 21 | `lsp-bridge-module.txt` | 1297 | Dual-mode LSP client (V1 custom JSON-RPC + V2 built-in Monaco LSP), 24 providers, converters |

### Build & Instructions (2 meta files)

| # | File | Lines | Contents |
|---|---|---|---|
| 22 | `instructions.md` | 2508 | Project instructions and conventions (Monaco `languages.*` API reference) |
| 23 | `PLAN.md` | — | **THIS FILE** — master build plan, module list, dependency graph |

---

## Key Principles

1. **Zero coupling** — Plugins never `import` each other. All communication is `ctx.emit()` / `ctx.on()`.
2. **Every module has its own folder** — `plugins/{category}/{module-name}/index.ts` + supporting files.
3. **Every `register*` returns `IDisposable`** — Tracked automatically via `ctx.addDisposable()`.
4. **Context Engine is default, not mandatory** — Skip CDN packs, wire your own providers.
5. **VSIX bridges VS Code extensions** — Themes, grammars, icons, snippets fetched, extracted, converted.
6. **User plugins are first-class** — Same `MonacoPlugin` interface, same lifecycle, same `PluginContext`.
7. **Every module is a factory function** — `create*Plugin(options?)` — options always optional.
8. **Hot-reload** — `ide.addPlugin()` / `ide.removePlugin()` at runtime.
9. **IRange is 1-based** — Monaco ranges start from 1. LSP is 0-based — converters handle this.
10. **Tree-shakeable** — Import only what you use.
11. **Plugin lifecycle hooks** — `onReady()` / `onFailed()` for boot success/error handling. Universal `on: { onSuccess, onError }` for all operations.
12. **5 FS adapters** — SFTP, API, Local, OPFS, IndexedDB. Strategy Pattern for per-op handler overrides.
13. **Commands are the universal trigger** — Every UI action (menu, keybinding, button, sidebar) routes through a registered command.
14. **12-category directory structure** — Plugins organized by domain: editor, language, filesystem, layout, ai, scm, devtools, extensions, theming, infrastructure, platform, enterprise.
