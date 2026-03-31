// ── ESLint plugin — browser-based linting with diagnostics integration ──
import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { ESLintPluginOptions, ESLintConfig, LintMessage } from "./types";
import { DEFAULT_LANGUAGES } from "./types";
import { resolveConfig, parseEslintRc } from "./config-loader";
import { runLint } from "./runner";
import { applyFixes } from "./auto-fix";
import { DiagnosticEvents, FileEvents } from "@core/events";

export function createESLintPlugin(
  options: ESLintPluginOptions = {},
): MonacoPlugin {
  let config: ESLintConfig = resolveConfig(options.config);
  const languages = new Set(options.languages ?? DEFAULT_LANGUAGES);
  const debounceMs = options.debounceMs ?? 500;
  const disposables: IDisposable[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    id: "eslint-module",
    name: "ESLint",
    version: "1.0.0",
    description:
      "Browser-based ESLint linting with diagnostics integration and auto-fix on save",
    dependencies: ["editor-module", "diagnostics-module"],
    priority: 45,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      const { editor } = ctx;

      /** Run lint and publish diagnostics for a model */
      function lintModel(model: import("monaco-editor").editor.ITextModel) {
        const langId = model.getLanguageId();
        if (!languages.has(langId)) return;

        const content = model.getValue();
        const uri = model.uri.toString();
        const filePath = model.uri.path;

        const result = runLint(filePath, content, config);

        // Convert lint messages to diagnostics and publish
        ctx.emit(DiagnosticEvents.Publish, {
          source: "eslint",
          uri,
          diagnostics: result.messages.map((m: LintMessage) => ({
            severity: m.severity === 2 ? "error" : "warning",
            message: m.ruleId ? `${m.message} (${m.ruleId})` : m.message,
            startLineNumber: m.line,
            startColumn: m.column,
            endLineNumber: m.endLine ?? m.line,
            endColumn: m.endColumn ?? m.column + 1,
            source: "eslint",
            code: m.ruleId ?? undefined,
          })),
        });
      }

      /** Debounced lint on content change */
      function debouncedLint() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const model = editor.getModel();
          if (model) lintModel(model);
        }, debounceMs);
      }

      // ── Lint on content change (debounced) ─────────────────
      const contentDisposable = editor.onDidChangeModelContent(() => {
        debouncedLint();
      });
      disposables.push(contentDisposable);

      // ── Lint when switching models ─────────────────────────
      const modelDisposable = editor.onDidChangeModel(() => {
        const model = editor.getModel();
        if (model) lintModel(model);
      });
      disposables.push(modelDisposable);

      // ── Auto-fix on save ───────────────────────────────────
      if (options.fixOnSave) {
        disposables.push(
          ctx.on(FileEvents.Save, () => {
            const model = editor.getModel();
            if (!model) return;
            const langId = model.getLanguageId();
            if (!languages.has(langId)) return;

            const content = model.getValue();
            const result = runLint(model.uri.path, content, config);

            if (result.messages.some((m) => m.fix)) {
              const fixed = applyFixes(content, result.messages);
              if (fixed !== content) {
                model.pushEditOperations(
                  [],
                  [{ range: model.getFullModelRange(), text: fixed }],
                  () => null,
                );
              }
            }
          }),
        );
      }

      // ── Listen for .eslintrc changes ───────────────────────
      disposables.push(
        ctx.on(FileEvents.Read, (payload) => {
          const { path, content } = payload as {
            path: string;
            content: string;
          };
          if (
            path.endsWith(".eslintrc") ||
            path.endsWith(".eslintrc.json")
          ) {
            const parsed = parseEslintRc(content);
            if (parsed) {
              config = resolveConfig(parsed);
              // Re-lint current model with new config
              const model = editor.getModel();
              if (model) lintModel(model);
            }
          }
        }),
      );

      // ── Lint initial model ─────────────────────────────────
      const model = editor.getModel();
      if (model) lintModel(model);
    },

    onDispose() {
      if (debounceTimer) clearTimeout(debounceTimer);
      for (const d of disposables) d.dispose();
      disposables.length = 0;
    },
  };
}

export type { ESLintConfig, ESLintPluginOptions, LintResult, LintMessage } from "./types";
export { DEFAULT_LANGUAGES } from "./types";
export { applyFixes, countFixable } from "./auto-fix";