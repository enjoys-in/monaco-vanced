// ── Prettier plugin — browser-based formatting via standalone Prettier ──
import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { PrettierPluginOptions, PrettierConfig } from "./types";
import { LANGUAGE_PARSER_MAP } from "./types";
import { resolveConfig, parsePrettierRc } from "./config-loader";
import { formatWithPrettier, isLanguageSupported, preloadParserForLanguage } from "./formatter";
import { EditorEvents, FileEvents } from "@core/events";

export function createPrettierPlugin(
  options: PrettierPluginOptions = {},
): MonacoPlugin {
  let config: PrettierConfig = resolveConfig(options.config);
  const disposables: IDisposable[] = [];

  return {
    id: "prettier-module",
    name: "Prettier",
    version: "1.0.0",
    description:
      "Browser-based Prettier formatting via CDN. Format on save, per-language config.",
    dependencies: ["editor-module"],
    priority: 40,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      const { monaco, editor } = ctx;

      // ── Determine supported languages ──────────────────────
      const languages = options.languages ?? Object.keys(LANGUAGE_PARSER_MAP);

      // ── Register DocumentFormattingEditProvider per language ──
      for (const lang of languages) {
        if (!isLanguageSupported(lang)) continue;

        const disposable = monaco.languages.registerDocumentFormattingEditProvider(
          lang,
          {
            async provideDocumentFormattingEdits(model) {
              const code = model.getValue();
              const langId = model.getLanguageId();

              try {
                const formatted = await formatWithPrettier(
                  code,
                  langId,
                  config,
                  options.prettierUrl,
                  options.parserUrls,
                );

                // Return full-document replacement edit
                const fullRange = model.getFullModelRange();
                return [{ range: fullRange, text: formatted }];
              } catch (err) {
                console.warn("[prettier-module] Format failed:", err);
                return [];
              }
            },
          },
        );
        disposables.push(disposable);
      }

      // ── Preload parser plugin when language is detected ────
      const preloadForModel = (langId: string) => {
        if (isLanguageSupported(langId)) {
          preloadParserForLanguage(langId, options.prettierUrl, options.parserUrls).catch(() => {});
        }
      };

      // Preload for current model immediately
      const currentLang = editor.getModel()?.getLanguageId();
      if (currentLang) preloadForModel(currentLang);

      // Preload when language changes (file switch, language detection, etc.)
      disposables.push(
        ctx.on(EditorEvents.LanguageChange, (payload) => {
          const { languageId } = payload as { languageId: string };
          preloadForModel(languageId);
        }),
      );

      // ── Format on save ─────────────────────────────────────
      if (options.formatOnSave !== false) {
        disposables.push(
          ctx.on(FileEvents.Save, async () => {
            const langId = editor.getModel()?.getLanguageId();
            if (!langId || !isLanguageSupported(langId)) return;

            try {
              // Trigger Monaco's built-in format action (uses our registered provider)
              await editor.getAction("editor.action.formatDocument")?.run();
            } catch {
              // Silently ignore if format fails on save
            }
          }),
        );
      }

      // ── Listen for editor:format command events ────────────
      disposables.push(
        ctx.on(EditorEvents.Format, async () => {
          const langId = editor.getModel()?.getLanguageId();
          if (!langId || !isLanguageSupported(langId)) return;

          const model = editor.getModel();
          if (!model) return;

          try {
            const formatted = await formatWithPrettier(
              model.getValue(),
              langId,
              config,
              options.prettierUrl,
              options.parserUrls,
            );

            // Apply as a single edit operation
            model.pushEditOperations(
              [],
              [{ range: model.getFullModelRange(), text: formatted }],
              () => null,
            );

            ctx.emit(EditorEvents.Formatted, { languageId: langId });
          } catch (err) {
            console.warn("[prettier-module] Format failed:", err);
          }
        }),
      );

      // ── Listen for .prettierrc file reads to update config ──
      disposables.push(
        ctx.on(FileEvents.Read, (payload) => {
          const { path, content } = payload as {
            path: string;
            content: string;
          };
          if (
            path.endsWith(".prettierrc") ||
            path.endsWith(".prettierrc.json")
          ) {
            const parsed = parsePrettierRc(content);
            if (parsed) {
              config = resolveConfig(parsed);
            }
          }
        }),
      );

      // ── Keybinding: Shift+Alt+F for format document ───────
      ctx.addKeybinding(
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        () => {
          ctx.emit(EditorEvents.Format, {});
        },
        "Format Document with Prettier",
      );
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
    },
  };
}

export type { PrettierConfig, PrettierPluginOptions } from "./types";
export { LANGUAGE_PARSER_MAP, DEFAULT_CDN_BASE } from "./types";
export { isLanguageSupported, preloadParserForLanguage, clearCache } from "./formatter";