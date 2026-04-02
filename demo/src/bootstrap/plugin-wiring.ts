// ── Plugin Wiring ─────────────────────────────────────────────
// Wires all 35+ plugin modules into the demo: decorations, snippets,
// telemetry, AI, collab, review, indexer, context engine, LSP, etc.

import * as monaco from "monaco-editor";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";
import {
  FileEvents, SettingsEvents, TabEvents, ExtensionEvents,
  DecorationEvents, SnippetEvents, ProfilerEvents, TaskEvents, TestEvents,
  CrashEvents, SecurityEvents, AuditEvents, CollabEvents,
  NotebookEvents, GraphEvents, PredictEvents, PerformanceEvents, AiEvents,
  IndexSymbolEvents, LspEvents, ContextEngineEvents, DialogEvents,
} from "@enjoys/monaco-vanced/core/events";
import type { VirtualFile } from "../wireframe";
import type { PluginApis } from "./plugins";

export interface PluginWiringDeps {
  ide: MonacoVancedInstance;
  eventBus: EventBus;
  models: Map<string, monaco.editor.ITextModel>;
  DEMO_FILES: VirtualFile[];
  apis: PluginApis;
}

export function wirePlugins(deps: PluginWiringDeps) {
  const { ide, eventBus, models, DEMO_FILES, apis } = deps;

  // ── 1. Decorations — highlight TODO/FIXME/HACK ───────────
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
    if (ranges.length > 0) eventBus.emit(DecorationEvents.Apply, { owner: "todo-highlights", decorations: ranges });
  }
  ide.editor.onDidChangeModel(() => applyTodoDecorations());
  ide.editor.onDidChangeModelContent(() => applyTodoDecorations());
  applyTodoDecorations();

  // ── 2. Snippets ──────────────────────────────────────────
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
    if (s.language === "typescript") eventBus.emit(SnippetEvents.Add, { ...s, language: "javascript" });
    else if (s.language === "typescriptreact") eventBus.emit(SnippetEvents.Add, { ...s, language: "javascriptreact" });
  }

  // ── 3. Telemetry ─────────────────────────────────────────
  {
    const trackOpen = (p: unknown) => { apis.telemetry.recordEvent("file.open", { uri: (p as { uri: string }).uri }); };
    const trackSave = (p: unknown) => { apis.telemetry.recordEvent("file.save", { uri: (p as { uri: string }).uri }); };
    const trackClose = (p: unknown) => { apis.telemetry.recordEvent("tab.close", { uri: (p as { uri: string }).uri }); };
    eventBus.on(FileEvents.Open, trackOpen);
    eventBus.on(FileEvents.Save, trackSave);
    eventBus.on(TabEvents.Close, trackClose);
  }

  // ── 4. Audit ─────────────────────────────────────────────
  {
    const logAudit = (action: string) => (p: unknown) => {
      const { uri } = (p ?? {}) as { uri?: string };
      apis.audit.log({ action, resource: uri ?? "unknown", actor: "demo-user" });
    };
    eventBus.on(FileEvents.Open, logAudit("file.open"));
    eventBus.on(FileEvents.Save, logAudit("file.save"));
    eventBus.on(FileEvents.Deleted, logAudit("file.delete"));
    eventBus.on(FileEvents.Created, logAudit("file.create"));
    eventBus.on(SettingsEvents.UIOpen, logAudit("settings.open"));
    eventBus.on(AuditEvents.Logged, logAudit("auth.login"));
  }

  // ── 5. Snapshot ──────────────────────────────────────────
  eventBus.on(FileEvents.Save, (p: unknown) => {
    const { uri } = p as { uri: string };
    const model = models.get(uri);
    if (model) apis.snapshot.capture(uri, model.getValue());
  });

  // ── 6. Predictive ────────────────────────────────────────
  eventBus.on(FileEvents.Open, (p: unknown) => { apis.predictive.recordFile((p as { uri: string }).uri); });

  // ── 7. Storage ───────────────────────────────────────────
  eventBus.on(SettingsEvents.Change, (p: unknown) => {
    const { key, value, _src } = p as { key?: string; value: unknown; _src?: string };
    if (key && _src !== "storage-sync") apis.storage.set(`settings:${key}`, JSON.stringify(value)).catch(() => {});
  });

  // ── 8. Workspace ─────────────────────────────────────────
  apis.workspace.addRoot("file:///demo-project", "demo-project");

  // ── 9. Security ──────────────────────────────────────────
  eventBus.on(ExtensionEvents.Enabled, (p: unknown) => {
    const { id } = p as { id: string };
    if (!apis.security.checkPermission(id, "fs.read")) console.warn(`[security] Plugin "${id}" lacks fs.read permission`);
  });

  // ── 10. Policy ───────────────────────────────────────────
  apis.policy.addPolicy({
    id: "default-access", name: "Default Access", roles: ["editor"],
    rules: [
      { resource: "file:*", actions: ["read"], effect: "allow" },
      { resource: "file:*", actions: ["write"], effect: "allow" },
      { resource: "settings:*", actions: ["read"], effect: "allow" },
      { resource: "settings:*", actions: ["write"], effect: "allow" },
      { resource: "terminal:*", actions: ["execute"], effect: "allow" },
    ],
  });
  apis.policy.createRole({ id: "editor", name: "Editor", policies: ["default-access"] });
  apis.policy.assignRole("demo-user", "editor");

  // ── 11. Secrets ──────────────────────────────────────────
  apis.secrets.set("github-token", "ghp_demo_xxx_not_real").catch(() => {});
  apis.secrets.set("openai-key", "sk-demo_xxx_not_real").catch(() => {});

  // ── 12. Profiler ─────────────────────────────────────────
  let _profiling = false;
  apis.command.register({
    id: "monacoVanced.startProfiler", label: "Developer: Start Performance Profile",
    handler: () => {
      if (_profiling) return;
      _profiling = true;
      eventBus.emit(ProfilerEvents.Start, {});
      apis.statusbar.register({ id: "profiler", label: "$(flame) Profiling…", alignment: "left", priority: 50, tooltip: "Performance profiler running" });
      apis.notification.show({ type: "info", message: "Profiler started. Use 'Stop Performance Profile' to finish.", duration: 3000 });
    },
  });
  apis.command.register({
    id: "monacoVanced.stopProfiler", label: "Developer: Stop Performance Profile",
    handler: () => {
      if (!_profiling) return;
      _profiling = false;
      eventBus.emit(ProfilerEvents.Stop, {});
      apis.statusbar.update("profiler", { label: "$(check) Profile captured" });
      setTimeout(() => apis.statusbar.remove("profiler"), 4000);
      apis.notification.show({ type: "success", message: "Profile captured. Check Performance tab in DevTools.", duration: 4000 });
    },
  });

  // ── 13. Task ─────────────────────────────────────────────
  apis.command.register({
    id: "monacoVanced.runBuild", label: "Task: Run Build",
    handler: () => {
      apis.task.enqueue({ id: `build-${Date.now()}`, label: "Build Project", priority: "high", cancellable: false });
      apis.statusbar.register({ id: "build-task", label: "$(loading~spin) Building…", alignment: "left", priority: 45, tooltip: "Build in progress" });
      setTimeout(() => {
        apis.statusbar.update("build-task", { label: "$(check) Build succeeded" });
        apis.notification.show({ type: "success", message: "Build completed successfully.", duration: 3000 });
        setTimeout(() => apis.statusbar.remove("build-task"), 4000);
      }, 2500);
    },
  });
  apis.command.register({
    id: "monacoVanced.runLint", label: "Task: Run Lint",
    handler: () => {
      apis.task.enqueue({ id: `lint-${Date.now()}`, label: "Lint Project", priority: "normal", cancellable: false });
      apis.statusbar.register({ id: "lint-task", label: "$(loading~spin) Linting…", alignment: "left", priority: 44, tooltip: "Lint in progress" });
      setTimeout(() => {
        const markers = monaco.editor.getModelMarkers({});
        const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
        const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length;
        apis.statusbar.update("lint-task", { label: errors > 0 ? `$(error) ${errors} errors` : "$(check) Lint clean" });
        apis.notification.show({ type: errors > 0 ? "warning" : "success", message: `Lint: ${errors} errors, ${warnings} warnings`, duration: 3000 });
        setTimeout(() => apis.statusbar.remove("lint-task"), 4000);
      }, 1500);
    },
  });

  // ── 14. Test ─────────────────────────────────────────────
  apis.command.register({
    id: "monacoVanced.runTests", label: "Test: Run All Tests",
    handler: () => {
      apis.test.runAll();
      apis.statusbar.register({ id: "test-run", label: "$(testing-run-icon) Running tests…", alignment: "left", priority: 43, tooltip: "Tests running" });
      const passed = 12 + Math.floor(Math.random() * 5);
      const failed = Math.floor(Math.random() * 3);
      setTimeout(() => {
        apis.statusbar.update("test-run", { label: failed > 0 ? `$(testing-failed-icon) ${passed} passed, ${failed} failed` : `$(testing-passed-icon) ${passed} passed` });
        apis.notification.show({ type: failed > 0 ? "warning" : "success", message: `Tests: ${passed} passed, ${failed} failed, ${passed + failed} total`, duration: 4000 });
        setTimeout(() => apis.statusbar.remove("test-run"), 6000);
      }, 2000);
    },
  });

  // ── 15. Notebook ─────────────────────────────────────────
  apis.command.register({
    id: "monacoVanced.notebookExecute", label: "Notebook: Execute Active Cell",
    handler: () => {
      eventBus.emit(NotebookEvents.CellExecuteStart, { docId: "demo-doc", cellId: "demo-cell-1" });
      apis.notification.show({ type: "info", message: "Executing notebook cell…", duration: 2000 });
      setTimeout(() => {
        eventBus.emit(NotebookEvents.CellExecuteComplete, { docId: "demo-doc", cellId: "demo-cell-1", outputs: [{ type: "text", data: "Cell executed successfully" }] });
      }, 500);
    },
  });

  // ── 16. AI Agent ─────────────────────────────────────────
  apis.agent.registerAction("explain-code", async () => {
    const sel = ide.editor.getModel()?.getValueInRange(ide.editor.getSelection()!) ?? "";
    return { result: `Explanation: This code ${sel.length > 50 ? "is a complex block" : "is a short snippet"} containing ${sel.split("\n").length} lines of logic.` };
  });
  apis.agent.registerAction("refactor-code", async () => {
    return { result: "Refactoring suggestion: Extract this logic into a separate function for better reusability and testability." };
  });
  apis.agent.registerAction("generate-docs", async () => {
    return { result: "/**\n * Description of the function.\n * @param param - Description\n * @returns Description of return value\n */" };
  });

  // ── 16b. AI Module — mock backend ────────────────────────
  wireAIMockBackend(ide, eventBus, apis);

  // ── 17. Memory ───────────────────────────────────────────
  eventBus.on(FileEvents.Open, (p: unknown) => {
    const { uri } = p as { uri: string };
    const model = models.get(uri);
    if (model) {
      apis.memory.store(`file:${uri}`, JSON.stringify({
        language: model.getLanguageId(), lines: model.getLineCount(),
        preview: model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: 5, endColumn: 120 }),
      }));
    }
  });

  // ── 18. AI Memory ────────────────────────────────────────
  apis.aiMemory.learnFact("project.name", "Monaco Vanced Demo");
  apis.aiMemory.learnFact("project.framework", "React + Monaco Editor");
  apis.aiMemory.learnFact("project.language", "TypeScript");

  // ── 19. Context Fusion ───────────────────────────────────
  apis.contextFusion.registerSource({
    id: "editor-context", priority: 1,
    gather: async () => {
      const model = ide.editor.getModel();
      if (!model) return "";
      const sel = ide.editor.getSelection();
      const content = sel && !sel.isEmpty() ? model.getValueInRange(sel) : model.getValueInRange({ startLineNumber: Math.max(1, (sel?.startLineNumber ?? 1) - 10), startColumn: 1, endLineNumber: (sel?.startLineNumber ?? 1) + 10, endColumn: 200 });
      return `[${model.getLanguageId()}] ${model.uri.path}\n${content}`;
    },
  });
  apis.contextFusion.registerSource({
    id: "open-tabs", priority: 10,
    gather: async () => Array.from(models.keys()).join("\n"),
  });

  // ── 20. Collab ───────────────────────────────────────────
  eventBus.emit(CollabEvents.Presence, {
    users: [
      { id: "user-1", name: "You", color: "#4ec9b0", cursor: null },
      { id: "user-2", name: "Alice (viewing)", color: "#ce9178", cursor: { line: 15, column: 8 } },
    ],
  });

  // ── 21. Review ───────────────────────────────────────────
  apis.command.register({
    id: "monacoVanced.showPullRequests", label: "Pull Requests: List Open",
    handler: () => {
      const prs = [
        { id: 1, title: "feat: add dark mode toggle", author: "alice", state: "open" },
        { id: 2, title: "fix: tab close race condition", author: "bob", state: "open" },
        { id: 3, title: "refactor: extract sidebar logic", author: "charlie", state: "open" },
      ];
      apis.notification.show({ type: "info", message: `${prs.length} open PRs: ${prs.map((pr) => `#${pr.id} ${pr.title}`).join(", ")}`, duration: 6000 });
    },
  });

  // ── 22. Billing ──────────────────────────────────────────
  apis.billing.setPlan({ id: "pro", name: "Pro", quotas: [
    { feature: "ai.requests", limit: 1000, current: 0 },
    { feature: "storage.mb", limit: 5120, current: 0 },
    { feature: "collab.users", limit: 25, current: 0 },
  ] });
  eventBus.on(FileEvents.Save, () => { apis.billing.meter("storage.writes", 1); });

  // ── 23. Knowledge Graph ──────────────────────────────────
  eventBus.on(GraphEvents.Built, (p: unknown) => {
    const { nodes, edges } = p as { nodes: number; edges: number };
    console.log(`[knowledge-graph] Graph built: ${nodes} nodes, ${edges} edges`);
  });

  // ── 24. Crash Recovery ───────────────────────────────────
  eventBus.on(CrashEvents.RecoveryStart, (p: unknown) => {
    const { files } = p as { files?: number };
    apis.notification.show({ type: "warning", message: `Recovering ${files ?? 0} unsaved files from previous session…`, duration: 5000 });
  });

  // ── 25. Performance ──────────────────────────────────────
  eventBus.on(PerformanceEvents.LongTask, (p: unknown) => { console.warn(`[perf] Long task detected: ${(p as { duration: number }).duration}ms`); });
  eventBus.on(PerformanceEvents.PerfMemoryWarning, (p: unknown) => {
    const mb = (((p as { usedJSHeapSize?: number }).usedJSHeapSize ?? 0) / 1024 / 1024).toFixed(0);
    console.warn(`[perf] Memory warning: ${mb}MB heap used`);
    apis.statusbar.register({ id: "mem-warn", label: `$(warning) ${mb}MB`, alignment: "right", priority: 15, tooltip: "High memory usage" });
    setTimeout(() => apis.statusbar.remove("mem-warn"), 10000);
  });

  // ── 26. Feature flags ────────────────────────────────────
  apis.featureFlag.register({ key: "ai.enabled", defaultValue: true });
  apis.featureFlag.register({ key: "collab.enabled", defaultValue: false });
  apis.featureFlag.register({ key: "notebook.enabled", defaultValue: true });
  apis.featureFlag.register({ key: "preview.markdown", defaultValue: true });

  // ── 27. Concurrency ──────────────────────────────────────
  window.__concurrencyApi = apis.concurrency;

  // ── 28. SaaS Tenant ──────────────────────────────────────
  apis.saasTenant.setTenant({
    id: "demo-tenant", name: "Demo Workspace", plan: "pro", createdAt: Date.now(),
    config: { features: ["ai", "collab", "extensions"], limits: { maxUsers: 25, maxStorage: 5120 } },
  });

  // ── 29. Streaming ────────────────────────────────────────
  window.__streamingApi = apis.streaming;

  // ── 30. Fallback ─────────────────────────────────────────
  apis.fallback.register("ai-provider", [
    { id: "openai", check: async () => true, priority: 1 },
    { id: "anthropic", check: async () => true, priority: 2 },
    { id: "local", check: async () => true, priority: 3 },
  ]);

  // ── 31. Resource ─────────────────────────────────────────
  for (const [uri] of models) {
    apis.resource.register("monaco-model", `model:${uri}`, { dispose: () => { models.get(uri)?.dispose(); } });
  }

  // ── 32. Worker ───────────────────────────────────────────
  window.__workerApi = apis.worker;

  // ── 33. Indexer ──────────────────────────────────────────
  for (const file of DEMO_FILES) apis.indexer.indexFile(file.uri, file.content, file.language).catch(() => {});
  eventBus.on(FileEvents.Save, (p: unknown) => {
    const { uri, content } = p as { uri: string; content?: string };
    if (content) {
      const file = DEMO_FILES.find((f) => f.uri === uri);
      apis.indexer.indexFile(uri, content, file?.language ?? "plaintext").catch(() => {});
    }
  });
  eventBus.on(IndexSymbolEvents.Ready, () => {
    console.log("[indexer] Symbol index ready");
    apis.statusbar.register({ id: "indexer-ready", label: "$(symbol-class) Indexed", alignment: "right", priority: 5, tooltip: "Symbol index ready" });
  });
  eventBus.on(IndexSymbolEvents.FileDone, (p: unknown) => {
    const { path, count } = p as { path: string; count: number };
    if (count > 0) console.log(`[indexer] ${path}: ${count} symbols`);
  });

  // ── 34. Context Engine — lazy CDN loading ────────────────
  eventBus.on(ContextEngineEvents.LazyFetchStarted, (p: unknown) => {
    const { language } = p as { language: string };
    console.log(`[context-engine] Fetching CDN packs for ${language}…`);
    apis.statusbar.register({ id: "ctx-loading", label: `$(loading~spin) ${language}`, alignment: "right", priority: 3, tooltip: `Loading context: ${language}` });
  });
  eventBus.on(ContextEngineEvents.LazyFetchComplete, (p: unknown) => {
    const { language, providers } = p as { language: string; providers: number };
    console.log(`[context-engine] Loaded ${providers} providers for ${language}`);
    apis.statusbar.remove("ctx-loading");
  });
  eventBus.on(ContextEngineEvents.LazyFetchFailed, (p: unknown) => {
    const { language, error } = p as { language: string; error: string };
    console.warn(`[context-engine] CDN fetch failed for ${language}: ${error}`);
    apis.statusbar.remove("ctx-loading");
    eventBus.emit(DialogEvents.Show, {
      title: "Context Engine — Load Failed", severity: "warning",
      body: [`Failed to fetch language intelligence packs for "${language}" from CDN.`, `Error: ${error}`, "IntelliSense features may be limited for this language."],
      type: "confirm", actions: [{ id: "ok", label: "OK", primary: true }],
    });
  });
  eventBus.on(ContextEngineEvents.ManifestLoaded, () => { console.log("[context-engine] Manifest loaded from CDN"); });
  eventBus.on(ContextEngineEvents.LanguageRegistered, (p: unknown) => { const { id, name } = p as { id: string; name: string }; console.log(`[context-engine] Registered: ${name} (${id})`); });
  eventBus.on(ContextEngineEvents.ProviderLoaded, (p: unknown) => { const { language, provider } = p as { language: string; provider: string }; console.log(`[context-engine] Provider loaded: ${provider} for ${language}`); });

  // ── 35. LSP Bridge ───────────────────────────────────────
  eventBus.on(LspEvents.HealthCheckOk, () => {
    console.log("[lsp] Health check OK — using LSP for language features");
    apis.statusbar.register({ id: "lsp-health", label: "$(check) LSP", alignment: "right", priority: 4, tooltip: "LSP server healthy" });
  });
  eventBus.on(LspEvents.HealthCheckFailed, () => {
    console.warn("[lsp] Health check failed — falling back to context engine CDN");
    apis.statusbar.register({ id: "lsp-health", label: "$(warning) LSP offline", alignment: "right", priority: 4, tooltip: "LSP unreachable — using CDN fallback" });
    setTimeout(() => apis.statusbar.remove("lsp-health"), 8000);
  });
  eventBus.on(LspEvents.Connected, (p: unknown) => {
    const { languageId } = p as { languageId?: string };
    console.log(`[lsp] Connected${languageId ? ` (${languageId})` : ""}`);
    apis.statusbar.register({ id: "lsp-status", label: "$(plug) LSP", alignment: "right", priority: 4, tooltip: `LSP connected${languageId ? `: ${languageId}` : ""}` });
  });
  eventBus.on(LspEvents.Disconnected, () => { console.log("[lsp] Disconnected"); apis.statusbar.remove("lsp-status"); });
  eventBus.on(LspEvents.Reconnecting, () => { apis.statusbar.update("lsp-status", { label: "$(loading~spin) LSP" }); });
  eventBus.on(LspEvents.Failed, (p: unknown) => {
    const { error } = p as { error?: string };
    console.warn(`[lsp] Connection failed: ${error ?? "unknown"}`);
    apis.statusbar.update("lsp-status", { label: "$(error) LSP" });
    setTimeout(() => apis.statusbar.remove("lsp-status"), 5000);
    eventBus.emit(DialogEvents.Show, {
      title: "LSP Connection Failed", severity: "error",
      body: ["The editor could not connect to the Language Server.", `Error: ${error ?? "Connection refused or timed out."}`, "Language features will be unavailable until the server is reachable."],
      type: "confirm", actions: [{ id: "ok", label: "OK", primary: true }],
    });
  });
  eventBus.on(LspEvents.Diagnostics, (p: unknown) => {
    const { uri, diagnostics } = p as { uri: string; diagnostics: { severity: number; message: string }[] };
    if (diagnostics.length > 0) console.log(`[lsp] ${diagnostics.length} diagnostics for ${uri}`);
  });

  // ── Startup settings + plugin enable/disable ─────────────
  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown };
    const settingId = p.id ?? p.key ?? "";
    if (settingId === "workbench.startupEditor") {
      try { localStorage.setItem("monaco-vanced:startupEditor", String(p.value)); } catch { /* ignore */ }
    }
  });
  eventBus.on(ExtensionEvents.Enabled, (p: unknown) => { console.log("[monaco-vanced] Plugin enabled:", (p as { id: string }).id); });
  eventBus.on(ExtensionEvents.Disabled, (p: unknown) => { console.log("[monaco-vanced] Plugin disabled:", (p as { id: string }).id); });
}

// ── AI mock backend (fetch interceptor + event handlers) ─────

function wireAIMockBackend(ide: MonacoVancedInstance, eventBus: EventBus, apis: PluginApis) {
  const _origFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.endsWith("/api/ai") && init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const lastMsg = (body.messages as { role: string; content: string }[]).filter((m) => m.role === "user").pop();
      const userContent = lastMsg?.content ?? "";
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
        reply = "```typescript\n" + `// Generated code based on context\nexport function generatedHelper(input: string): string {\n  // TODO: implement based on: ${intent.slice(0, 80)}\n  const result = input.trim();\n  return result;\n}\n` + "```";
      } else if (userContent.includes("[FIX]")) {
        const code = userContent.replace("[FIX]", "").trim();
        reply = `**Suggested Fix**\n\n` +
          `1. ${code.includes("any") ? "Replace \\`any\\` with a proper type annotation." : "Review error handling at the boundaries."}\n` +
          `2. ${code.includes("==") && !code.includes("===") ? "Use strict equality (===)." : "Add null checks for optional values."}\n` +
          `3. ${code.includes("console.log") ? "Remove or replace console.log with a proper logger." : "Add return-type annotation."}\n\n` +
          "```typescript\n// Fixed version (sample)\n" + code.split("\n").slice(0, 8).join("\n") + "\n```";
      } else {
        reply = `I can help with that! Based on the current editor context:\n\n- Language: ${ide.editor.getModel()?.getLanguageId() ?? "unknown"}\n- File: ${ide.editor.getModel()?.uri.path ?? "untitled"}\n\nHere's my analysis of your request: "${userContent.slice(0, 100)}"…\n\nThe code looks well-structured. Consider extracting reusable logic into utility functions.`;
      }
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return _origFetch(input, init);
  };

  const _getEditorContext = () => {
    const model = ide.editor.getModel();
    if (!model) return { selection: "", language: "plaintext", file: "untitled" };
    const sel = ide.editor.getSelection();
    const selection = sel && !sel.isEmpty()
      ? model.getValueInRange(sel)
      : model.getValueInRange({ startLineNumber: Math.max(1, (sel?.startLineNumber ?? 1) - 5), startColumn: 1, endLineNumber: Math.min(model.getLineCount(), (sel?.endLineNumber ?? 1) + 5), endColumn: model.getLineMaxColumn(Math.min(model.getLineCount(), (sel?.endLineNumber ?? 1) + 5)) });
    return { selection, language: model.getLanguageId(), file: model.uri.path };
  };

  eventBus.on(AiEvents.Explain, async () => {
    const ctx = _getEditorContext();
    apis.statusbar.register({ id: "ai-thinking", label: "$(loading~spin) AI: Explaining…", alignment: "left", priority: 60, tooltip: "AI is analyzing code" });
    try {
      const res = await apis.ai.chat([{ role: "system", content: "You are a helpful code explanation assistant." }, { role: "user", content: `[EXPLAIN] ${ctx.selection}` }]);
      apis.statusbar.remove("ai-thinking");
      apis.notification.show({ type: "info", message: `AI Explain:\n${res.content.slice(0, 300)}`, duration: 8000 });
      eventBus.emit(AiEvents.ChatResponse, { action: "explain", content: res.content });
    } catch { apis.statusbar.remove("ai-thinking"); apis.notification.show({ type: "error", message: "AI Explain failed.", duration: 3000 }); }
  });

  eventBus.on(AiEvents.Generate, async () => {
    const ctx = _getEditorContext();
    apis.statusbar.register({ id: "ai-thinking", label: "$(loading~spin) AI: Generating…", alignment: "left", priority: 60, tooltip: "AI is generating code" });
    try {
      const res = await apis.ai.chat([{ role: "system", content: `You are a ${ctx.language} code generator.` }, { role: "user", content: `[GENERATE] Context from ${ctx.file}:\n${ctx.selection}` }]);
      apis.statusbar.remove("ai-thinking");
      const sel = ide.editor.getSelection();
      if (sel) {
        const codeMatch = res.content.match(/```[\w]*\n([\s\S]*?)```/);
        ide.editor.executeEdits("ai-generate", [{ range: sel, text: codeMatch ? codeMatch[1] : res.content }]);
        apis.notification.show({ type: "success", message: "AI: Code generated and inserted.", duration: 3000 });
      } else {
        apis.notification.show({ type: "info", message: `AI Generate:\n${res.content.slice(0, 300)}`, duration: 8000 });
      }
      eventBus.emit(AiEvents.ChatResponse, { action: "generate", content: res.content });
    } catch { apis.statusbar.remove("ai-thinking"); apis.notification.show({ type: "error", message: "AI Generate failed.", duration: 3000 }); }
  });

  eventBus.on(AiEvents.Fix, async () => {
    const ctx = _getEditorContext();
    apis.statusbar.register({ id: "ai-thinking", label: "$(loading~spin) AI: Fixing…", alignment: "left", priority: 60, tooltip: "AI is suggesting a fix" });
    try {
      const res = await apis.ai.chat([{ role: "system", content: "You are a code review and fix assistant." }, { role: "user", content: `[FIX] ${ctx.selection}` }]);
      apis.statusbar.remove("ai-thinking");
      apis.notification.show({ type: "info", message: `AI Fix:\n${res.content.slice(0, 400)}`, duration: 10000 });
      eventBus.emit(AiEvents.ChatResponse, { action: "fix", content: res.content });
    } catch { apis.statusbar.remove("ai-thinking"); apis.notification.show({ type: "error", message: "AI Fix failed.", duration: 3000 }); }
  });

  apis.aiOrchestrator.wireDefaults({ getModel: () => ide.editor.getModel(), getSelection: () => ide.editor.getSelection() });

  eventBus.on(AiEvents.Status, (p: unknown) => {
    const { state: status } = p as { state: string };
    if (status === "streaming") apis.statusbar.register({ id: "ai-status", label: "$(sparkle) AI", alignment: "right", priority: 100, tooltip: "AI is active" });
    else apis.statusbar.remove("ai-status");
  });
}
