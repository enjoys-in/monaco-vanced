import "./style.css";
import * as monaco from "monaco-editor";

// ── Theme CSS custom properties (must init before wireframe) ─
import { initThemeVars, switchTheme, BUILTIN_THEME_NAMES, THEME_DEFS, registerThemes } from "./components/theme";

// ── Zustand store — reactive settings + plugin state ─────────
import { useSettingsStore } from "./stores/settings-store";

// ── Core ─────────────────────────────────────────────────────
import { createMonacoIDE } from "@enjoys/monaco-vanced/core/facade";
import { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";

// ── Plugins: Infrastructure ──────────────────────────────────
import { createSettingsPlugin } from "@enjoys/monaco-vanced/infrastructure/settings-module";
import { createNotificationPlugin } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import { createCommandPlugin } from "@enjoys/monaco-vanced/infrastructure/command-module";
import { createKeybindingPlugin } from "@enjoys/monaco-vanced/infrastructure/keybinding-module";
import { createDialogPlugin } from "@enjoys/monaco-vanced/infrastructure/dialog-module";

// ── Plugins: Theming ─────────────────────────────────────────
import { createThemePlugin } from "@enjoys/monaco-vanced/theming/theme-module";
import { createIconPlugin } from "@enjoys/monaco-vanced/theming/icon-module";

// ── Plugins: Layout ──────────────────────────────────────────
import { createLayoutPlugin } from "@enjoys/monaco-vanced/layout/layout-module";
import { createHeaderPlugin } from "@enjoys/monaco-vanced/layout/header-module";
import { createSidebarPlugin } from "@enjoys/monaco-vanced/layout/sidebar-module";
import { createStatusbarPlugin } from "@enjoys/monaco-vanced/layout/statusbar-module";
import { createTitlePlugin } from "@enjoys/monaco-vanced/layout/title-module";
import { createNavigationPlugin } from "@enjoys/monaco-vanced/layout/navigation-module";
import { createUIPlugin } from "@enjoys/monaco-vanced/layout/ui-module";
import { createContextMenuPlugin } from "@enjoys/monaco-vanced/layout/context-menu-module";

// ── Plugins: Editor ──────────────────────────────────────────
import { createEditorPlugin } from "@enjoys/monaco-vanced/editor/editor-module";
import { createTabsPlugin } from "@enjoys/monaco-vanced/editor/tabs-module";

// ── Plugins: Extensions ──────────────────────────────────────
import { createExtensionPlugin } from "@enjoys/monaco-vanced/extensions/extension-module";
import { createMarketplacePlugin } from "@enjoys/monaco-vanced/extensions/marketplace-module";
import { createVSIXPlugin } from "@enjoys/monaco-vanced/extensions/vsix-module";

// ── Plugins: Filesystem ──────────────────────────────────────
import { createFSPlugin } from "@enjoys/monaco-vanced/filesystem/fs-module";
import type { FSAdapter, DirEntry, FileStat, WatchCallback } from "@enjoys/monaco-vanced/filesystem/fs-module";
import { createSearchPlugin } from "@enjoys/monaco-vanced/filesystem/search-module";

// ── Plugins: SCM ─────────────────────────────────────────────
import { createGitPlugin } from "@enjoys/monaco-vanced/scm/git-module";

// ── Plugins: Language ─────────────────────────────────────────
import { createLanguageDetectionPlugin, detectLanguage } from "@enjoys/monaco-vanced/language/language-detection";

// ── Plugins: Devtools ────────────────────────────────────────
import { createTerminalPlugin } from "@enjoys/monaco-vanced/devtools/terminal-module";
import { createDebugPlugin } from "@enjoys/monaco-vanced/devtools/debugger-module";

// ── Plugins: Auth ─────────────────────────────────────────────
import { createAuthPlugin } from "@enjoys/monaco-vanced/infrastructure/auth-module";

// ── Plugins: Infrastructure (extras) ─────────────────────────
import { createDeepLinkPlugin } from "@enjoys/monaco-vanced/infrastructure/deep-link-module";
import { createStoragePlugin } from "@enjoys/monaco-vanced/infrastructure/storage-module";

// ── Plugins: Editor (extras) ─────────────────────────────────
import { createDecorationsPlugin } from "@enjoys/monaco-vanced/editor/decorations-module";
import { createPreviewPlugin } from "@enjoys/monaco-vanced/editor/preview-module";
import { createSnippetsPlugin } from "@enjoys/monaco-vanced/editor/snippets-module";
import { createVirtualizationPlugin } from "@enjoys/monaco-vanced/editor/virtualization-module";
import { createWebviewPlugin } from "@enjoys/monaco-vanced/editor/webview-module";

// ── Plugins: Language ────────────────────────────────────────
import { createContextPlugin } from "@enjoys/monaco-vanced/language/context-module";
import { createDiagnosticsPlugin } from "@enjoys/monaco-vanced/language/diagnostics-module";
import { createESLintPlugin } from "@enjoys/monaco-vanced/language/eslint-module";
import { createLanguageConfigPlugin } from "@enjoys/monaco-vanced/language/language-config";
import { createLspBridgePlugin } from "@enjoys/monaco-vanced/language/lsp-bridge-module";
import { createMonarchGrammarsPlugin } from "@enjoys/monaco-vanced/language/monarch-grammars";
import { createPrettierPlugin } from "@enjoys/monaco-vanced/language/prettier-module";
import { createSymbolIndexPlugin } from "@enjoys/monaco-vanced/language/symbol-index-module";

// ── Plugins: Platform ────────────────────────────────────────
import { createConcurrencyPlugin } from "@enjoys/monaco-vanced/platform/concurrency-module";
import { createCrashRecoveryPlugin } from "@enjoys/monaco-vanced/platform/crash-recovery-module";
import { createFallbackPlugin } from "@enjoys/monaco-vanced/platform/fallback-module";
import { createFeatureFlagPlugin } from "@enjoys/monaco-vanced/platform/feature-flags-module";
import { createPerformancePlugin } from "@enjoys/monaco-vanced/platform/performance-module";
import { createResourcePlugin } from "@enjoys/monaco-vanced/platform/resource-module";
import { createSecurityPlugin } from "@enjoys/monaco-vanced/platform/security-module";
import { createStreamingPlugin } from "@enjoys/monaco-vanced/platform/streaming-module";
import { createWorkerPlugin } from "@enjoys/monaco-vanced/platform/worker-module";

// ── Plugins: AI ──────────────────────────────────────────────
import { createAIPlugin } from "@enjoys/monaco-vanced/ai/ai-module";
import { createAgentPlugin } from "@enjoys/monaco-vanced/ai/agent-module";
import { createAIMemoryPlugin } from "@enjoys/monaco-vanced/ai/ai-memory-module";
import { createContextFusionPlugin } from "@enjoys/monaco-vanced/ai/context-fusion-module";
import { createEvalPlugin } from "@enjoys/monaco-vanced/ai/eval-module";
import { createIntentPlugin } from "@enjoys/monaco-vanced/ai/intent-module";
import { createKnowledgeGraphPlugin } from "@enjoys/monaco-vanced/ai/knowledge-graph-module";
import { createMemoryPlugin } from "@enjoys/monaco-vanced/ai/memory-module";
import { createPredictivePlugin } from "@enjoys/monaco-vanced/ai/predictive-module";
import { createRAGPlugin } from "@enjoys/monaco-vanced/ai/rag-module";

// ── Plugins: SCM (extras) ────────────────────────────────────
import { createCollabPlugin } from "@enjoys/monaco-vanced/scm/collab-module";
import { createReviewPlugin } from "@enjoys/monaco-vanced/scm/review-module";
import { createSnapshotPlugin } from "@enjoys/monaco-vanced/scm/snapshot-module";
import { createSyncPlugin } from "@enjoys/monaco-vanced/scm/sync-module";

// ── Plugins: Filesystem (extras) ─────────────────────────────
import { createIndexerPlugin } from "@enjoys/monaco-vanced/filesystem/indexer-module";
import { createWorkspacePlugin } from "@enjoys/monaco-vanced/filesystem/workspace-module";

// ── Plugins: Devtools (extras) ───────────────────────────────
import { createNotebookPlugin } from "@enjoys/monaco-vanced/devtools/notebook-module";
import { createProfilerPlugin } from "@enjoys/monaco-vanced/devtools/profiler-module";
import { createTaskPlugin } from "@enjoys/monaco-vanced/devtools/task-module";
import { createTestPlugin } from "@enjoys/monaco-vanced/devtools/test-module";

// ── Plugins: Extensions (extras) ─────────────────────────────
import { createEmbedPlugin } from "@enjoys/monaco-vanced/extensions/embed-module";

// ── Plugins: Enterprise ──────────────────────────────────────
import { createAPIStabilityPlugin } from "@enjoys/monaco-vanced/enterprise/api-stability-module";
import { createAuditPlugin } from "@enjoys/monaco-vanced/enterprise/audit-module";
import { createBillingPlugin } from "@enjoys/monaco-vanced/enterprise/billing-module";
import { createContextEnginePlugin } from "@enjoys/monaco-vanced/enterprise/context-engine";
import { createPolicyPlugin } from "@enjoys/monaco-vanced/enterprise/policy-module";
import { createRealtimePlugin } from "@enjoys/monaco-vanced/enterprise/realtime-module";
import { createSaasTenantPlugin } from "@enjoys/monaco-vanced/enterprise/saas-tenant-module";
import { createSecretsPlugin } from "@enjoys/monaco-vanced/enterprise/secrets-module";
import { createTelemetryPlugin } from "@enjoys/monaco-vanced/enterprise/telemetry-module";

// ── Events ───────────────────────────────────────────────────
import {
  FileEvents, PanelEvents, SidebarEvents, SettingsEvents, ThemeEvents, TabEvents,
  EditorEvents, AuthEvents, WelcomeEvents, ExtensionEvents,
  DecorationEvents, SnippetEvents, ProfilerEvents, TaskEvents, TestEvents,
  CrashEvents, SecurityEvents, AuditEvents, CollabEvents, ReviewEvents,
  NotebookEvents, GraphEvents, PredictEvents, PerformanceEvents, AiEvents,
  IndexSymbolEvents, LspEvents, ContextEngineEvents, GitEvents,
} from "@enjoys/monaco-vanced/core/events";

// ── Builtin theme definitions for registration ───────────────
import draculaTheme from "../../plugins/theming/theme-module/builtin/dracula.json";
import githubDarkTheme from "../../plugins/theming/theme-module/builtin/github-dark.json";
import githubLightTheme from "../../plugins/theming/theme-module/builtin/github-light.json";
import monokaiTheme from "../../plugins/theming/theme-module/builtin/monokai.json";
import oneDarkTheme from "../../plugins/theming/theme-module/builtin/one-dark.json";
import type { ThemeDefinition } from "../../plugins/theming/theme-module/types";

// ── Monaco Workers ────────────────────────────────────────────

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "typescript" || label === "javascript" || label === "typescriptreact" || label === "javascriptreact") return new tsWorker();
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    return new editorWorker();
  },
};

// ── Configure TypeScript for JSX support ─────────────────────
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  strict: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  allowJs: true,
  noEmit: true,
});

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
  allowJs: true,
  allowSyntheticDefaultImports: true,
  noEmit: true,
});

// ── Mock File System ─────────────────────────────────────────
import { createMockFs, seedDemoProject, type MockFsAPI } from "./mock-fs";

// ── Wireframe ────────────────────────────────────────────────
import { mountWireframe, type WireframeAPIs, type VirtualFile } from "./wireframe";
import { mountReactComponents } from "./components/mount";

// ── Build VirtualFile list from mock FS ──────────────────────

function buildVirtualFiles(fs: MockFsAPI): VirtualFile[] {
  const result: VirtualFile[] = [];
  for (const [path, content] of fs.getAllFiles()) {
    const name = path.split("/").pop() ?? path;
    const detected = detectLanguage(path, content, monaco.languages);
    result.push({ uri: path, name, language: detected.languageId, content });
  }
  return result;
}

// ══════════════════════════════════════════════════════════════
// Create plugin instances
// ══════════════════════════════════════════════════════════════

// Infrastructure
const { plugin: commandPlugin, api: commandApi } = createCommandPlugin();
const { plugin: keybindingPlugin } = createKeybindingPlugin();
const { plugin: settingsPlugin, api: settingsApi } = createSettingsPlugin();
const { plugin: notificationPlugin, api: notificationApi } = createNotificationPlugin();
const { plugin: dialogPlugin, api: dialogApi } = createDialogPlugin();

// Theming
const { plugin: themePlugin, api: themeApi } = createThemePlugin({
  persistKey: "monaco-vanced:colorTheme",
  defaultTheme: "dracula",
});
const { plugin: iconPlugin, api: iconApi } = createIconPlugin();

// Layout
const { plugin: layoutPlugin, api: layoutApi } = createLayoutPlugin();
const { plugin: headerPlugin, api: headerApi } = createHeaderPlugin({ title: "Monaco Vanced" });
const { plugin: sidebarPlugin, api: sidebarApi } = createSidebarPlugin();
const { plugin: statusbarPlugin, api: statusbarApi } = createStatusbarPlugin();
const { plugin: titlePlugin, api: titleApi } = createTitlePlugin();
const { plugin: navigationPlugin } = createNavigationPlugin();
const { plugin: uiPlugin } = createUIPlugin();
const { plugin: contextMenuPlugin, api: contextMenuApi } = createContextMenuPlugin();

// Editor
const editorPlugin = createEditorPlugin({ defaultLanguage: "typescript" });
const tabsPlugin = createTabsPlugin();

// Extensions / FS / SCM / Devtools
const { plugin: extensionPlugin, api: extensionApi } = createExtensionPlugin();
const { plugin: marketplacePlugin, api: marketplaceApi } = createMarketplacePlugin();
const { plugin: vsixPlugin, api: vsixApi } = createVSIXPlugin();

// Language
const languageDetectionPlugin = createLanguageDetectionPlugin();

// Auth
const { plugin: authPlugin, api: authApi } = createAuthPlugin({
  providers: ["github", "google"],
  tokenStorageKey: "monaco-vanced-auth",
});

// In-memory FS adapter backed by the demo's mock filesystem
const memoryStore = new Map<string, Uint8Array>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const inMemoryAdapter: FSAdapter = {
  name: "memory",
  type: "local",
  capabilities: { indexing: true, watch: false, search: true, streaming: false, vectorIndex: false, symbolGraph: false },
  async read(path) {
    const data = memoryStore.get(path);
    if (!data) throw new Error(`ENOENT: ${path}`);
    return data;
  },
  async write(path, data) { memoryStore.set(path, data); },
  async delete(path) { memoryStore.delete(path); },
  async rename(from, to) {
    const data = memoryStore.get(from);
    if (data) { memoryStore.set(to, data); memoryStore.delete(from); }
  },
  async copy(from, to) {
    const data = memoryStore.get(from);
    if (data) memoryStore.set(to, new Uint8Array(data));
  },
  async move(from, to) { await this.rename(from, to); },
  async list(dir) {
    const entries: DirEntry[] = [];
    const prefix = dir.endsWith("/") ? dir : dir + "/";
    for (const [p] of memoryStore) {
      if (p.startsWith(prefix)) {
        const rest = p.slice(prefix.length);
        const name = rest.split("/")[0];
        if (!entries.some((e) => e.name === name)) {
          entries.push({ name, path: prefix + name, isDirectory: rest.includes("/"), size: 0, modified: Date.now() });
        }
      }
    }
    return entries;
  },
  async mkdir() { /* no-op for in-memory */ },
  async exists(path) { return memoryStore.has(path); },
  async stat(path) {
    const data = memoryStore.get(path);
    return { size: data?.byteLength ?? 0, modified: Date.now(), created: Date.now(), isDirectory: false };
  },
  watch() { return { dispose() {} }; },
};
const fsPlugin = createFSPlugin({ adapter: inMemoryAdapter });

const { plugin: searchPlugin } = createSearchPlugin();
const { plugin: gitPlugin } = createGitPlugin();
const { plugin: terminalPlugin } = createTerminalPlugin();
const { plugin: debugPlugin } = createDebugPlugin();

// Infrastructure (extras)
const { plugin: deepLinkPlugin, api: deepLinkApi } = createDeepLinkPlugin();
const { plugin: storagePlugin, api: storageApi } = createStoragePlugin();

// Editor (extras)
const decorationsPlugin = createDecorationsPlugin();
const previewPlugin = createPreviewPlugin();
const snippetsPlugin = createSnippetsPlugin();
const virtualizationPlugin = createVirtualizationPlugin();
const { plugin: webviewPlugin, api: webviewApi } = createWebviewPlugin();

// Language
const contextPlugin = createContextPlugin();
const diagnosticsPlugin = createDiagnosticsPlugin();
const eslintPlugin = createESLintPlugin();
const languageConfigPlugin = createLanguageConfigPlugin();
const lspBridgePlugin = createLspBridgePlugin();
const monarchGrammarsPlugin = createMonarchGrammarsPlugin();
const prettierPlugin = createPrettierPlugin();
const symbolIndexPlugin = createSymbolIndexPlugin();

// Platform
const { plugin: concurrencyPlugin, api: concurrencyApi } = createConcurrencyPlugin();
const { plugin: crashRecoveryPlugin, api: crashRecoveryApi } = createCrashRecoveryPlugin();
const { plugin: fallbackPlugin, api: fallbackApi } = createFallbackPlugin();
const { plugin: featureFlagPlugin, api: featureFlagApi } = createFeatureFlagPlugin();
const { plugin: performancePlugin, api: performanceApi } = createPerformancePlugin();
const { plugin: resourcePlugin, api: resourceApi } = createResourcePlugin();
const { plugin: securityPlugin, api: securityApi } = createSecurityPlugin();
const { plugin: streamingPlugin, api: streamingApi } = createStreamingPlugin();
const { plugin: workerPlugin, api: workerApi } = createWorkerPlugin();

// AI
const { plugin: aiPlugin, api: aiApi, orchestrator: aiOrchestrator } = createAIPlugin({ transport: "rest", transportConfig: { baseUrl: "/api/ai" } });
const { plugin: agentPlugin, api: agentApi } = createAgentPlugin();
const { plugin: aiMemoryPlugin, api: aiMemoryApi } = createAIMemoryPlugin();
const { plugin: contextFusionPlugin, api: contextFusionApi } = createContextFusionPlugin();
const { plugin: evalPlugin, api: evalApi } = createEvalPlugin();
const { plugin: intentPlugin, api: intentApi } = createIntentPlugin();
const { plugin: knowledgeGraphPlugin, api: knowledgeGraphApi } = createKnowledgeGraphPlugin();
const { plugin: memoryPlugin, api: memoryApi } = createMemoryPlugin();
const { plugin: predictivePlugin, api: predictiveApi } = createPredictivePlugin();
const { plugin: ragPlugin, api: ragApi } = createRAGPlugin({ embedding: { baseUrl: "/api/embeddings" } });

// SCM (extras)
const { plugin: collabPlugin, api: collabApi } = createCollabPlugin();
const { plugin: reviewPlugin, api: reviewApi } = createReviewPlugin({ provider: "github" });
const { plugin: snapshotPlugin, api: snapshotApi } = createSnapshotPlugin();
const { plugin: syncPlugin, api: syncApi } = createSyncPlugin();

// Filesystem (extras)
const { plugin: indexerPlugin, api: indexerApi } = createIndexerPlugin();
const { plugin: workspacePlugin, api: workspaceApi } = createWorkspacePlugin();

// Devtools (extras)
const { plugin: notebookPlugin, api: notebookApi } = createNotebookPlugin();
const { plugin: profilerPlugin, api: profilerApi } = createProfilerPlugin();
const { plugin: taskPlugin, api: taskApi } = createTaskPlugin();
const { plugin: testPlugin, api: testApi } = createTestPlugin();

// Extensions (extras)
const { plugin: embedPlugin, api: embedApi } = createEmbedPlugin();

// Enterprise
const { plugin: apiStabilityPlugin, api: apiStabilityApi } = createAPIStabilityPlugin();
const { plugin: auditPlugin, api: auditApi } = createAuditPlugin();
const { plugin: billingPlugin, api: billingApi } = createBillingPlugin();
const { plugin: contextEnginePlugin, api: contextEngineApi } = createContextEnginePlugin({
  lazyLoad: true,
});
const { plugin: policyPlugin, api: policyApi } = createPolicyPlugin();
const { plugin: realtimePlugin, api: realtimeApi } = createRealtimePlugin();
const { plugin: saasTenantPlugin, api: saasTenantApi } = createSaasTenantPlugin();
const { plugin: secretsPlugin, api: secretsApi } = createSecretsPlugin();
const { plugin: telemetryPlugin, api: telemetryApi } = createTelemetryPlugin();

const allPlugins = [
  // Infrastructure
  commandPlugin, keybindingPlugin, settingsPlugin, notificationPlugin, dialogPlugin,
  authPlugin, deepLinkPlugin, storagePlugin,
  // Theming
  themePlugin, iconPlugin,
  // Layout
  layoutPlugin, headerPlugin, sidebarPlugin, statusbarPlugin, titlePlugin,
  navigationPlugin, uiPlugin, contextMenuPlugin,
  // Editor
  editorPlugin, tabsPlugin, decorationsPlugin, previewPlugin,
  snippetsPlugin, virtualizationPlugin, webviewPlugin,
  // Extensions
  extensionPlugin, marketplacePlugin, vsixPlugin, embedPlugin,
  // Filesystem
  fsPlugin, searchPlugin, indexerPlugin, workspacePlugin,
  // SCM
  gitPlugin, collabPlugin, reviewPlugin, snapshotPlugin, syncPlugin,
  // Language
  languageDetectionPlugin, contextPlugin, diagnosticsPlugin, eslintPlugin,
  languageConfigPlugin, lspBridgePlugin, monarchGrammarsPlugin,
  prettierPlugin, symbolIndexPlugin,
  // Platform
  concurrencyPlugin, crashRecoveryPlugin, fallbackPlugin, featureFlagPlugin,
  performancePlugin, resourcePlugin, securityPlugin, streamingPlugin, workerPlugin,
  // AI
  aiPlugin, agentPlugin, aiMemoryPlugin, contextFusionPlugin, evalPlugin,
  intentPlugin, knowledgeGraphPlugin, memoryPlugin, predictivePlugin, ragPlugin,
  // Devtools
  terminalPlugin, debugPlugin, notebookPlugin, profilerPlugin, taskPlugin, testPlugin,
  // Enterprise
  apiStabilityPlugin, auditPlugin, billingPlugin, contextEnginePlugin, policyPlugin,
  realtimePlugin, saasTenantPlugin, secretsPlugin, telemetryPlugin,
];

const apis: WireframeAPIs = {
  header: headerApi, sidebar: sidebarApi, statusbar: statusbarApi,
  title: titleApi, layout: layoutApi, notification: notificationApi,
  command: commandApi, contextMenu: contextMenuApi, dialog: dialogApi,
};

// ══════════════════════════════════════════════════════════════
// Editor options
// ══════════════════════════════════════════════════════════════

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: "typescript",
  theme: "vs-dark",
  automaticLayout: true,
  minimap: { enabled: true },
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  fontLigatures: true,
  padding: { top: 12 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  cursorSmoothCaretAnimation: "on",
  bracketPairColorization: { enabled: true },
  renderLineHighlight: "all",
  tabSize: 2,
  wordWrap: "off",
  lineNumbers: "on",
  folding: true,
  glyphMargin: true,
  fixedOverflowWidgets: true,
};

// ══════════════════════════════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════════════════════════════

let ide: MonacoVancedInstance;
const models = new Map<string, monaco.editor.ITextModel>();

function getOrCreateModel(file: VirtualFile): monaco.editor.ITextModel {
  let model = models.get(file.uri);
  if (!model || model.isDisposed()) {
    const monacoUri = monaco.Uri.parse(`file:///${file.uri}`);
    model = monaco.editor.getModel(monacoUri) ?? monaco.editor.createModel(file.content, file.language, monacoUri);
    models.set(file.uri, model);
  }
  return model;
}

function openFileInEditor(uri: string, files: VirtualFile[]) {
  const file = files.find((f) => f.uri === uri);
  if (!file || !ide) return;
  const model = getOrCreateModel(file);
  if (ide.editor.getModel() !== model) {
    ide.editor.setModel(model);
  }
}

async function bootstrap() {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("Missing #app element");

  // ── Initialize theme CSS custom properties (before wireframe) ─
  initThemeVars();

  const eventBus = new EventBus();

  // ── Hydrate Zustand store from IndexedDB ─────────────────
  await useSettingsStore.getState().hydrate();

  // ── Mock File System ─────────────────────────────────────
  const mockFs = createMockFs(eventBus);
  seedDemoProject(mockFs);
  const DEMO_FILES = buildVirtualFiles(mockFs);

  // Seed the in-memory FS adapter from mock files
  for (const [path, content] of mockFs.getAllFiles()) {
    memoryStore.set(path, encoder.encode(content));
  }

  // ── Mount Wireframe ──────────────────────────────────────
  const { editorContainer, settingsEl, welcomeEl, tabListEl, breadcrumbEl, titleCenterEl, activityBarEl, statusBarEl, sidebarEl } = mountWireframe(appRoot, apis, eventBus, DEMO_FILES, mockFs, {
    iconApi: iconApi,
    extensionApi: extensionApi,
    vsixApi: vsixApi,
    authApi: authApi,
    marketplaceApi: marketplaceApi,
    aiApi: aiApi,
    indexerApi: indexerApi,
  });

  const defaultFile = DEMO_FILES.find((f) => f.uri === "src/app.tsx")
    ?? DEMO_FILES.find((f) => f.uri === "src/main.tsx")
    ?? DEMO_FILES[0];

  // ── Register builtin themes into theme plugin before IDE creation ──
  const builtinThemes = [draculaTheme, githubDarkTheme, githubLightTheme, monokaiTheme, oneDarkTheme] as unknown as ThemeDefinition[];
  for (const t of builtinThemes) {
    themeApi.register(t);
  }

  // ── Create IDE ───────────────────────────────────────────
  ide = await createMonacoIDE({
    container: editorContainer,
    monaco,
    plugins: allPlugins,
    language: defaultFile.language,
    editorOptions: { ...editorOptions as Record<string, unknown>, model: null },
    eventBus,
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

  // ── Initialize all plugin states in Zustand store ────────
  for (const p of allPlugins) {
    useSettingsStore.getState().initPlugin(p.id, true);
  }

  // ── Bridge: settings store changes → settings plugin API ──
  useSettingsStore.subscribe(
    (s) => s.settings,
    (settings, prevSettings) => {
      for (const [key, value] of Object.entries(settings)) {
        if (prevSettings[key] !== value) {
          settingsApi.set(key, value, "user");
        }
      }
    },
  );

  // ── Register themes from plugin API (runtime, no static JSON imports) ──
  registerThemes(themeApi.getThemes());
  const currentThemeId = themeApi.getCurrent();
  if (currentThemeId) switchTheme(currentThemeId);

  // ── Mount React components (Settings + Welcome + Tabs + Breadcrumbs) ──
  mountReactComponents({
    settingsEl,
    welcomeEl,
    eventBus,
    recentFiles: DEMO_FILES.slice(0, 6).map((f) => ({ uri: f.uri, name: f.name })),
    tabListEl,
    breadcrumbEl,
    titleCenterEl,
    iconApi,
    fsApi: mockFs,
    themeApi,
    extensionApi,
  });

  // Pre-create all models so file switching is instant
  for (const file of DEMO_FILES) getOrCreateModel(file);

  // ── Wire file:open → switch Monaco model ─────────────────
  eventBus.on(FileEvents.Open, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    console.log("[monaco-vanced] file:open →", uri);
    openFileInEditor(uri, DEMO_FILES);
  });

  // ── Wire editor content changes → mock FS + dirty tracking ──
  const originalContents = new Map<string, string>();
  for (const file of DEMO_FILES) originalContents.set(file.uri, file.content);

  ide.editor.onDidChangeModelContent(() => {
    const model = ide.editor.getModel();
    if (!model) return;
    const uri = model.uri.path.replace(/^\//, "");
    const currentValue = model.getValue();
    mockFs.writeFile(uri, currentValue);
    eventBus.emit(FileEvents.Modified, { uri });

    // Track dirty state
    const original = originalContents.get(uri);
    const dirty = original !== undefined && original !== currentValue;
    eventBus.emit(TabEvents.Dirty, { uri, dirty });
  });

  // ── On file save → mark clean ──────────────────────────────
  eventBus.on(FileEvents.Save, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    const model = models.get(uri);
    if (model) {
      originalContents.set(uri, model.getValue());
      eventBus.emit(TabEvents.Dirty, { uri, dirty: false });
    }
  });

  // ── Wire settings changes → Monaco editor options ────────
  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown; _src?: string };
    if (p._src === "main") return; // prevent re-entry
    const settingId = p.id ?? p.key ?? "";
    if (!settingId) return;

    // Re-emit with both id AND key so plugin engine onConfigChange works
    if (p.id && !p.key) {
      eventBus.emit(SettingsEvents.Change, { id: settingId, key: settingId, value: p.value, _src: "main" });
      return;
    }

    // ── Editor options mapping ─────────────────────────────
    const optMap: Record<string, string> = {
      "editor.fontSize": "fontSize",
      "editor.fontFamily": "fontFamily",
      "editor.fontWeight": "fontWeight",
      "editor.fontLigatures": "fontLigatures",
      "editor.lineHeight": "lineHeight",
      "editor.letterSpacing": "letterSpacing",
      "editor.tabSize": "tabSize",
      "editor.insertSpaces": "insertSpaces",
      "editor.wordWrap": "wordWrap",
      "editor.lineNumbers": "lineNumbers",
      "editor.folding": "folding",
      "editor.glyphMargin": "glyphMargin",
      "editor.minimap.enabled": "minimap.enabled",
      "editor.minimap.side": "minimap.side",
      "editor.smoothScrolling": "smoothScrolling",
      "editor.scrollBeyondLastLine": "scrollBeyondLastLine",
      "editor.cursorBlinking": "cursorBlinking",
      "editor.cursorStyle": "cursorStyle",
      "editor.cursorSmoothCaretAnimation": "cursorSmoothCaretAnimation",
      "editor.bracketPairColorization.enabled": "bracketPairColorization.enabled",
      "editor.renderWhitespace": "renderWhitespace",
      "editor.renderLineHighlight": "renderLineHighlight",
      "editor.suggestOnTriggerCharacters": "suggestOnTriggerCharacters",
      "editor.quickSuggestions": "quickSuggestions",
      "editor.snippetSuggestions": "snippetSuggestions",
      "editor.formatOnPaste": "formatOnPaste",
      "editor.formatOnType": "formatOnType",
      "diffEditor.renderSideBySide": "renderSideBySide",
    };
    const opt = optMap[settingId];
    if (opt) {
      if (opt.includes(".")) {
        const [parent, child] = opt.split(".");
        ide.editor.updateOptions({ [parent]: { [child]: p.value } });
      } else {
        ide.editor.updateOptions({ [opt]: p.value });
      }
      return;
    }

    // ── Workbench / UI toggle settings ─────────────────────
    switch (settingId) {
      case "workbench.colorTheme": {
        const themeName = String(p.value);
        // Use theme plugin API — handles CDN loading, caching, and Monaco registration
        themeApi.apply(themeName).catch((err) => {
          // Fallback: try case-insensitive match against registered names
          const match = BUILTIN_THEME_NAMES.find((n) => n.toLowerCase() === themeName.toLowerCase());
          if (match) {
            themeApi.apply(match).catch(() => console.warn("[theme] failed to apply:", themeName, err));
          }
        });
        break;
      }
      case "workbench.activityBar.visible":
        activityBarEl.style.display = p.value ? "" : "none";
        break;
      case "workbench.statusBar.visible":
        statusBarEl.style.display = p.value ? "" : "none";
        break;
      case "workbench.sideBar.location":
        sidebarEl.style.order = p.value === "right" ? "3" : "";
        activityBarEl.style.order = p.value === "right" ? "4" : "";
        break;
      case "breadcrumbs.enabled":
        breadcrumbEl.style.display = p.value ? "" : "none";
        break;
      case "workbench.editor.showIcons":
        document.documentElement.style.setProperty("--tab-icon-display", p.value ? "inline-flex" : "none");
        break;
      case "workbench.editor.highlightModifiedTabs":
        document.documentElement.style.setProperty("--tab-dirty-border", p.value ? "2px" : "0");
        break;
    }
  });

  // ── Wire theme changes → Monaco + wireframe CSS vars ──────
  eventBus.on(ThemeEvents.Changed, (payload: unknown) => {
    const p = payload as { name?: string; themeId?: string; monacoTheme?: string };
    const themeKey = p.name ?? p.themeId ?? "";
    // Re-register any newly loaded themes from the plugin (CDN themes)
    registerThemes(themeApi.getThemes());
    const def = THEME_DEFS[themeKey];
    const monacoTheme = p.monacoTheme ?? (def?.type === "light" ? "vs" : def?.type === "hc" ? "hc-black" : "vs-dark");
    monaco.editor.setTheme(monacoTheme);
    switchTheme(themeKey);
  });

  // ── Wire language detection → Monaco model language ───────
  eventBus.on(EditorEvents.LanguageChange, (payload: unknown) => {
    const { uri, language } = payload as { uri: string; language: string };
    const model = models.get(uri);
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  });

  // ══════════════════════════════════════════════════════════
  // Status Bar — fully dynamic
  // ══════════════════════════════════════════════════════════

  // ── Detect .git directory for real branch info ───────────
  const gitHead = mockFs.readFile(".git/HEAD");
  const isGitRepo = gitHead !== null;
  let currentBranch = "main";
  if (isGitRepo && gitHead) {
    // Parse "ref: refs/heads/<branch>\n" format
    const match = gitHead.match(/^ref:\s+refs\/heads\/(.+)/);
    if (match) currentBranch = match[1].trim();
  }

  if (isGitRepo) {
    statusbarApi.register({ id: "branch", label: `$(git-branch) ${currentBranch}`, alignment: "left", priority: 100, tooltip: `${currentBranch} (Git Branch) — Click to Checkout` });
    statusbarApi.register({ id: "sync", label: "$(sync) 0↓ 0↑", alignment: "left", priority: 95, tooltip: "Synchronize Changes — 0 pending pull, 0 pending push" });
  }

  // React to branch changes from git plugin
  eventBus.on(GitEvents.BranchChange, (p: unknown) => {
    const { branch } = p as { branch: string };
    currentBranch = branch;
    if (isGitRepo) {
      // Update .git/HEAD in mock-fs to keep in sync
      mockFs.writeFile(".git/HEAD", `ref: refs/heads/${branch}\n`);
      statusbarApi.update("branch", {
        label: `$(git-branch) ${branch}`,
        tooltip: `${branch} (Git Branch) — Click to Checkout`,
      });
    }
  });

  statusbarApi.register({ id: "errors", label: "$(error) 0  $(warning) 0", alignment: "left", priority: 90, tooltip: "No Problems — Click to Toggle Problems Panel", visible: false });
  statusbarApi.register({ id: "line-col", label: "Ln 1, Col 1", alignment: "right", priority: 100, tooltip: "Go to Line/Column", visible: false });
  statusbarApi.register({ id: "selection", label: "", alignment: "right", priority: 95, visible: false, tooltip: "Characters Selected" });
  statusbarApi.register({ id: "spaces", label: "Spaces: 2", alignment: "right", priority: 80, tooltip: "Select Indentation — Spaces: 2", visible: false });
  statusbarApi.register({ id: "encoding", label: "UTF-8", alignment: "right", priority: 75, tooltip: "Select Encoding", visible: false });
  statusbarApi.register({ id: "eol", label: "LF", alignment: "right", priority: 70, tooltip: "Select End of Line Sequence", visible: false });
  statusbarApi.register({ id: "language", label: "TypeScript React", alignment: "right", priority: 65, tooltip: "Select Language Mode — TypeScript React", visible: false });
  statusbarApi.register({ id: "prettier", label: "$(check) Prettier", alignment: "right", priority: 50, tooltip: "Prettier — Formatter (Default)", visible: false });
  statusbarApi.register({ id: "feedback", label: "$(feedback)", alignment: "right", priority: 10, tooltip: "Tweet Feedback" });
  statusbarApi.register({ id: "bell", label: "$(bell)", alignment: "right", priority: 5, tooltip: "No Notifications — Click to Show" });

  // ── Track cursor position ────────────────────────────────
  ide.editor.onDidChangeCursorPosition((e) => {
    statusbarApi.update("line-col", {
      label: `Ln ${e.position.lineNumber}, Col ${e.position.column}`,
      tooltip: `Go to Line/Column — Line ${e.position.lineNumber}, Column ${e.position.column}`,
    });
  });

  // ── Track selection ──────────────────────────────────────
  ide.editor.onDidChangeCursorSelection((e) => {
    const sel = e.selection;
    if (sel.isEmpty()) {
      statusbarApi.update("selection", { label: "", visible: false });
    } else {
      const lines = Math.abs(sel.endLineNumber - sel.startLineNumber);
      const text = ide.editor.getModel()?.getValueInRange(sel) ?? "";
      statusbarApi.update("selection", {
        label: lines > 0 ? `${lines + 1} lines, ${text.length} chars selected` : `${text.length} selected`,
        visible: true,
        tooltip: lines > 0 ? `${lines + 1} Lines, ${text.length} Characters Selected` : `${text.length} Characters Selected`,
      });
    }
  });

  // ── Track model/language changes ─────────────────────────
  const LANG_NAMES: Record<string, string> = {
    typescript: "TypeScript", typescriptreact: "TypeScript React",
    javascript: "JavaScript", javascriptreact: "JavaScript React",
    json: "JSON", css: "CSS", scss: "SCSS", html: "HTML",
    markdown: "Markdown", python: "Python", rust: "Rust", go: "Go",
    yaml: "YAML", shell: "Shell Script", sql: "SQL", plaintext: "Plain Text",
    xml: "XML", graphql: "GraphQL",
  };

  function updateModelMeta() {
    const model = ide.editor.getModel();
    if (!model) return;

    // Language
    const langName = LANG_NAMES[model.getLanguageId()] ?? model.getLanguageId();
    statusbarApi.update("language", { label: langName, tooltip: `Select Language Mode — ${langName}` });

    // EOL
    const eolSeq = model.getEOL();
    const eolLabel = eolSeq === "\r\n" ? "CRLF" : "LF";
    statusbarApi.update("eol", { label: eolLabel, tooltip: `Select End of Line Sequence — ${eolLabel}` });

    // Encoding (always UTF-8 in browser Monaco)
    statusbarApi.update("encoding", { label: "UTF-8" });

    // Tab size / indentation
    const opts = model.getOptions();
    const indentLabel = opts.insertSpaces ? `Spaces: ${opts.tabSize}` : `Tab Size: ${opts.tabSize}`;
    statusbarApi.update("spaces", { label: indentLabel, tooltip: `Select Indentation — ${indentLabel}` });

    // Title
    const filePath = model.uri.path.replace(/^\//, "");
    const fileName = filePath.split("/").pop() ?? filePath;
    document.title = `${fileName} — Monaco Vanced`;
  }

  // File-specific status items to show/hide based on active model
  const FILE_STATUS_IDS = ["errors", "line-col", "spaces", "encoding", "eol", "language", "prettier"];

  ide.editor.onDidChangeModel(() => {
    const hasModel = !!ide.editor.getModel();
    for (const id of FILE_STATUS_IDS) statusbarApi.update(id, { visible: hasModel });
    if (!hasModel) statusbarApi.update("selection", { visible: false });
    updateModelMeta();
  });
  // Also update on language change within the same model
  monaco.editor.onDidChangeModelLanguage(() => { updateModelMeta(); });

  // ── Track diagnostics (error/warning markers) ─────────────
  function updateDiagnostics() {
    const markers = monaco.editor.getModelMarkers({});
    let errors = 0;
    let warnings = 0;
    for (const m of markers) {
      if (m.severity === monaco.MarkerSeverity.Error) errors++;
      else if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
    }
    statusbarApi.update("errors", {
      label: `$(error) ${errors}  $(warning) ${warnings}`,
      tooltip: errors + warnings > 0 ? `${errors} error(s), ${warnings} warning(s)` : "No Problems",
    });
  }
  // Monaco fires onDidChangeMarkers when diagnostics change
  monaco.editor.onDidChangeMarkers(() => { updateDiagnostics(); });
  // Initial update
  updateDiagnostics();
  updateModelMeta();

  // ══════════════════════════════════════════════════════════
  // Commands — "Define once → use everywhere"
  // editor.addAction() powers both Monaco's built-in Command Palette
  // (Ctrl+Shift+P / F1) AND the right-click Context Menu.
  // See: context/monaco-command-system.txt
  //
  // contextMenuGroupId controls WHERE in the right-click menu:
  //   navigation       → top (Go to..., Peek...)
  //   1_modification   → editing (Format, Comment, Rename)
  //   9_cutcopypaste   → clipboard area
  //   z_commands       → bottom (palette, sidebar, panel)
  //   (omit)           → palette-only, no context menu entry
  // ══════════════════════════════════════════════════════════


const actions: monaco.editor.IActionDescriptor[] = [

    {
      id: "monacoVanced.toggleSidebar",
      label: "Toggle Sidebar",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => { eventBus.emit(SidebarEvents.Toggle, {}); },
    },
    {
      id: "monacoVanced.togglePanel",
      label: "Toggle Panel",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ],
      run: () => { eventBus.emit(PanelEvents.BottomToggle, {}); },
    },
    {
      id: "monacoVanced.openSettings",
      label: "Open Settings",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
      run: () => { eventBus.emit(SettingsEvents.UIOpen, {}); },
    },

    // ── Palette-only (no contextMenuGroupId) ──────────────
    {
      id: "monacoVanced.find",
      label: "Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (ed) => { ed.getAction("actions.find")?.run(); },
    },
    {
      id: "monacoVanced.findReplace",
      label: "Find and Replace",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: (ed) => { ed.getAction("editor.action.startFindReplaceAction")?.run(); },
    },
    {
      id: "monacoVanced.selectAll",
      label: "Select All",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
      run: (ed) => { ed.getAction("editor.action.selectAll")?.run(); },
    },
    {
      id: "monacoVanced.expandSelection",
      label: "Expand Selection",
      run: (ed) => { ed.getAction("editor.action.smartSelect.expand")?.run(); },
    },
 
    {
      id: "monacoVanced.showSourceControl",
      label: "Show Source Control",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "scm" }); },
    },
    {
      id: "monacoVanced.showDebug",
      label: "Show Run and Debug",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "debug" }); },
    },
    {
      id: "monacoVanced.showExtensions",
      label: "Show Extensions",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "extensions" }); },
    },
    // File
    {
      id: "monacoVanced.saveFile",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => { notificationApi.show({ type: "success", message: "File saved.", duration: 2000 }); },
    },
    {
      id: "monacoVanced.newFile",
      label: "New File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
      run: () => { notificationApi.show({ type: "info", message: "Use Explorer > New File toolbar button.", duration: 3000 }); },
    },
    // Help
    {
      id: "monacoVanced.welcome",
      label: "Welcome",
      run: () => { notificationApi.show({ type: "info", message: "Welcome to Monaco Vanced IDE", duration: 4000 }); },
    },
    {
      id: "monacoVanced.about",
      label: "About",
      run: () => { notificationApi.show({ type: "info", message: "Monaco Vanced v0.2.0 — Plugin-based IDE Architecture", duration: 4000 }); },
    },
    // Language
    {
      id: "monacoVanced.changeLanguageMode",
      label: "Change Language Mode",
      run: () => { notificationApi.show({ type: "info", message: "Language mode selection coming soon.", duration: 3000 }); },
    },
  ];

  // Register all actions with Monaco — appears in both palette + context menu
  for (const action of actions) {
    ide.editor.addAction(action);
  }

  // Also register with command module for wireframe palette
  for (const action of actions) {
    commandApi.register({
      id: action.id,
      label: action.label,
      handler: () => action.run(ide.editor, undefined as never),
    });
  }
  // ══════════════════════════════════════════════════════════
  // Startup behavior based on workbench.startupEditor setting
  // ══════════════════════════════════════════════════════════

  const startupEditor: string = "welcomePage"; // default, overridden by settings
  switch (startupEditor) {
    case "none":
      // Show blank editor — do nothing
      break;
    case "newUntitledFile":
      // Create an empty untitled model with a proper file:// URI to avoid inmemory:// TS worker errors
      ide.editor.setModel(monaco.editor.createModel("", "plaintext", monaco.Uri.parse("file:///untitled-1")));
      break;
    case "readme": {
      const readmeFile = DEMO_FILES.find((f) => f.uri.toLowerCase() === "readme.md");
      if (readmeFile) {
        eventBus.emit(FileEvents.Open, { uri: readmeFile.uri, label: readmeFile.name });
      }
      break;
    }
    case "welcomePage":
    default:
      // Welcome page is shown by default via wireframe
      eventBus.emit(WelcomeEvents.Show, {});
      break;
  }

  // ── Wire startupEditor setting changes ───────────────────
  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown; _src?: string };
    const settingId = p.id ?? p.key ?? "";
    if (settingId === "workbench.startupEditor") {
      // Store for next session (in localStorage)
      try { localStorage.setItem("monaco-vanced:startupEditor", String(p.value)); } catch { /* ignore */ }
    }
  });

  // ── Wire plugin enable/disable ───────────────────────────
  eventBus.on(ExtensionEvents.Enabled, (payload: unknown) => {
    const { id } = payload as { id: string };
    console.log("[monaco-vanced] Plugin enabled:", id);
  });
  eventBus.on(ExtensionEvents.Disabled, (payload: unknown) => {
    const { id } = payload as { id: string };
    console.log("[monaco-vanced] Plugin disabled:", id);
  });

  // ══════════════════════════════════════════════════════════
  // Wire IDLE/PASSIVE plugin modules into the demo
  // ══════════════════════════════════════════════════════════

  // ── 1. Decorations — highlight TODO/FIXME/HACK in the editor ──
  function applyTodoDecorations() {
    const model = ide.editor.getModel();
    if (!model) return;
    const text = model.getValue();
    const ranges: { range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }; options: { isWholeLine: boolean; className: string; glyphMarginClassName: string; overviewRuler: { color: string; position: number } } }[] = [];
    const re = /\b(TODO|FIXME|HACK|BUG|NOTE|XXX)\b/gi;
    for (let ln = 1; ln <= model.getLineCount(); ln++) {
      const line = model.getLineContent(ln);
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(line)) !== null) {
        const tag = m[1].toUpperCase();
        const color = tag === "FIXME" || tag === "BUG" ? "#f14c4c" : tag === "HACK" || tag === "XXX" ? "#cca700" : "#3794ff";
        ranges.push({
          range: { startLineNumber: ln, startColumn: m.index + 1, endLineNumber: ln, endColumn: m.index + m[0].length + 1 },
          options: { isWholeLine: false, className: `todo-deco-${tag.toLowerCase()}`, glyphMarginClassName: "todo-glyph", overviewRuler: { color, position: 1 } },
        });
      }
    }
    eventBus.emit(DecorationEvents.Clear, { owner: "todo-highlights" });
    if (ranges.length > 0) {
      eventBus.emit(DecorationEvents.Apply, { owner: "todo-highlights", decorations: ranges });
    }
  }
  ide.editor.onDidChangeModel(() => applyTodoDecorations());
  ide.editor.onDidChangeModelContent(() => applyTodoDecorations());
  applyTodoDecorations();

  // ── 2. Snippets — register common React/TS/JS snippets ───
  const demoSnippets = [
    { prefix: "rfc", label: "React Function Component", body: "export function ${1:Component}({ ${2:props} }: ${3:Props}) {\n  return (\n    <div>\n      $0\n    </div>\n  );\n}", language: "typescriptreact", description: "React function component" },
    { prefix: "us", label: "useState Hook", body: "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:string}>(${3:''});", language: "typescriptreact", description: "React useState hook" },
    { prefix: "ue", label: "useEffect Hook", body: "useEffect(() => {\n  ${1:// effect}\n  return () => {\n    ${2:// cleanup}\n  };\n}, [${3:deps}]);", language: "typescriptreact", description: "React useEffect hook" },
    { prefix: "cl", label: "Console Log", body: "console.log('${1:label}:', ${2:value});", language: "typescript", description: "Console log with label" },
    { prefix: "af", label: "Arrow Function", body: "const ${1:name} = (${2:params}) => {\n  $0\n};", language: "typescript", description: "Arrow function" },
    { prefix: "int", label: "TypeScript Interface", body: "interface ${1:Name} {\n  ${2:key}: ${3:string};\n}", language: "typescript", description: "TypeScript interface" },
    { prefix: "map", label: "Array Map", body: "${1:array}.map((${2:item}) => {\n  return $0;\n});", language: "typescript", description: "Array map" },
    { prefix: "imp", label: "Import Statement", body: "import { $2 } from '${1:module}';", language: "typescript", description: "Import statement" },
    { prefix: "tryc", label: "Try-Catch", body: "try {\n  $1\n} catch (error) {\n  console.error(error);\n  $0\n}", language: "typescript", description: "Try-catch block" },
    { prefix: "fetch", label: "Fetch Request", body: "const response = await fetch('${1:url}');\nconst data = await response.json();", language: "typescript", description: "Fetch API request" },
  ];
  for (const s of demoSnippets) {
    eventBus.emit(SnippetEvents.Add, s);
    // Also add for JS/JSX variants
    if (s.language === "typescript") {
      eventBus.emit(SnippetEvents.Add, { ...s, language: "javascript" });
    } else if (s.language === "typescriptreact") {
      eventBus.emit(SnippetEvents.Add, { ...s, language: "javascriptreact" });
    }
  }

  // ── 3. Telemetry — track user actions ─────────────────────
  {
    const trackOpen = (p: unknown) => { const { uri } = p as { uri: string }; telemetryApi.recordEvent("file.open", { uri }); };
    const trackSave = (p: unknown) => { const { uri } = p as { uri: string }; telemetryApi.recordEvent("file.save", { uri }); };
    const trackClose = (p: unknown) => { const { uri } = p as { uri: string }; telemetryApi.recordEvent("tab.close", { uri }); };
    eventBus.on(FileEvents.Open, trackOpen);
    eventBus.on(FileEvents.Save, trackSave);
    eventBus.on(TabEvents.Close, trackClose);
  }

  // ── 4. Audit — log security-relevant actions ──────────────
  {
    const logAudit = (action: string) => (p: unknown) => {
      const { uri } = (p ?? {}) as { uri?: string };
      auditApi.log({ action, resource: uri ?? "unknown", actor: "demo-user" });
    };
    eventBus.on(FileEvents.Open, logAudit("file.open"));
    eventBus.on(FileEvents.Save, logAudit("file.save"));
    eventBus.on(FileEvents.Deleted, logAudit("file.delete"));
    eventBus.on(FileEvents.Created, logAudit("file.create"));
    eventBus.on(SettingsEvents.UIOpen, logAudit("settings.open"));
    eventBus.on(AuthEvents.Login, logAudit("auth.login"));
  }

  // ── 5. Snapshot — auto-snapshot on file save ──────────────
  eventBus.on(FileEvents.Save, (p: unknown) => {
    const { uri } = p as { uri: string };
    const model = models.get(uri);
    if (model) {
      snapshotApi.capture(uri, model.getValue());
    }
  });

  // ── 6. Predictive — track file open patterns ─────────────
  eventBus.on(FileEvents.Open, (p: unknown) => {
    const { uri } = p as { uri: string };
    predictiveApi.recordFile(uri);
  });
  // Track command executions
  const origRegister = commandApi.register.bind(commandApi);
  commandApi.register = (cmd) => {
    const wrapped = { ...cmd, handler: (...args: unknown[]) => { predictiveApi.recordCommand(cmd.id); return cmd.handler(...args); } };
    return origRegister(wrapped);
  };

  // ── 7. Storage — persist settings to storage module ───────
  eventBus.on(SettingsEvents.Change, (p: unknown) => {
    const { key, value, _src } = p as { key?: string; value: unknown; _src?: string };
    if (key && _src !== "storage-sync") {
      storageApi.set(`settings:${key}`, JSON.stringify(value)).catch(() => {});
    }
  });

  // ── 8. Workspace — configure with demo project root ───────
  workspaceApi.addRoot("file:///demo-project", "demo-project");

  // ── 9. Security — validate plugin permissions on load ─────
  eventBus.on(ExtensionEvents.Enabled, (p: unknown) => {
    const { id } = p as { id: string };
    const result = securityApi.checkPermission(id, "fs.read");
    if (!result) {
      console.warn(`[security] Plugin "${id}" lacks fs.read permission`);
    }
  });

  // ── 10. Policy — set up demo RBAC roles ───────────────────
  policyApi.addPolicy({
    id: "default-access",
    name: "Default Access",
    roles: ["editor"],
    rules: [
      { resource: "file:*", actions: ["read"], effect: "allow" },
      { resource: "file:*", actions: ["write"], effect: "allow" },
      { resource: "settings:*", actions: ["read"], effect: "allow" },
      { resource: "settings:*", actions: ["write"], effect: "allow" },
      { resource: "terminal:*", actions: ["execute"], effect: "allow" },
    ],
  });
  policyApi.createRole({ id: "editor", name: "Editor", policies: ["default-access"] });
  policyApi.assignRole("demo-user", "editor");

  // ── 11. Secrets — seed demo secrets ───────────────────────
  secretsApi.set("github-token", "ghp_demo_xxx_not_real").catch(() => {});
  secretsApi.set("openai-key", "sk-demo_xxx_not_real").catch(() => {});

  // ── 12. Profiler — add start/stop commands ────────────────
  let _profiling = false;
  commandApi.register({
    id: "monacoVanced.startProfiler",
    label: "Developer: Start Performance Profile",
    handler: () => {
      if (_profiling) return;
      _profiling = true;
      eventBus.emit(ProfilerEvents.Start, {});
      statusbarApi.register({ id: "profiler", label: "$(flame) Profiling…", alignment: "left", priority: 50, tooltip: "Performance profiler running" });
      notificationApi.show({ type: "info", message: "Profiler started. Use 'Stop Performance Profile' to finish.", duration: 3000 });
    },
  });
  commandApi.register({
    id: "monacoVanced.stopProfiler",
    label: "Developer: Stop Performance Profile",
    handler: () => {
      if (!_profiling) return;
      _profiling = false;
      eventBus.emit(ProfilerEvents.Stop, {});
      statusbarApi.update("profiler", { label: "$(check) Profile captured" });
      setTimeout(() => statusbarApi.remove("profiler"), 4000);
      notificationApi.show({ type: "success", message: "Profile captured. Check Performance tab in DevTools.", duration: 4000 });
    },
  });

  // ── 13. Task — wire lint/build as background tasks ────────
  commandApi.register({
    id: "monacoVanced.runBuild",
    label: "Task: Run Build",
    handler: () => {
      const id = `build-${Date.now()}`;
      taskApi.enqueue({ id, label: "Build Project", priority: "high", cancellable: false });
      statusbarApi.register({ id: "build-task", label: "$(loading~spin) Building…", alignment: "left", priority: 45, tooltip: "Build in progress" });
      // Simulate build completion
      setTimeout(() => {
        statusbarApi.update("build-task", { label: "$(check) Build succeeded" });
        notificationApi.show({ type: "success", message: "Build completed successfully.", duration: 3000 });
        setTimeout(() => statusbarApi.remove("build-task"), 4000);
      }, 2500);
    },
  });
  commandApi.register({
    id: "monacoVanced.runLint",
    label: "Task: Run Lint",
    handler: () => {
      const id = `lint-${Date.now()}`;
      taskApi.enqueue({ id, label: "Lint Project", priority: "normal", cancellable: false });
      statusbarApi.register({ id: "lint-task", label: "$(loading~spin) Linting…", alignment: "left", priority: 44, tooltip: "Lint in progress" });
      setTimeout(() => {
        const markers = monaco.editor.getModelMarkers({});
        const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
        const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length;
        statusbarApi.update("lint-task", { label: errors > 0 ? `$(error) ${errors} errors` : "$(check) Lint clean" });
        notificationApi.show({ type: errors > 0 ? "warning" : "success", message: `Lint: ${errors} errors, ${warnings} warnings`, duration: 3000 });
        setTimeout(() => statusbarApi.remove("lint-task"), 4000);
      }, 1500);
    },
  });

  // ── 14. Test — wire test discovery + runner commands ──────
  commandApi.register({
    id: "monacoVanced.runTests",
    label: "Test: Run All Tests",
    handler: () => {
      testApi.runAll();
      statusbarApi.register({ id: "test-run", label: "$(testing-run-icon) Running tests…", alignment: "left", priority: 43, tooltip: "Tests running" });
      const passed = 12 + Math.floor(Math.random() * 5);
      const failed = Math.floor(Math.random() * 3);
      setTimeout(() => {
        statusbarApi.update("test-run", {
          label: failed > 0 ? `$(testing-failed-icon) ${passed} passed, ${failed} failed` : `$(testing-passed-icon) ${passed} passed`,
        });
        notificationApi.show({
          type: failed > 0 ? "warning" : "success",
          message: `Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`,
          duration: 4000,
        });
        setTimeout(() => statusbarApi.remove("test-run"), 6000);
      }, 2000);
    },
  });

  // ── 15. Notebook — register execute command ───────────────
  commandApi.register({
    id: "monacoVanced.notebookExecute",
    label: "Notebook: Execute Active Cell",
    handler: () => {
      eventBus.emit(NotebookEvents.CellExecuteStart, { docId: "demo-doc", cellId: "demo-cell-1" });
      notificationApi.show({ type: "info", message: "Executing notebook cell…", duration: 2000 });
      setTimeout(() => {
        eventBus.emit(NotebookEvents.CellExecuteComplete, { docId: "demo-doc", cellId: "demo-cell-1", outputs: [{ type: "text", data: "Cell executed successfully" }] });
      }, 500);
    },
  });

  // ── 15b. AI — command palette commands ─────────────────────
  commandApi.register({
    id: "monacoVanced.aiExplain",
    label: "AI: Explain Selected Code",
    handler: () => eventBus.emit(AiEvents.Explain, {}),
  });
  commandApi.register({
    id: "monacoVanced.aiGenerate",
    label: "AI: Generate Code at Cursor",
    handler: () => eventBus.emit(AiEvents.Generate, {}),
  });
  commandApi.register({
    id: "monacoVanced.aiFix",
    label: "AI: Fix Selected Code",
    handler: () => eventBus.emit(AiEvents.Fix, {}),
  });
  commandApi.register({
    id: "monacoVanced.aiChat",
    label: "AI: Ask a Question",
    handler: async () => {
      const question = prompt("Ask AI a question:");
      if (!question) return;
      statusbarApi.register({ id: "ai-thinking", label: "$(loading~spin) AI: Thinking…", alignment: "left", priority: 60, tooltip: "AI is thinking" });
      try {
        const res = await aiApi.chat([
          { role: "system", content: "You are a helpful coding assistant." },
          { role: "user", content: question },
        ]);
        statusbarApi.remove("ai-thinking");
        notificationApi.show({ type: "info", message: `AI: ${res.content.slice(0, 400)}`, duration: 10000 });
      } catch {
        statusbarApi.remove("ai-thinking");
        notificationApi.show({ type: "error", message: "AI request failed.", duration: 3000 });
      }
    },
  });
  commandApi.register({
    id: "monacoVanced.aiStatus",
    label: "AI: Show Status",
    handler: () => {
      const status = aiApi.getStatus();
      notificationApi.show({ type: "info", message: `AI Module Status: ${status}`, duration: 3000 });
    },
  });
  commandApi.register({
    id: "monacoVanced.toggleCopilot",
    label: "Copilot: Toggle Chat Panel",
    handler: () => eventBus.emit("copilot:toggle", {}),
  });

  // ── 16. AI Agent — register demo actions ──────────────────
  agentApi.registerAction("explain-code", async (_input, _ctx) => {
    const sel = ide.editor.getModel()?.getValueInRange(ide.editor.getSelection()!) ?? "";
    return { result: `Explanation: This code ${sel.length > 50 ? "is a complex block" : "is a short snippet"} containing ${sel.split("\n").length} lines of logic.` };
  });
  agentApi.registerAction("refactor-code", async (_input, _ctx) => {
    return { result: "Refactoring suggestion: Extract this logic into a separate function for better reusability and testability." };
  });
  agentApi.registerAction("generate-docs", async (_input, _ctx) => {
    return { result: "/**\n * Description of the function.\n * @param param - Description\n * @returns Description of return value\n */" };
  });

  // ── 16b. AI Module — mock backend + wire Explain/Generate/Fix ──
  // Mock /api/ai so the REST transport gets a realistic response
  const _origFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/api/ai") && init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const lastMsg = (body.messages as { role: string; content: string }[]).filter((m) => m.role === "user").pop();
      const userContent = lastMsg?.content ?? "";
      // Simulate a realistic AI response
      let reply: string;
      if (userContent.includes("[EXPLAIN]")) {
        const code = userContent.replace("[EXPLAIN]", "").trim();
        const lines = code.split("\n").length;
        reply = `**Explanation**\n\nThis code block contains ${lines} line(s).\n\n` +
          `- It appears to ${code.includes("function") || code.includes("=>") ? "define a function" : code.includes("class") ? "define a class" : code.includes("import") ? "import dependencies" : "perform data operations"}.\n` +
          `- Key concepts: ${code.includes("async") ? "asynchronous execution, " : ""}${code.includes("map") || code.includes("filter") ? "array transformation, " : ""}${code.includes("interface") || code.includes("type ") ? "type definitions, " : ""}control flow.\n` +
          `- Complexity: ${lines > 20 ? "moderate-to-high" : lines > 5 ? "moderate" : "low"}.`;
      } else if (userContent.includes("[GENERATE]")) {
        const intent = userContent.replace("[GENERATE]", "").trim();
        reply = "```typescript\n" +
          `// Generated code based on context\n` +
          `export function generatedHelper(input: string): string {\n` +
          `  // TODO: implement based on: ${intent.slice(0, 80)}\n` +
          `  const result = input.trim();\n` +
          `  return result;\n` +
          `}\n` +
          "```";
      } else if (userContent.includes("[FIX]")) {
        const code = userContent.replace("[FIX]", "").trim();
        reply = `**Suggested Fix**\n\n` +
          `1. ${code.includes("any") ? "Replace \`any\` with a proper type annotation." : "Review error handling at the boundaries."}\n` +
          `2. ${code.includes("==") && !code.includes("===") ? "Use strict equality (===) instead of loose equality (==)." : "Consider adding null checks for optional values."}\n` +
          `3. ${code.includes("console.log") ? "Remove or replace console.log with a proper logger." : "Add return-type annotation for better type safety."}\n\n` +
          "```typescript\n// Fixed version (sample)\n" + code.split("\n").slice(0, 8).join("\n") + "\n```";
      } else {
        // Generic chat response
        reply = `I can help with that! Based on the current editor context:\n\n` +
          `- Language: ${ide.editor.getModel()?.getLanguageId() ?? "unknown"}\n` +
          `- File: ${ide.editor.getModel()?.uri.path ?? "untitled"}\n\n` +
          `Here's my analysis of your request: "${userContent.slice(0, 100)}"…\n\n` +
          `The code looks well-structured. Consider extracting reusable logic into utility functions for better maintainability.`;
      }
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600)); // simulate latency
      return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return _origFetch(input, init);
  };

  // Helper: get selected text or nearby lines
  const _getEditorContext = () => {
    const model = ide.editor.getModel();
    if (!model) return { selection: "", language: "plaintext", file: "untitled" };
    const sel = ide.editor.getSelection();
    const selection = sel && !sel.isEmpty()
      ? model.getValueInRange(sel)
      : model.getValueInRange({
          startLineNumber: Math.max(1, (sel?.startLineNumber ?? 1) - 5),
          startColumn: 1,
          endLineNumber: Math.min(model.getLineCount(), (sel?.endLineNumber ?? 1) + 5),
          endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), (sel?.endLineNumber ?? 1) + 5)),
        });
    return { selection, language: model.getLanguageId(), file: model.uri.path };
  };

  // Handle AI: Explain (from context menu)
  eventBus.on(AiEvents.Explain, async () => {
    const ctx = _getEditorContext();
    statusbarApi.register({ id: "ai-thinking", label: "$(loading~spin) AI: Explaining…", alignment: "left", priority: 60, tooltip: "AI is analyzing code" });
    try {
      const res = await aiApi.chat([
        { role: "system", content: "You are a helpful code explanation assistant." },
        { role: "user", content: `[EXPLAIN] ${ctx.selection}` },
      ]);
      statusbarApi.remove("ai-thinking");
      notificationApi.show({ type: "info", message: `AI Explain:\n${res.content.slice(0, 300)}`, duration: 8000 });
      eventBus.emit(AiEvents.ChatResponse, { action: "explain", content: res.content });
    } catch {
      statusbarApi.remove("ai-thinking");
      notificationApi.show({ type: "error", message: "AI Explain failed.", duration: 3000 });
    }
  });

  // Handle AI: Generate (from context menu)
  eventBus.on(AiEvents.Generate, async () => {
    const ctx = _getEditorContext();
    statusbarApi.register({ id: "ai-thinking", label: "$(loading~spin) AI: Generating…", alignment: "left", priority: 60, tooltip: "AI is generating code" });
    try {
      const res = await aiApi.chat([
        { role: "system", content: `You are a ${ctx.language} code generator.` },
        { role: "user", content: `[GENERATE] Context from ${ctx.file}:\n${ctx.selection}` },
      ]);
      statusbarApi.remove("ai-thinking");
      // Insert generated code at cursor
      const editor = ide.editor;
      const sel = editor.getSelection();
      if (sel) {
        const codeMatch = res.content.match(/```[\w]*\n([\s\S]*?)```/);
        const codeToInsert = codeMatch ? codeMatch[1] : res.content;
        editor.executeEdits("ai-generate", [{ range: sel, text: codeToInsert }]);
        notificationApi.show({ type: "success", message: "AI: Code generated and inserted.", duration: 3000 });
      } else {
        notificationApi.show({ type: "info", message: `AI Generate:\n${res.content.slice(0, 300)}`, duration: 8000 });
      }
      eventBus.emit(AiEvents.ChatResponse, { action: "generate", content: res.content });
    } catch {
      statusbarApi.remove("ai-thinking");
      notificationApi.show({ type: "error", message: "AI Generate failed.", duration: 3000 });
    }
  });

  // Handle AI: Fix (from context menu)
  eventBus.on(AiEvents.Fix, async () => {
    const ctx = _getEditorContext();
    statusbarApi.register({ id: "ai-thinking", label: "$(loading~spin) AI: Fixing…", alignment: "left", priority: 60, tooltip: "AI is suggesting a fix" });
    try {
      const res = await aiApi.chat([
        { role: "system", content: "You are a code review and fix assistant." },
        { role: "user", content: `[FIX] ${ctx.selection}` },
      ]);
      statusbarApi.remove("ai-thinking");
      notificationApi.show({ type: "info", message: `AI Fix:\n${res.content.slice(0, 400)}`, duration: 10000 });
      eventBus.emit(AiEvents.ChatResponse, { action: "fix", content: res.content });
    } catch {
      statusbarApi.remove("ai-thinking");
      notificationApi.show({ type: "error", message: "AI Fix failed.", duration: 3000 });
    }
  });

  // Wire orchestrator default context sources
  aiOrchestrator.wireDefaults({
    getModel: () => ide.editor.getModel(),
    getSelection: () => ide.editor.getSelection(),
  });

  // Track AI status changes in statusbar
  eventBus.on(AiEvents.Status, (p: unknown) => {
    const { state: status } = p as { state: string };
    if (status === "streaming") {
      statusbarApi.register({ id: "ai-status", label: "$(sparkle) AI", alignment: "right", priority: 100, tooltip: "AI is active" });
    } else {
      statusbarApi.remove("ai-status");
    }
  });

  // ── 17. Memory — track editor context for AI ──────────────
  eventBus.on(FileEvents.Open, (p: unknown) => {
    const { uri } = p as { uri: string };
    const model = models.get(uri);
    if (model) {
      memoryApi.store(`file:${uri}`, JSON.stringify({
        language: model.getLanguageId(),
        lines: model.getLineCount(),
        preview: model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: 5, endColumn: 120 }),
      }));
    }
  });

  // ── 18. AI Memory — store conversations for context ───────
  aiMemoryApi.learnFact("project.name", "Monaco Vanced Demo");
  aiMemoryApi.learnFact("project.framework", "React + Monaco Editor");
  aiMemoryApi.learnFact("project.language", "TypeScript");

  // ── 19. Context Fusion — register context sources ─────────
  contextFusionApi.registerSource({
    id: "editor-context",
    priority: 1,
    gather: async () => {
      const model = ide.editor.getModel();
      if (!model) return "";
      const sel = ide.editor.getSelection();
      const content = sel && !sel.isEmpty() ? model.getValueInRange(sel) : model.getValueInRange({ startLineNumber: Math.max(1, (sel?.startLineNumber ?? 1) - 10), startColumn: 1, endLineNumber: (sel?.startLineNumber ?? 1) + 10, endColumn: 200 });
      return `[${model.getLanguageId()}] ${model.uri.path}\n${content}`;
    },
  });
  contextFusionApi.registerSource({
    id: "open-tabs",
    priority: 10,
    gather: async () => {
      const uris = Array.from(models.keys());
      return uris.join("\n");
    },
  });

  // ── 20. Collab — set up mock presence ─────────────────────
  eventBus.emit(CollabEvents.Presence, {
    users: [
      { id: "user-1", name: "You", color: "#4ec9b0", cursor: null },
      { id: "user-2", name: "Alice (viewing)", color: "#ce9178", cursor: { line: 15, column: 8 } },
    ],
  });

  // ── 21. Review — seed mock PR data ────────────────────────
  commandApi.register({
    id: "monacoVanced.showPullRequests",
    label: "Pull Requests: List Open",
    handler: () => {
      const prs = [
        { id: 1, title: "feat: add dark mode toggle", author: "alice", state: "open", reviewers: ["bob"], comments: 3 },
        { id: 2, title: "fix: tab close race condition", author: "bob", state: "open", reviewers: ["alice"], comments: 1 },
        { id: 3, title: "refactor: extract sidebar logic", author: "charlie", state: "open", reviewers: [], comments: 0 },
      ];
      notificationApi.show({
        type: "info",
        message: `${prs.length} open PRs: ${prs.map((pr) => `#${pr.id} ${pr.title}`).join(", ")}`,
        duration: 6000,
      });
    },
  });

  // ── 22. Billing — set demo plan + usage metering ──────────
  billingApi.setPlan({ id: "pro", name: "Pro", quotas: [
    { feature: "ai.requests", limit: 1000, current: 0 },
    { feature: "storage.mb", limit: 5120, current: 0 },
    { feature: "collab.users", limit: 25, current: 0 },
  ] });
  eventBus.on(FileEvents.Save, () => { billingApi.meter("storage.writes", 1); });

  // ── 23. Knowledge Graph — log graph build ─────────────────
  eventBus.on(GraphEvents.Built, (p: unknown) => {
    const { nodes, edges } = p as { nodes: number; edges: number };
    console.log(`[knowledge-graph] Graph built: ${nodes} nodes, ${edges} edges`);
  });

  // ── 24. Crash Recovery — log recovery events ──────────────
  eventBus.on(CrashEvents.RecoveryStart, (p: unknown) => {
    const { files } = p as { files?: number };
    notificationApi.show({ type: "warning", message: `Recovering ${files ?? 0} unsaved files from previous session…`, duration: 5000 });
  });

  // ── 25. Performance — log long tasks + memory warnings ────
  eventBus.on(PerformanceEvents.LongTask, (p: unknown) => {
    const { duration } = p as { duration: number };
    console.warn(`[perf] Long task detected: ${duration}ms`);
  });
  eventBus.on(PerformanceEvents.PerfMemoryWarning, (p: unknown) => {
    const { usedJSHeapSize } = p as { usedJSHeapSize?: number };
    const mb = ((usedJSHeapSize ?? 0) / 1024 / 1024).toFixed(0);
    console.warn(`[perf] Memory warning: ${mb}MB heap used`);
    statusbarApi.register({ id: "mem-warn", label: `$(warning) ${mb}MB`, alignment: "right", priority: 15, tooltip: "High memory usage" });
    setTimeout(() => statusbarApi.remove("mem-warn"), 10000);
  });

  // ── 26. Feature flags — register demo flags ───────────────
  featureFlagApi.register({ key: "ai.enabled", defaultValue: true });
  featureFlagApi.register({ key: "collab.enabled", defaultValue: false });
  featureFlagApi.register({ key: "notebook.enabled", defaultValue: true });
  featureFlagApi.register({ key: "preview.markdown", defaultValue: true });

  // ── 27. Concurrency — dedupe file reads ───────────────────
  const _origOpenFileInEditor = openFileInEditor;
  const _dedupeOpenFile = (uri: string) => concurrencyApi.dedupe(
    `file-open:${uri}`,
    () => {
      _origOpenFileInEditor(uri, DEMO_FILES);
      return Promise.resolve();
    },
  );
  // Expose concurrency for dev console
  (window as Record<string, unknown>).__concurrencyApi = concurrencyApi;

  // ── 28. SaaS Tenant — configure demo tenant ──────────────
  saasTenantApi.setTenant({
    id: "demo-tenant",
    name: "Demo Workspace",
    plan: "pro",
    createdAt: Date.now(),
    config: { features: ["ai", "collab", "extensions"], limits: { maxUsers: 25, maxStorage: 5120 } },
  });

  // ── 29. Streaming — wire for AI response streaming ────────
  (window as Record<string, unknown>).__streamingApi = streamingApi;

  // ── 30. Fallback — register editor fallback chain ─────────
  fallbackApi.register("ai-provider", [
    { id: "openai", check: async () => true, priority: 1 },
    { id: "anthropic", check: async () => true, priority: 2 },
    { id: "local", check: async () => true, priority: 3 },
  ]);

  // ── 31. Resource — track model resources ──────────────────
  for (const [uri] of models) {
    resourceApi.register("monaco-model", `model:${uri}`, { dispose: () => { models.get(uri)?.dispose(); } });
  }

  // ── 32. Worker — expose API for dev console ───────────────
  (window as Record<string, unknown>).__workerApi = workerApi;

  // ── 33. Indexer — index all demo files for symbol search ──
  for (const file of DEMO_FILES) {
    indexerApi.indexFile(file.uri, file.content, file.language).catch(() => {});
  }
  // Re-index on file save
  eventBus.on(FileEvents.Save, (p: unknown) => {
    const { uri, content } = p as { uri: string; content?: string };
    if (content) {
      const file = DEMO_FILES.find((f) => f.uri === uri);
      indexerApi.indexFile(uri, content, file?.language ?? "plaintext").catch(() => {});
    }
  });
  // Log indexer events
  eventBus.on(IndexSymbolEvents.Ready, () => {
    console.log("[indexer] Symbol index ready");
    statusbarApi.register({ id: "indexer-ready", label: "$(symbol-class) Indexed", alignment: "right", priority: 5, tooltip: "Symbol index ready" });
  });
  eventBus.on(IndexSymbolEvents.FileDone, (p: unknown) => {
    const { path, count } = p as { path: string; count: number };
    if (count > 0) console.log(`[indexer] ${path}: ${count} symbols`);
  });

  // ── 34. Context Engine — lazy CDN loading per-language ──
  // Languages are loaded on-demand when a file is opened and LSP is NOT connected.
  // The plugin listens to EditorEvents.LanguageChange internally and fetches
  // only the providers for that specific language from the CDN.

  // Also trigger on initial model (in case a file is already open at boot)
  const initialModel = ide.editor.getModel();
  if (initialModel) {
    contextEngineApi.loadLanguage(initialModel.getLanguageId()).catch(() => {});
  }

  // Trigger on model switch (tab change / new file open)
  ide.editor.onDidChangeModel((e) => {
    if (e.newModelUrl) {
      const model = ide.monaco.editor.getModel(e.newModelUrl);
      if (model) {
        contextEngineApi.loadLanguage(model.getLanguageId()).catch(() => {});
      }
    }
  });

  eventBus.on(ContextEngineEvents.LazyFetchStarted, (p: unknown) => {
    const { language } = p as { language: string };
    console.log(`[context-engine] Fetching CDN packs for ${language}…`);
    statusbarApi.register({ id: "ctx-loading", label: `$(loading~spin) ${language}`, alignment: "right", priority: 3, tooltip: `Loading context: ${language}` });
  });
  eventBus.on(ContextEngineEvents.LazyFetchComplete, (p: unknown) => {
    const { language, providers } = p as { language: string; providers: number };
    console.log(`[context-engine] Loaded ${providers} providers for ${language}`);
    statusbarApi.remove("ctx-loading");
  });
  eventBus.on(ContextEngineEvents.LazyFetchFailed, (p: unknown) => {
    const { language, error } = p as { language: string; error: string };
    console.warn(`[context-engine] CDN fetch failed for ${language}: ${error}`);
    statusbarApi.remove("ctx-loading");
  });
  eventBus.on(ContextEngineEvents.ManifestLoaded, () => {
    console.log("[context-engine] Manifest loaded from CDN");
  });
  eventBus.on(ContextEngineEvents.LanguageRegistered, (p: unknown) => {
    const { id, name } = p as { id: string; name: string };
    console.log(`[context-engine] Registered: ${name} (${id})`);
  });
  eventBus.on(ContextEngineEvents.ProviderLoaded, (p: unknown) => {
    const { language, provider } = p as { language: string; provider: string };
    console.log(`[context-engine] Provider loaded: ${provider} for ${language}`);
  });

  // ── 35. LSP Bridge — monitor connection status ────────────
  eventBus.on(LspEvents.Connected, (p: unknown) => {
    const { languageId } = p as { languageId?: string };
    console.log(`[lsp] Connected${languageId ? ` (${languageId})` : ""}`);
    statusbarApi.register({ id: "lsp-status", label: "$(plug) LSP", alignment: "right", priority: 4, tooltip: `LSP connected${languageId ? `: ${languageId}` : ""}` });
  });
  eventBus.on(LspEvents.Disconnected, () => {
    console.log("[lsp] Disconnected");
    statusbarApi.remove("lsp-status");
  });
  eventBus.on(LspEvents.Reconnecting, () => {
    statusbarApi.update("lsp-status", { label: "$(loading~spin) LSP" });
  });
  eventBus.on(LspEvents.Failed, (p: unknown) => {
    const { error } = p as { error?: string };
    console.warn(`[lsp] Connection failed: ${error ?? "unknown"}`);
    statusbarApi.update("lsp-status", { label: "$(error) LSP" });
    setTimeout(() => statusbarApi.remove("lsp-status"), 5000);
  });
  eventBus.on(LspEvents.Diagnostics, (p: unknown) => {
    const { uri, diagnostics } = p as { uri: string; diagnostics: { severity: number; message: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }[] };
    if (diagnostics.length > 0) {
      console.log(`[lsp] ${diagnostics.length} diagnostics for ${uri}`);
    }
  });

  // ── Expose all module APIs for dev console ────────────────
  (window as Record<string, unknown>).__apis = {
    telemetry: telemetryApi, audit: auditApi, snapshot: snapshotApi,
    predictive: predictiveApi, storage: storageApi, workspace: workspaceApi,
    security: securityApi, policy: policyApi, secrets: secretsApi,
    profiler: profilerApi, task: taskApi, test: testApi, notebook: notebookApi,
    agent: agentApi, memory: memoryApi, aiMemory: aiMemoryApi,
    contextFusion: contextFusionApi, eval: evalApi, intent: intentApi,
    knowledgeGraph: knowledgeGraphApi, rag: ragApi, ai: aiApi,
    collab: collabApi, review: reviewApi, billing: billingApi,
    deepLink: deepLinkApi, embed: embedApi, webview: webviewApi,
    featureFlag: featureFlagApi, crashRecovery: crashRecoveryApi,
    performance: performanceApi, resource: resourceApi,
    concurrency: concurrencyApi, streaming: streamingApi,
    fallback: fallbackApi, worker: workerApi,
    saaTenant: saasTenantApi, apiStability: apiStabilityApi,
    contextEngine: contextEngineApi, realtime: realtimeApi,
    indexer: indexerApi,
  };

  notificationApi.show({
    type: "info",
    message: "Welcome to Monaco Vanced — Right-click for context menu. Ctrl+Shift+P for command palette.",
    duration: 6000,
  });

  // Expose for dev console
  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
