// ── Decorations plugin — manage editor decorations by type ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, PluginContext } from "@core/types";
import type { DecorationConfig, DecorationEntry } from "./types";
import { DecorationEvents } from "@core/events";

type MonacoEditor = monacoNs.editor.IStandaloneCodeEditor;

export function createDecorationsPlugin(): MonacoPlugin {
  const decorations = new Map<string, DecorationEntry>();
  let editor: MonacoEditor;

  function toModelDecoration(config: DecorationConfig): monacoNs.editor.IModelDecorationOptions {
    return {
      className: config.className,
      glyphMarginClassName: config.glyphMarginClassName,
      afterContentClassName: config.afterContentClassName,
      isWholeLine: config.isWholeLine,
      hoverMessage: config.hoverMessage,
      stickiness: config.stickiness,
    };
  }

  return {
    id: "decorations-module",
    name: "Decorations Module",
    version: "1.0.0",
    description: "Manages editor decorations — highlights, gutter icons, inline text",
    priority: 50,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      editor = ctx.editor;

      /**
       * Apply a set of decorations.
       * If a decoration with the same id already exists, it is replaced.
       */
      const applyDecoration = (config: DecorationConfig, ranges: monacoNs.IRange[]) => {
        removeDecoration(config.id);

        const options = toModelDecoration(config);
        const newDecorations = ranges.map((range) => ({ range, options }));

        const decorationIds = editor.deltaDecorations(
          [],
          newDecorations,
        );

        decorations.set(config.id, {
          id: config.id,
          config,
          ranges,
          decorationIds,
        });
      };

      /** Remove a decoration by id */
      const removeDecoration = (id: string) => {
        const entry = decorations.get(id);
        if (!entry) return;
        editor.deltaDecorations(entry.decorationIds, []);
        decorations.delete(id);
      };

      /** Remove all decorations */
      const clearAll = () => {
        for (const [id] of decorations) {
          removeDecoration(id);
        }
      };

      // Wire event-driven API
      ctx.on(DecorationEvents.Apply, (payload) => {
        const { config: cfg, ranges: r } = payload as { config: DecorationConfig; ranges: monacoNs.IRange[] };
        applyDecoration(cfg, r);
      });

      ctx.on(DecorationEvents.Remove, (payload) => {
        const { id } = payload as { id: string };
        removeDecoration(id);
      });

      ctx.on(DecorationEvents.Clear, () => {
        clearAll();
      });
    },

    onDispose() {
      // Remove all decorations from editor
      for (const entry of decorations.values()) {
        editor?.deltaDecorations(entry.decorationIds, []);
      }
      decorations.clear();
    },
  };
}

export type { DecorationConfig, DecorationEntry, DecorationType } from "./types";
