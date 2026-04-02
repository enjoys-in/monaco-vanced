# Backend Dependency Audit

## Hard Requirement (YES) — 12 plugins

| Plugin | ID | Category | Backend Service | Why |
|---|---|---|---|---|
| AI Module | ai-module | AI | LLM API (OpenAI/Anthropic/etc.) | Chat & completions need an inference endpoint |
| RAG Module | rag-module | AI | Embedding API | Vector embeddings for retrieval-augmented generation |
| Realtime Module | realtime-module | Enterprise | WebSocket server | Channel messaging & presence |
| Secrets Module | secrets-module | Enterprise | Secret manager (Vault/Doppler) | External credential storage |
| Collab Module | collab-module | SCM | Collaboration WS server | Real-time editing sync via rooms |
| Review Module | review-module | SCM | GitHub/GitLab API | PR/MR data via token-based API |
| Context Engine | context-module | Language | CDN/static manifest | Fetches language provider manifests remotely |
| LSP Bridge | lsp-bridge-module | Language | LSP server over WebSocket | Language intelligence (hover, completions, diagnostics) |
| Monarch Grammars | monarch-grammars | Language | CDN tokenizer JSON | Fetches tokenizer JSON files remotely |
| Debugger | debugger-module | Devtools | Debug Adapter Protocol server | Breakpoints & step execution |
| Notebook | notebook-module | Devtools | Jupyter kernel WS server | Cell execution via kernel |
| Terminal | terminal-module | Devtools | PTY WebSocket server | Shell I/O over pseudoterminal |
| Auth Module | infrastructure.auth | Infrastructure | OAuth provider endpoints | Login flow (authorize/token/userinfo) |

## Optional Backend (OPTIONAL) — 13 plugins

| Plugin | ID | Category | Backend Service | Works Without? |
|---|---|---|---|---|
| Prettier | prettier-module | Language | CDN for parser plugins | Yes, with bundled parsers |
| Git Integration | git-module | SCM | Git API proxy | Yes, local status/diff only |
| Sync Module | sync-module | SCM | Sync adapter endpoint | Yes, queue works locally |
| Audit Module | audit-module | Enterprise | HTTP/Kafka log exporter | Yes, logs locally |
| Billing Module | billing-module | Enterprise | Billing/metering backend | Yes, quota tracking local |
| Policy Module | policy-module | Enterprise | Policy sync endpoint | Yes, RBAC runs locally |
| Telemetry Module | telemetry-module | Enterprise | OTLP/Datadog collector | Yes, spans collected locally |
| Feature Flags | platform.feature-flags | Platform | Remote flag service | Yes, local overrides work |
| Offline Module | offline-module | Platform | Sync target | Yes, queue works offline |
| Marketplace | marketplace-module | Extensions | Extension registry API | Yes, local search fallback |
| VSIX Loader | vsix-module | Extensions | VSIX CDN/registry | Yes, local install from data |
| File System | fs-module | Filesystem | Remote FS adapter | Yes, in-memory/IDB adapters work |
| Theme Engine | theme-module | Theming | CDN theme JSON | Yes, builtin themes work |
| Icon Pack | icon-module | Theming | CDN icon assets | Yes, builtin icons work |

## Fully Client-Side (NO) — 57 plugins

| Plugin | ID | Category |
|---|---|---|
| Agent Module | agent-module | AI |
| AI Memory Module | ai-memory-module | AI |
| Context Fusion Module | context-fusion-module | AI |
| Eval Module | eval-module | AI |
| Intent Module | intent-module | AI |
| Knowledge Graph Module | knowledge-graph-module | AI |
| Memory Module | memory-module | AI |
| Predictive Module | predictive-module | AI |
| API Stability Module | api-stability-module | Enterprise |
| Context Engine | context-engine | Enterprise |
| SaaS Tenant Module | saas-tenant-module | Enterprise |
| Snapshot Module | snapshot-module | SCM |
| Diagnostics Module | diagnostics-module | Language |
| ESLint | eslint-module | Language |
| Language Config | language-config | Language |
| Language Detection | language-detection | Language |
| Symbol Index | symbol-index-module | Language |
| Profiler | profiler-module | Devtools |
| Task Runner | task-module | Devtools |
| Test Runner | test-module | Devtools |
| Testing Harness | testing-harness-module | Devtools |
| Accessibility | accessibility-module | Platform |
| Concurrency | platform.concurrency | Platform |
| Crash Recovery | platform.crash-recovery | Platform |
| Fallback | platform.fallback | Platform |
| i18n | i18n-module | Platform |
| Performance | platform.performance | Platform |
| Resource Manager | platform.resource | Platform |
| Security | platform.security | Platform |
| Streaming | platform.streaming | Platform |
| Worker Pool | platform.worker | Platform |
| Embed | embed-module | Extensions |
| Extension Host | extension-module | Extensions |
| Symbol Indexer | indexer-module | Filesystem |
| Workspace Search | search-module | Filesystem |
| Workspace Manager | workspace-module | Filesystem |
| Command Palette | infrastructure.command | Infrastructure |
| Keybindings | infrastructure.keybinding | Infrastructure |
| Settings | infrastructure.settings | Infrastructure |
| Notifications | infrastructure.notification | Infrastructure |
| Dialog | infrastructure.dialog | Infrastructure |
| Deep Link | infrastructure.deep-link | Infrastructure |
| Storage | infrastructure.storage | Infrastructure |
| Migration | migration-module | Infrastructure |
| Code Editor | editor-module | Editor |
| Tabs Manager | tabs-module | Editor |
| Decorations | decorations-module | Editor |
| Preview | preview-module | Editor |
| Snippets | snippets-module | Editor |
| Virtualization | virtualization-module | Editor |
| Webview | webview-module | Editor |
| Layout Manager | layout-module | Layout |
| Sidebar | sidebar-module | Layout |
| Context Menu | context-menu-module | Layout |
| Header | header-module | Layout |
| Navigation | navigation-module | Layout |
| Statusbar | statusbar-module | Layout |
| Title Bar | title-module | Layout |
| UI Module | ui-module | Layout |

## Minimum Backend Stack

| Service | Plugins Covered |
|---|---|
| LLM proxy (OpenAI-compatible) | ai-module, rag-module |
| WebSocket server (multiplexed) | realtime-module, collab-module, terminal-module, debugger-module, notebook-module, lsp-bridge-module |
| OAuth provider | infrastructure.auth |
| GitHub/GitLab API | review-module |
| Secrets vault | secrets-module |
| CDN / static file server | monarch-grammars, context-module, prettier-module, theme-module, icon-module, marketplace-module, vsix-module |

## Summary

| Classification | Count |
|---|---|
| Backend Required (YES) | 13 |
| Backend Optional (OPTIONAL) | 14 |
| Fully Client-Side (NO) | 57 |
| **Total** | **84** |

