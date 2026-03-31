// ── Diagnostics plugin — collects errors, manages Monaco markers, quick fixes ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, PluginContext } from "@core/types";
import type { Diagnostic } from "./types";
import { toMonacoSeverity } from "./types";
import { MarkerStore } from "./marker-store";
import { deduplicateDiagnostics } from "./deduplicator";
import { createQuickFixProvider } from "./quick-fix";
import { DiagnosticEvents, ModelEvents } from "@core/events";

export function createDiagnosticsPlugin(): MonacoPlugin {
  const store = new MarkerStore();
  const disposables: monacoNs.IDisposable[] = [];

  return {
    id: "diagnostics-module",
    name: "Diagnostics Module",
    version: "1.0.0",
    description: "Collects diagnostics from all sources, manages Monaco editor markers and quick fixes",
    priority: 60,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      const { monaco } = ctx;

      // Register quick-fix provider for all languages
      const quickFixDisposable = monaco.languages.registerCodeActionProvider("*", createQuickFixProvider(store));
      disposables.push(quickFixDisposable);

      /**
       * Listen for diagnostics:publish from various sources (LSP, ESLint, terminal, etc.)
       * Payload: { source: string, uri: string, diagnostics: Diagnostic[] }
       */
      ctx.on(DiagnosticEvents.Publish, (payload) => {
        const { source, uri, diagnostics } = payload as {
          source: string;
          uri: string;
          diagnostics: Diagnostic[];
        };

        // Store the raw diagnostics
        store.set(source, uri, diagnostics);

        // Merge all sources for this URI → deduplicate → apply markers
        const allForUri = store.getForUri(uri);
        const deduped = deduplicateDiagnostics(allForUri);

        const markers: monacoNs.editor.IMarkerData[] = deduped.map((d) => ({
          severity: toMonacoSeverity(d.severity, monaco.MarkerSeverity),
          message: d.message,
          startLineNumber: d.startLineNumber,
          startColumn: d.startColumn,
          endLineNumber: d.endLineNumber,
          endColumn: d.endColumn,
          source: d.source,
          code: d.code,
          relatedInformation: d.relatedInformation?.map((r) => ({
            resource: monaco.Uri.parse(r.uri),
            message: r.message,
            startLineNumber: r.startLineNumber,
            startColumn: r.startColumn,
            endLineNumber: r.endLineNumber,
            endColumn: r.endColumn,
          })),
        }));

        // Apply markers to all models (use "diagnostics-module" as combined owner)
        const model = monaco.editor.getModels().find((m) => m.uri.toString() === uri);
        if (model) {
          monaco.editor.setModelMarkers(model, "diagnostics-module", markers);
        }

        // Emit updated counts for status bar
        ctx.emit(DiagnosticEvents.CountChange, store.getCounts());
      });

      /**
       * Listen for diagnostics:clear to remove all diagnostics for a source or URI
       */
      ctx.on(DiagnosticEvents.Clear, (payload) => {
        const { source, uri } = payload as { source?: string; uri?: string };
        if (source) store.clearSource(source);
        if (uri) {
          store.clearUri(uri);
          const model = monaco.editor.getModels().find((m) => m.uri.toString() === uri);
          if (model) {
            monaco.editor.setModelMarkers(model, "diagnostics-module", []);
          }
        }
        ctx.emit(DiagnosticEvents.CountChange, store.getCounts());
      });

      // When a model is disposed, clear its diagnostics
      ctx.on(ModelEvents.Dispose, (payload) => {
        const { uri } = payload as { uri: string };
        store.clearUri(uri);
      });
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      store.clear();
    },
  };
}

export { MarkerStore } from "./marker-store";
export { deduplicateDiagnostics } from "./deduplicator";
export type { Diagnostic, DiagnosticCounts, DiagnosticSeverity, QuickFix, QuickFixEdit } from "./types";
