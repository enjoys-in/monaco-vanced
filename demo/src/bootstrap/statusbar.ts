// ── Status Bar Wiring ─────────────────────────────────────────
// Registration, git detection, cursor/selection tracking, diagnostics

import * as monaco from "monaco-editor";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";
import { GitEvents, SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { MockFsAPI } from "../mock-fs";
import type { PluginApis } from "./plugins";

export interface StatusBarDeps {
  ide: MonacoVancedInstance;
  eventBus: EventBus;
  mockFs: MockFsAPI;
  models: Map<string, monaco.editor.ITextModel>;
  apis: PluginApis;
}

export function wireStatusBar(deps: StatusBarDeps) {
  const { ide, eventBus, mockFs, models, apis } = deps;
  const { statusbar: statusbarApi } = apis;

  // ── Detect .git directory for real branch info ───────────
  const gitHead = mockFs.readFile(".git/HEAD");
  const isGitRepo = gitHead !== null;
  let currentBranch = "main";
  if (isGitRepo && gitHead) {
    const match = gitHead.match(/^ref:\s+refs\/heads\/(.+)/);
    if (match) currentBranch = match[1].trim();
  }

  if (isGitRepo) {
    statusbarApi.register({ id: "branch", label: `$(git-branch) ${currentBranch}`, alignment: "left", priority: 100, tooltip: `${currentBranch} (Git Branch) — Click to Checkout` });
    statusbarApi.register({ id: "sync", label: "$(sync) 0↓ 0↑", alignment: "left", priority: 95, tooltip: "Synchronize Changes — 0 pending pull, 0 pending push" });
  }

  eventBus.on(GitEvents.BranchChange, (p: unknown) => {
    const { branch } = p as { branch: string };
    currentBranch = branch;
    if (isGitRepo) {
      mockFs.writeFile(".git/HEAD", `ref: refs/heads/${branch}\n`);
      statusbarApi.update("branch", {
        label: `$(git-branch) ${branch}`,
        tooltip: `${branch} (Git Branch) — Click to Checkout`,
      });
    }
  });

  // ── Static status bar items ──────────────────────────────
  statusbarApi.register({ id: "errors", label: "$(error) 0  $(warning) 0", alignment: "left", priority: 90, tooltip: "No Problems — Click to Toggle Problems Panel", visible: false });
  statusbarApi.register({ id: "symbol-count", label: "", alignment: "left", priority: 85, tooltip: "Symbol Index — Click to Search Symbols", visible: false, command: "sidebar:search-symbols" });
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
    const langName = LANG_NAMES[model.getLanguageId()] ?? model.getLanguageId();
    statusbarApi.update("language", { label: langName, tooltip: `Select Language Mode — ${langName}` });
    const eolSeq = model.getEOL();
    const eolLabel = eolSeq === "\r\n" ? "CRLF" : "LF";
    statusbarApi.update("eol", { label: eolLabel, tooltip: `Select End of Line Sequence — ${eolLabel}` });
    statusbarApi.update("encoding", { label: "UTF-8" });
    const opts = model.getOptions();
    const indentLabel = opts.insertSpaces ? `Spaces: ${opts.tabSize}` : `Tab Size: ${opts.tabSize}`;
    statusbarApi.update("spaces", { label: indentLabel, tooltip: `Select Indentation — ${indentLabel}` });
    const filePath = model.uri.path.replace(/^\//, "");
    const fileName = filePath.split("/").pop() ?? filePath;
    document.title = `${fileName} — Monaco Vanced`;
  }

  const FILE_STATUS_IDS = ["errors", "line-col", "spaces", "encoding", "eol", "language", "prettier"];

  ide.editor.onDidChangeModel(() => {
    const hasModel = !!ide.editor.getModel();
    for (const id of FILE_STATUS_IDS) statusbarApi.update(id, { visible: hasModel });
    if (!hasModel) statusbarApi.update("selection", { visible: false });
    updateModelMeta();
  });
  monaco.editor.onDidChangeModelLanguage(() => { updateModelMeta(); });

  // ── Track diagnostics ────────────────────────────────────
  function updateDiagnostics() {
    const markers = monaco.editor.getModelMarkers({});
    let errors = 0, warnings = 0;
    for (const m of markers) {
      if (m.severity === monaco.MarkerSeverity.Error) errors++;
      else if (m.severity === monaco.MarkerSeverity.Warning) warnings++;
    }
    statusbarApi.update("errors", {
      label: `$(error) ${errors}  $(warning) ${warnings}`,
      tooltip: errors + warnings > 0 ? `${errors} error(s), ${warnings} warning(s)` : "No Problems",
    });
  }
  monaco.editor.onDidChangeMarkers(() => { updateDiagnostics(); });
  updateDiagnostics();
  updateModelMeta();

  // ── Symbol count status bar item ─────────────────────────
  const indexerApi = apis.indexer;
  function updateSymbolCount() {
    if (!indexerApi?.isReady()) return;
    const allSymbols = indexerApi.query({ query: "" });
    const total = allSymbols.length;
    statusbarApi.update("symbol-count", {
      label: `$(symbol-method) Symbols: ${total}`,
      tooltip: `${total} indexed symbol${total !== 1 ? "s" : ""} across workspace — Click to Search Symbols`,
      visible: total > 0,
    });
  }
  ide.editor.onDidChangeModel(() => { updateSymbolCount(); });

  // Register command to open search view with symbols tab
  if (apis.command) {
    apis.command.register({
      id: "sidebar:search-symbols",
      label: "Search Symbols",
      handler: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "search" }); },
    });
  }
}
