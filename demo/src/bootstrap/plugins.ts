// ── Plugin Imports + Factory ──────────────────────────────────
// All plugin creation in one place. Returns allPlugins[] + apis bag.

import * as monaco from "monaco-editor";

// ── Infrastructure ─────────────────────────────────────────
import { createSettingsPlugin } from "@enjoys/monaco-vanced/infrastructure/settings-module";
import { createNotificationPlugin } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import { createCommandPlugin } from "@enjoys/monaco-vanced/infrastructure/command-module";
import { createKeybindingPlugin } from "@enjoys/monaco-vanced/infrastructure/keybinding-module";
import { createDialogPlugin } from "@enjoys/monaco-vanced/infrastructure/dialog-module";
import { createAuthPlugin } from "@enjoys/monaco-vanced/infrastructure/auth-module";
import { createDeepLinkPlugin } from "@enjoys/monaco-vanced/infrastructure/deep-link-module";
import { createStoragePlugin } from "@enjoys/monaco-vanced/infrastructure/storage-module";

// ── Theming ────────────────────────────────────────────────
import { createThemePlugin } from "@enjoys/monaco-vanced/theming/theme-module";
import { createIconPlugin } from "@enjoys/monaco-vanced/theming/icon-module";

// ── Layout ─────────────────────────────────────────────────
import { createLayoutPlugin } from "@enjoys/monaco-vanced/layout/layout-module";
import { createHeaderPlugin } from "@enjoys/monaco-vanced/layout/header-module";
import { createSidebarPlugin } from "@enjoys/monaco-vanced/layout/sidebar-module";
import { createStatusbarPlugin } from "@enjoys/monaco-vanced/layout/statusbar-module";
import { createTitlePlugin } from "@enjoys/monaco-vanced/layout/title-module";
import { createNavigationPlugin } from "@enjoys/monaco-vanced/layout/navigation-module";
import { createUIPlugin } from "@enjoys/monaco-vanced/layout/ui-module";
import { createContextMenuPlugin } from "@enjoys/monaco-vanced/layout/context-menu-module";

// ── Editor ─────────────────────────────────────────────────
import { createEditorPlugin } from "@enjoys/monaco-vanced/editor/editor-module";
import { createTabsPlugin } from "@enjoys/monaco-vanced/editor/tabs-module";
import { createDecorationsPlugin } from "@enjoys/monaco-vanced/editor/decorations-module";
import { createPreviewPlugin } from "@enjoys/monaco-vanced/editor/preview-module";
import { createSnippetsPlugin } from "@enjoys/monaco-vanced/editor/snippets-module";
import { createVirtualizationPlugin } from "@enjoys/monaco-vanced/editor/virtualization-module";
import { createWebviewPlugin } from "@enjoys/monaco-vanced/editor/webview-module";

// ── Extensions ─────────────────────────────────────────────
import { createExtensionPlugin } from "@enjoys/monaco-vanced/extensions/extension-module";
import { createMarketplacePlugin } from "@enjoys/monaco-vanced/extensions/marketplace-module";
import { createVSIXPlugin } from "@enjoys/monaco-vanced/extensions/vsix-module";
import { createEmbedPlugin } from "@enjoys/monaco-vanced/extensions/embed-module";

// ── Filesystem ─────────────────────────────────────────────
import { createFSPlugin } from "@enjoys/monaco-vanced/filesystem/fs-module";
import type { FSAdapter, DirEntry } from "@enjoys/monaco-vanced/filesystem/fs-module";
import { createSearchPlugin } from "@enjoys/monaco-vanced/filesystem/search-module";
import { createIndexerPlugin } from "@enjoys/monaco-vanced/filesystem/indexer-module";
import { createWorkspacePlugin } from "@enjoys/monaco-vanced/filesystem/workspace-module";

// ── SCM ────────────────────────────────────────────────────
import { createGitPlugin } from "@enjoys/monaco-vanced/scm/git-module";
import { createCollabPlugin } from "@enjoys/monaco-vanced/scm/collab-module";
import { createReviewPlugin } from "@enjoys/monaco-vanced/scm/review-module";
import { createSnapshotPlugin } from "@enjoys/monaco-vanced/scm/snapshot-module";
import { createSyncPlugin } from "@enjoys/monaco-vanced/scm/sync-module";

// ── Language ───────────────────────────────────────────────
import { createLanguageDetectionPlugin } from "@enjoys/monaco-vanced/language/language-detection";
import { createDiagnosticsPlugin } from "@enjoys/monaco-vanced/language/diagnostics-module";
import { createESLintPlugin } from "@enjoys/monaco-vanced/language/eslint-module";
import { createLanguageConfigPlugin } from "@enjoys/monaco-vanced/language/language-config";
import { createLspBridgePlugin } from "@enjoys/monaco-vanced/language/lsp-bridge-module";
import { createMonarchGrammarsPlugin } from "@enjoys/monaco-vanced/language/monarch-grammars";
import { createPrettierPlugin } from "@enjoys/monaco-vanced/language/prettier-module";
import { createSymbolIndexPlugin } from "@enjoys/monaco-vanced/language/symbol-index-module";

// ── Platform ───────────────────────────────────────────────
import { createConcurrencyPlugin } from "@enjoys/monaco-vanced/platform/concurrency-module";
import { createCrashRecoveryPlugin } from "@enjoys/monaco-vanced/platform/crash-recovery-module";
import { createFallbackPlugin } from "@enjoys/monaco-vanced/platform/fallback-module";
import { createFeatureFlagPlugin } from "@enjoys/monaco-vanced/platform/feature-flags-module";
import { createPerformancePlugin } from "@enjoys/monaco-vanced/platform/performance-module";
import { createResourcePlugin } from "@enjoys/monaco-vanced/platform/resource-module";
import { createSecurityPlugin } from "@enjoys/monaco-vanced/platform/security-module";
import { createStreamingPlugin } from "@enjoys/monaco-vanced/platform/streaming-module";
import { createWorkerPlugin } from "@enjoys/monaco-vanced/platform/worker-module";

// ── AI ─────────────────────────────────────────────────────
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

// ── Devtools ───────────────────────────────────────────────
import { createTerminalPlugin } from "@enjoys/monaco-vanced/devtools/terminal-module";
import { createDebugPlugin } from "@enjoys/monaco-vanced/devtools/debugger-module";
import { createNotebookPlugin } from "@enjoys/monaco-vanced/devtools/notebook-module";
import { createProfilerPlugin } from "@enjoys/monaco-vanced/devtools/profiler-module";
import { createTaskPlugin } from "@enjoys/monaco-vanced/devtools/task-module";
import { createTestPlugin } from "@enjoys/monaco-vanced/devtools/test-module";

// ── Enterprise ─────────────────────────────────────────────
import { createAPIStabilityPlugin } from "@enjoys/monaco-vanced/enterprise/api-stability-module";
import { createAuditPlugin } from "@enjoys/monaco-vanced/enterprise/audit-module";
import { createBillingPlugin } from "@enjoys/monaco-vanced/enterprise/billing-module";
import { createContextEnginePlugin } from "@enjoys/monaco-vanced/enterprise/context-engine";
import { createPolicyPlugin } from "@enjoys/monaco-vanced/enterprise/policy-module";
import { createRealtimePlugin } from "@enjoys/monaco-vanced/enterprise/realtime-module";
import { createSaasTenantPlugin } from "@enjoys/monaco-vanced/enterprise/saas-tenant-module";
import { createSecretsPlugin } from "@enjoys/monaco-vanced/enterprise/secrets-module";
import { createTelemetryPlugin } from "@enjoys/monaco-vanced/enterprise/telemetry-module";

import type { WireframeAPIs } from "../wireframe";

// ── In-memory FS adapter ───────────────────────────────────

export const memoryStore = new Map<string, Uint8Array>();
export const encoder = new TextEncoder();

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

// ══════════════════════════════════════════════════════════════
// Create all plugin instances
// ══════════════════════════════════════════════════════════════

// Infrastructure
const { plugin: commandPlugin, api: commandApi } = createCommandPlugin();
const { plugin: keybindingPlugin } = createKeybindingPlugin();
const { plugin: settingsPlugin, api: settingsApi } = createSettingsPlugin();
const { plugin: notificationPlugin, api: notificationApi } = createNotificationPlugin();
const { plugin: dialogPlugin, api: dialogApi } = createDialogPlugin();
const { plugin: authPlugin, api: authApi } = createAuthPlugin({
  providers: ["github", "google"],
  tokenStorageKey: "monaco-vanced-auth",
});
const { plugin: deepLinkPlugin, api: deepLinkApi } = createDeepLinkPlugin();
const { plugin: storagePlugin, api: storageApi } = createStoragePlugin();

// Theming
const { plugin: themePlugin, api: themeApi } = createThemePlugin({
  persistKey: "monaco-vanced:colorTheme",
  defaultTheme: "vs",
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
const decorationsPlugin = createDecorationsPlugin();
const previewPlugin = createPreviewPlugin();
const snippetsPlugin = createSnippetsPlugin();
const virtualizationPlugin = createVirtualizationPlugin();
const { plugin: webviewPlugin, api: webviewApi } = createWebviewPlugin();

// Extensions
const { plugin: extensionPlugin, api: extensionApi } = createExtensionPlugin();
const { plugin: marketplacePlugin, api: marketplaceApi } = createMarketplacePlugin();
const { plugin: vsixPlugin, api: vsixApi } = createVSIXPlugin();
const { plugin: embedPlugin, api: embedApi } = createEmbedPlugin();

// Filesystem
const fsPlugin = createFSPlugin({ adapter: inMemoryAdapter });
const { plugin: searchPlugin } = createSearchPlugin();
const { plugin: indexerPlugin, api: indexerApi } = createIndexerPlugin();
const { plugin: workspacePlugin, api: workspaceApi } = createWorkspacePlugin();

// SCM
const { plugin: gitPlugin } = createGitPlugin();
const { plugin: collabPlugin, api: collabApi } = createCollabPlugin();
const { plugin: reviewPlugin, api: reviewApi } = createReviewPlugin({ provider: "github" });
const { plugin: snapshotPlugin, api: snapshotApi } = createSnapshotPlugin();
const { plugin: syncPlugin, api: syncApi } = createSyncPlugin();

// Language
const languageDetectionPlugin = createLanguageDetectionPlugin();
 
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

// Devtools
const { plugin: terminalPlugin } = createTerminalPlugin();
const { plugin: debugPlugin } = createDebugPlugin();
const { plugin: notebookPlugin, api: notebookApi } = createNotebookPlugin();
const { plugin: profilerPlugin, api: profilerApi } = createProfilerPlugin();
const { plugin: taskPlugin, api: taskApi } = createTaskPlugin();
const { plugin: testPlugin, api: testApi } = createTestPlugin();

// Enterprise
const { plugin: apiStabilityPlugin, api: apiStabilityApi } = createAPIStabilityPlugin();
const { plugin: auditPlugin, api: auditApi } = createAuditPlugin();
const { plugin: billingPlugin, api: billingApi } = createBillingPlugin();
const { plugin: contextEnginePlugin, api: contextEngineApi } = createContextEnginePlugin({
  lazyLoad: true,
  lspBaseUrl: "https://monaco-lsp-hub.onrender.com",
});
const { plugin: policyPlugin, api: policyApi } = createPolicyPlugin();
const { plugin: realtimePlugin, api: realtimeApi } = createRealtimePlugin();
const { plugin: saasTenantPlugin, api: saasTenantApi } = createSaasTenantPlugin();
const { plugin: secretsPlugin, api: secretsApi } = createSecretsPlugin();
const { plugin: telemetryPlugin, api: telemetryApi } = createTelemetryPlugin();

// ══════════════════════════════════════════════════════════════
// Plugin list + API collections
// ══════════════════════════════════════════════════════════════

export const allPlugins = [
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
  languageDetectionPlugin,  diagnosticsPlugin, eslintPlugin,
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

export const wireframeApis: WireframeAPIs = {
  header: headerApi, sidebar: sidebarApi, statusbar: statusbarApi,
  title: titleApi, layout: layoutApi, notification: notificationApi,
  command: commandApi, contextMenu: contextMenuApi, dialog: dialogApi,
};

// All module APIs — used by wiring functions and exposed to dev console
export const pluginApis = {
  command: commandApi, settings: settingsApi, notification: notificationApi,
  dialog: dialogApi, auth: authApi, deepLink: deepLinkApi, storage: storageApi,
  theme: themeApi, icon: iconApi,
  layout: layoutApi, header: headerApi, sidebar: sidebarApi, statusbar: statusbarApi,
  title: titleApi, contextMenu: contextMenuApi,
  webview: webviewApi,
  extension: extensionApi, marketplace: marketplaceApi, vsix: vsixApi, embed: embedApi,
  indexer: indexerApi, workspace: workspaceApi,
  collab: collabApi, review: reviewApi, snapshot: snapshotApi, sync: syncApi,
  concurrency: concurrencyApi, crashRecovery: crashRecoveryApi, fallback: fallbackApi,
  featureFlag: featureFlagApi, performance: performanceApi, resource: resourceApi,
  security: securityApi, streaming: streamingApi, worker: workerApi,
  ai: aiApi, aiOrchestrator, agent: agentApi, aiMemory: aiMemoryApi,
  contextFusion: contextFusionApi, eval: evalApi, intent: intentApi,
  knowledgeGraph: knowledgeGraphApi, memory: memoryApi, predictive: predictiveApi, rag: ragApi,
  notebook: notebookApi, profiler: profilerApi, task: taskApi, test: testApi,
  apiStability: apiStabilityApi, audit: auditApi, billing: billingApi,
  contextEngine: contextEngineApi, policy: policyApi, realtime: realtimeApi,
  saasTenant: saasTenantApi, secrets: secretsApi, telemetry: telemetryApi,
} as const;

export type PluginApis = typeof pluginApis;
