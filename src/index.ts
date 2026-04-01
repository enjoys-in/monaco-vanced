/**
 * monaco-vanced — Plugin-based IDE built on Monaco Editor
 *
 * This is the main entry point for the npm package.
 * Users import plugins and the core engine from here.
 */

// ── Core Engine ──────────────────────────────────────────────
export { PluginEngine } from "@core/plugin-engine";
export { EventBus } from "@core/event-bus";
export { PluginContext } from "@core/plugin-context";
export { createMonacoIDE } from "@core/facade";
export type { CreateIDEOptions, MonacoVancedInstance } from "@core/facade";

// ── Core Types ───────────────────────────────────────────────
export type {
  MonacoPlugin,
  PluginContext as PluginContextType,
  Monaco,
  MonacoEditor,
  IDisposable,
  BootConfig,
} from "@core/types";

// ── Events ───────────────────────────────────────────────────
export * from "@core/events";

// ── Plugins: Infrastructure ──────────────────────────────────
export { createSettingsPlugin } from "@plugins/infrastructure/settings-module";
export type { SettingsModuleAPI, SettingsConfig, SettingSchema } from "@plugins/infrastructure/settings-module/types";

export { createNotificationPlugin } from "@plugins/infrastructure/notification-module";
export type { NotificationModuleAPI, Notification, NotificationConfig, NotificationType, NotificationAction, NotificationPosition, NotificationHistoryEntry } from "@plugins/infrastructure/notification-module/types";

export { createCommandPlugin } from "@plugins/infrastructure/command-module";
export type { CommandModuleAPI, Command, CommandConfig, ExecutionContext, CommandHistoryEntry } from "@plugins/infrastructure/command-module/types";

export { createKeybindingPlugin } from "@plugins/infrastructure/keybinding-module";
export type { KeybindingModuleAPI, Keybinding, KeybindingConfig, ResolvedKeybinding, KeybindingConflict } from "@plugins/infrastructure/keybinding-module/types";

export { createDialogPlugin } from "@plugins/infrastructure/dialog-module";
export type { DialogModuleAPI, DialogConfig, DialogResult, DialogAction, QuickPickItem, QuickPickOptions } from "@plugins/infrastructure/dialog-module/types";

// ── Plugins: Theming ─────────────────────────────────────────
export { createThemePlugin } from "@plugins/theming/theme-module";
export type { ThemeModuleAPI, ThemeConfig, ThemeDefinition, ThemeIndexEntry } from "@plugins/theming/theme-module/types";

export { createIconPlugin } from "@plugins/theming/icon-module";
export type { IconModuleAPI, IconConfig, IconTheme } from "@plugins/theming/icon-module/types";

// ── Plugins: Layout ──────────────────────────────────────────
export { createLayoutPlugin } from "@plugins/layout/layout-module";
export type { LayoutModuleAPI, LayoutPluginOptions, LayoutState, PanelView } from "@plugins/layout/layout-module/types";

export { createHeaderPlugin } from "@plugins/layout/header-module";
export type { HeaderModuleAPI, HeaderConfig, HeaderState, MenuEntry, UserProfile } from "@plugins/layout/header-module/types";

export { createSidebarPlugin } from "@plugins/layout/sidebar-module";
export type { SidebarModuleAPI, SidebarPluginOptions, SidebarState, SidebarViewConfig } from "@plugins/layout/sidebar-module/types";

export { createStatusbarPlugin } from "@plugins/layout/statusbar-module";
export type { StatusbarModuleAPI, StatusbarItem, StatusbarPluginOptions, StatusbarAlignment } from "@plugins/layout/statusbar-module/types";

export { createTitlePlugin } from "@plugins/layout/title-module";
export type { TitleModuleAPI, TitlePluginOptions, TitleState, BreadcrumbSegment } from "@plugins/layout/title-module/types";

export { createNavigationPlugin } from "@plugins/layout/navigation-module";
export type { NavigationModuleAPI, NavigationPluginOptions, NavigationEntry } from "@plugins/layout/navigation-module/types";

export { createUIPlugin } from "@plugins/layout/ui-module";
export type { UIModuleAPI, UIPluginOptions } from "@plugins/layout/ui-module/types";

export { createContextMenuPlugin } from "@plugins/layout/context-menu-module";
export type { ContextMenuModuleAPI, ContextMenuPluginOptions, MenuItem, MenuContext } from "@plugins/layout/context-menu-module/types";

// ── Plugins: Editor ──────────────────────────────────────────
export { createEditorPlugin } from "@plugins/editor/editor-module";
export type { EditorConfig, ModelState } from "@plugins/editor/editor-module/types";

export { createTabsPlugin } from "@plugins/editor/tabs-module";
export type { TabEntry, TabGroup } from "@plugins/editor/tabs-module/types";

export { createDecorationsPlugin } from "@plugins/editor/decorations-module";
export type { DecorationType, DecorationConfig, DecorationEntry } from "@plugins/editor/decorations-module/types";

export { createPreviewPlugin } from "@plugins/editor/preview-module";
export type { PreviewProvider, PreviewFile, PreviewOptions } from "@plugins/editor/preview-module/types";

export { createSnippetsPlugin } from "@plugins/editor/snippets-module";
export type { SnippetDefinition, SnippetConfig } from "@plugins/editor/snippets-module/types";

export { createVirtualizationPlugin } from "@plugins/editor/virtualization-module";
export type { VirtualListConfig, VirtualHandle } from "@plugins/editor/virtualization-module/types";

export { createWebviewPlugin } from "@plugins/editor/webview-module";
export type { WebviewModuleAPI, WebviewPanelOptions, WebviewPanel } from "@plugins/editor/webview-module/types";

// ── Plugins: Extensions ──────────────────────────────────────
export { createExtensionPlugin } from "@plugins/extensions/extension-module";
export { createMarketplacePlugin } from "@plugins/extensions/marketplace-module";
export { createVSIXPlugin } from "@plugins/extensions/vsix-module";

export { createEmbedPlugin } from "@plugins/extensions/embed-module";
export type { EmbedConfig, EmbedModuleAPI } from "@plugins/extensions/embed-module/types";

// ── Plugins: Filesystem ──────────────────────────────────────
export { createFSPlugin } from "@plugins/filesystem/fs-module";
export type { FSAdapter, DirEntry, FileStat } from "@plugins/filesystem/fs-module/types";

export { createSearchPlugin } from "@plugins/filesystem/search-module";

export { createIndexerPlugin } from "@plugins/filesystem/indexer-module";
export type { IndexerModuleAPI, IndexedSymbol, IndexerPluginOptions } from "@plugins/filesystem/indexer-module/types";

export { createWorkspacePlugin } from "@plugins/filesystem/workspace-module";
export type { WorkspaceModuleAPI, WorkspaceRoot, WorkspacePluginOptions } from "@plugins/filesystem/workspace-module/types";

// ── Plugins: SCM ─────────────────────────────────────────────
export { createGitPlugin } from "@plugins/scm/git-module";

export { createCollabPlugin } from "@plugins/scm/collab-module";
export type { CollabModuleAPI, CollabConfig, CollabUser } from "@plugins/scm/collab-module/types";

export { createReviewPlugin } from "@plugins/scm/review-module";
export type { ReviewModuleAPI, ReviewConfig, PullRequest } from "@plugins/scm/review-module/types";

export { createSnapshotPlugin } from "@plugins/scm/snapshot-module";
export type { SnapshotModuleAPI, SnapshotConfig, Snapshot } from "@plugins/scm/snapshot-module/types";

export { createSyncPlugin } from "@plugins/scm/sync-module";
export type { SyncModuleAPI, SyncConfig, SyncStatus } from "@plugins/scm/sync-module/types";

// ── Plugins: Language ────────────────────────────────────────
export { createLanguageDetectionPlugin, detectLanguage } from "@plugins/language/language-detection";

export { createContextPlugin } from "@plugins/language/context-module";
export type { ContextModuleOptions } from "@plugins/language/context-module/types";

export { createDiagnosticsPlugin } from "@plugins/language/diagnostics-module";
export type { Diagnostic, DiagnosticCounts } from "@plugins/language/diagnostics-module/types";

export { createESLintPlugin } from "@plugins/language/eslint-module";
export type { ESLintPluginOptions, LintResult } from "@plugins/language/eslint-module/types";

export { createLanguageConfigPlugin } from "@plugins/language/language-config";

export { createLspBridgePlugin } from "@plugins/language/lsp-bridge-module";
export type { LspBridgePluginOptions, LspConnectionConfig } from "@plugins/language/lsp-bridge-module/types";

export { createMonarchGrammarsPlugin } from "@plugins/language/monarch-grammars";

export { createPrettierPlugin } from "@plugins/language/prettier-module";
export type { PrettierPluginOptions, PrettierConfig } from "@plugins/language/prettier-module/types";

export { createSymbolIndexPlugin } from "@plugins/language/symbol-index-module";
export type { SymbolEntry, SymbolIndex } from "@plugins/language/symbol-index-module/types";

// ── Plugins: Platform ────────────────────────────────────────
export { createConcurrencyPlugin } from "@plugins/platform/concurrency-module";
export type { ConcurrencyModuleAPI, ConcurrencyConfig } from "@plugins/platform/concurrency-module/types";

export { createCrashRecoveryPlugin } from "@plugins/platform/crash-recovery-module";
export type { CrashRecoveryModuleAPI, RecoveryConfig, CrashReport } from "@plugins/platform/crash-recovery-module/types";

export { createFallbackPlugin } from "@plugins/platform/fallback-module";
export type { FallbackModuleAPI, FallbackConfig, FallbackProvider } from "@plugins/platform/fallback-module/types";

export { createFeatureFlagPlugin } from "@plugins/platform/feature-flags-module";
export type { FeatureFlagModuleAPI, FeatureFlagConfig, FlagConfig } from "@plugins/platform/feature-flags-module/types";

export { createPerformancePlugin } from "@plugins/platform/performance-module";
export type { PerformanceModuleAPI, PerformanceConfig, PerfMark } from "@plugins/platform/performance-module/types";

export { createResourcePlugin } from "@plugins/platform/resource-module";
export type { ResourceModuleAPI, ResourceConfig, ResourceEntry } from "@plugins/platform/resource-module/types";

export { createSecurityPlugin } from "@plugins/platform/security-module";
export type { SecurityModuleAPI, SecurityConfig, PermissionManifest } from "@plugins/platform/security-module/types";

export { createStreamingPlugin } from "@plugins/platform/streaming-module";
export type { StreamingModuleAPI, StreamingModuleConfig, StreamHandle } from "@plugins/platform/streaming-module/types";

export { createWorkerPlugin } from "@plugins/platform/worker-module";
export type { WorkerModuleAPI, WorkerModuleConfig, WorkerTask } from "@plugins/platform/worker-module/types";

// ── Plugins: AI ──────────────────────────────────────────────
export { createAIPlugin } from "@plugins/ai/ai-module";
export type { AIModuleAPI, AIPluginOptions, ChatMessage } from "@plugins/ai/ai-module/types";

export { createAgentPlugin } from "@plugins/ai/agent-module";
export type { AgentModuleAPI, AgentConfig, AgentTask } from "@plugins/ai/agent-module/types";

export { createAIMemoryPlugin } from "@plugins/ai/ai-memory-module";
export type { AIMemoryModuleAPI, AIMemoryConfig, Conversation } from "@plugins/ai/ai-memory-module/types";

export { createContextFusionPlugin } from "@plugins/ai/context-fusion-module";
export type { ContextFusionAPI, FusionConfig, FusionResult } from "@plugins/ai/context-fusion-module/types";

export { createEvalPlugin } from "@plugins/ai/eval-module";
export type { EvalModuleAPI, EvalConfig, EvalScore } from "@plugins/ai/eval-module/types";

export { createIntentPlugin } from "@plugins/ai/intent-module";
export type { IntentModuleAPI, IntentConfig, IntentSignal } from "@plugins/ai/intent-module/types";

export { createKnowledgeGraphPlugin } from "@plugins/ai/knowledge-graph-module";
export type { KnowledgeGraphAPI, KnowledgeGraphConfig, GraphNode } from "@plugins/ai/knowledge-graph-module/types";

export { createMemoryPlugin } from "@plugins/ai/memory-module";
export type { MemoryModuleAPI, MemoryPluginOptions, MemoryEntry } from "@plugins/ai/memory-module/types";

export { createPredictivePlugin } from "@plugins/ai/predictive-module";
export type { PredictiveModuleAPI, PredictiveConfig, PredictionRecord } from "@plugins/ai/predictive-module/types";

export { createRAGPlugin } from "@plugins/ai/rag-module";
export type { RAGModuleAPI, RAGPluginOptions, RetrievalResult } from "@plugins/ai/rag-module/types";

// ── Plugins: Devtools ────────────────────────────────────────
export { createTerminalPlugin } from "@plugins/devtools/terminal-module";
export { createDebugPlugin } from "@plugins/devtools/debugger-module";

export { createNotebookPlugin } from "@plugins/devtools/notebook-module";
export type { NotebookModuleAPI, KernelConfig, NotebookDocument } from "@plugins/devtools/notebook-module/types";

export { createProfilerPlugin } from "@plugins/devtools/profiler-module";
export type { ProfilerModuleAPI, ProfilerConfig, FlameNode } from "@plugins/devtools/profiler-module/types";

export { createTaskPlugin } from "@plugins/devtools/task-module";
export type { TaskModuleAPI, TaskConfig, BackgroundTask } from "@plugins/devtools/task-module/types";

export { createTestPlugin } from "@plugins/devtools/test-module";
export type { TestModuleAPI, TestConfig, TestItem, TestSuite } from "@plugins/devtools/test-module/types";

// ── Plugins: Infrastructure (extras) ─────────────────────────
export { createDeepLinkPlugin } from "@plugins/infrastructure/deep-link-module";
export type { DeepLinkModuleAPI, DeepLinkConfig } from "@plugins/infrastructure/deep-link-module/types";

export { createStoragePlugin } from "@plugins/infrastructure/storage-module";
export type { StorageModuleAPI, StorageConfig } from "@plugins/infrastructure/storage-module/types";

// ── Plugins: Auth ────────────────────────────────────────────
export { createAuthPlugin } from "@plugins/infrastructure/auth-module";

// ── Plugins: Enterprise ──────────────────────────────────────
export { createAPIStabilityPlugin } from "@plugins/enterprise/api-stability-module";
export type { APIStabilityModuleAPI, APIStabilityConfig } from "@plugins/enterprise/api-stability-module/types";

export { createAuditPlugin } from "@plugins/enterprise/audit-module";
export type { AuditModuleAPI, AuditConfig, AuditEvent } from "@plugins/enterprise/audit-module/types";

export { createBillingPlugin } from "@plugins/enterprise/billing-module";
export type { BillingModuleAPI, BillingConfig, BillingPlan } from "@plugins/enterprise/billing-module/types";

export { createContextEnginePlugin } from "@plugins/enterprise/context-engine";

export { createPolicyPlugin } from "@plugins/enterprise/policy-module";
export type { PolicyModuleAPI, PolicyConfig, PolicyRule } from "@plugins/enterprise/policy-module/types";

export { createRealtimePlugin } from "@plugins/enterprise/realtime-module";
export type { RealtimeModuleAPI, RealtimeConfig, Channel } from "@plugins/enterprise/realtime-module/types";

export { createSaasTenantPlugin } from "@plugins/enterprise/saas-tenant-module";
export type { SaasTenantModuleAPI, SaasTenantConfig, Tenant } from "@plugins/enterprise/saas-tenant-module/types";

export { createSecretsPlugin } from "@plugins/enterprise/secrets-module";
export type { SecretsModuleAPI, SecretsConfig, Secret } from "@plugins/enterprise/secrets-module/types";

export { createTelemetryPlugin } from "@plugins/enterprise/telemetry-module";
export type { TelemetryModuleAPI, TelemetryConfig, Span } from "@plugins/enterprise/telemetry-module/types";
