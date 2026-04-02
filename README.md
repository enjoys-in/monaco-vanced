# Monaco Vanced

A plugin-based, event-driven IDE built on [Monaco Editor](https://microsoft.github.io/monaco-editor/). Ship a full VS Code-like experience in the browser with 85+ composable modules.

## Features

- **Plugin Architecture** — 85+ modules across 12 categories, each with typed APIs and lifecycle hooks
- **Event Bus** — Strongly-typed event system for decoupled communication between plugins
- **Theming** — 50+ color themes with CDN fetching, CSS custom properties, and runtime switching
- **Settings** — 3-layer settings (defaults → user → workspace) with Dexie persistence and schema validation
- **AI** — Chat, inline completions, RAG, knowledge graph, intent recognition, and agent workflows
- **Language** — LSP bridge, diagnostics, Prettier/ESLint integration, Monarch grammars, symbol index
- **Filesystem** — Virtual FS with Dexie storage, indexer, workspace search, multi-root workspaces
- **SCM** — Git operations, real-time collaboration, code review, snapshots, settings sync
- **Layout** — Activity bar, sidebar, status bar, tabs, breadcrumbs, context menus, split panes
- **Extensions** — Extension host, marketplace, VSIX loader, embeddable widget
- **Devtools** — Terminal, debugger, profiler, notebook, task runner, test runner
- **Enterprise** — Audit logging, billing, policy, secrets, telemetry, multi-tenant, realtime channels

## Quick Start

```bash
npm install @enjoys/monaco-vanced monaco-editor
```

```ts
import { createMonacoIDE } from "@enjoys/monaco-vanced/core/facade";
import { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { createEditorPlugin } from "@enjoys/monaco-vanced/editor/editor-module";
import { createThemePlugin } from "@enjoys/monaco-vanced/theming/theme-module";
import { createCommandPlugin } from "@enjoys/monaco-vanced/infrastructure/command-module";
import * as monaco from "monaco-editor";

const eventBus = new EventBus();

const { plugin: editorPlugin } = createEditorPlugin();
const { plugin: themePlugin, api: themeApi } = createThemePlugin({ persistKey: "my-theme" });
const { plugin: commandPlugin, api: commandApi } = createCommandPlugin();

const ide = await createMonacoIDE({
  container: document.getElementById("editor")!,
  monaco,
  plugins: [editorPlugin, themePlugin, commandPlugin],
  language: "typescript",
  eventBus,
});
```

## Plugin Categories

| Category | Modules | Examples |
|---|---|---|
| Infrastructure | 9 | Command palette, settings, keybindings, auth, notifications, dialog |
| Theming | 2 | Color themes, file icons |
| Layout | 8 | Sidebar, status bar, header, context menus, navigation |
| Editor | 7 | Tabs, decorations, preview, snippets, webview |
| Extensions | 4 | Extension host, marketplace, VSIX, embed |
| Filesystem | 4 | Virtual FS, indexer, search, workspace manager |
| Language | 10 | LSP bridge, diagnostics, ESLint, Prettier, symbol index |
| Platform | 12 | Security, workers, concurrency, crash recovery, i18n, offline |
| AI | 10 | Chat, agents, RAG, memory, knowledge graph, predictions |
| SCM | 5 | Git, collaboration, review, snapshots, sync |
| Devtools | 7 | Terminal, debugger, profiler, notebook, task runner |
| Enterprise | 9 | Audit, billing, policy, secrets, telemetry, multi-tenant |

## Development

```bash
# Run the demo
npm run dev

# Type-check
npm run typecheck

# Lint
npm run lint

# Test
npm test
```

The demo runs at `http://localhost:5173` with all 85+ plugins wired up, a virtual filesystem, and a full VS Code-style UI.

## Tech Stack

- **Monaco Editor** — Core editor engine
- **TypeScript** — Strict mode, 0 errors
- **React** — Settings panel, tabs, shell components
- **Zustand** — Reactive state management
- **Dexie** — IndexedDB persistence
- **Vite** — Build & dev server
- **Tailwind CSS** — Utility styles

## License

MIT
