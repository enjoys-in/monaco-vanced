// ── Preview plugin — registers providers, opens/closes previews ──
import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  PreviewProvider,
  PreviewFile,
  PreviewPanel,
  PreviewOptions,
} from "./types";
import { PreviewEvents, FileEvents } from "@core/events";

// Built-in providers
import { markdownProvider } from "./providers/markdown";
import { imageProvider } from "./providers/image";
import { audioProvider } from "./providers/audio";
import { videoProvider } from "./providers/video";
import { pdfProvider } from "./providers/pdf";
import { fontProvider } from "./providers/font";
import { htmlProvider } from "./providers/html";
import { jsonProvider } from "./providers/json";
import { csvProvider } from "./providers/csv";
import { svgProvider } from "./providers/svg";

const MAX_PREVIEW_SIZE = 50 * 1024 * 1024; // 50MB

export function createPreviewPlugin(): MonacoPlugin {
  const providers = new Map<string, PreviewProvider>();
  const activePreviews = new Map<string, PreviewPanel>();

  // Register built-in providers
  const builtins: PreviewProvider[] = [
    markdownProvider,
    imageProvider,
    audioProvider,
    videoProvider,
    pdfProvider,
    fontProvider,
    htmlProvider,
    jsonProvider,
    csvProvider,
    svgProvider,
  ];

  return {
    id: "preview-module",
    name: "Preview Module",
    version: "1.0.0",
    description: "File preview system — markdown, images, audio, video, PDF, fonts, HTML, JSON, CSV, SVG",
    priority: 30,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {

      // Register all built-in providers
      for (const provider of builtins) {
        providers.set(provider.id, provider);
      }

      /**
       * Register a custom preview provider.
       */
      const registerProvider = (provider: PreviewProvider): IDisposable => {
        providers.set(provider.id, provider);
        ctx.emit(PreviewEvents.ProviderAdded, { id: provider.id });
        return {
          dispose() {
            providers.delete(provider.id);
            ctx.emit(PreviewEvents.ProviderRemoved, { id: provider.id });
          },
        };
      };

      /**
       * Check if a file can be previewed.
       */
      const canPreview = (uri: string): boolean => {
        const ext = getExtension(uri);
        return [...providers.values()].some((p) => p.extensions.includes(ext));
      };

      /**
       * Find the provider that handles a file extension.
       */
      const findProvider = (uri: string): PreviewProvider | undefined => {
        const ext = getExtension(uri);
        return [...providers.values()].find((p) => p.extensions.includes(ext));
      };

      /**
       * Open a preview for a file.
       */
      const openPreview = async (
        file: PreviewFile,
        options?: PreviewOptions,
      ): Promise<PreviewPanel | undefined> => {
        if (file.size > MAX_PREVIEW_SIZE) {
          ctx.emit(PreviewEvents.Error, {
            uri: file.uri,
            error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 50MB`,
          });
          return undefined;
        }

        const provider = findProvider(file.uri);
        if (!provider) return undefined;

        // Reuse existing preview if open
        const existing = activePreviews.get(file.uri);
        if (existing) {
          existing.refresh();
          return existing;
        }

        const html = await provider.render(file);

        const panel: PreviewPanel = {
          id: `preview-${file.uri}`,
          fileUri: file.uri,
          previewType: provider.id,
          refresh() {
            provider.render(file).then((newHtml) => {
              ctx.emit(PreviewEvents.Refresh, { uri: file.uri, html: newHtml });
            });
          },
          updateContent(content: Uint8Array | string) {
            file.content = content;
            this.refresh();
          },
          dispose() {
            activePreviews.delete(file.uri);
            // Revoke object URLs to prevent memory leaks
            if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);
            ctx.emit(PreviewEvents.Close, { uri: file.uri });
          },
        };

        activePreviews.set(file.uri, panel);
        ctx.emit(PreviewEvents.Open, {
          uri: file.uri,
          previewType: provider.id,
          html,
          location: options?.location ?? "tab",
        });

        return panel;
      };

      /** Close a preview */
      const closePreview = (uri: string): void => {
        activePreviews.get(uri)?.dispose();
      };

      // Wire event-driven API
      ctx.on(PreviewEvents.OpenRequest, (payload) => {
        const file = payload as PreviewFile;
        openPreview(file);
      });

      ctx.on(PreviewEvents.CloseRequest, (payload) => {
        const { uri } = payload as { uri: string };
        closePreview(uri);
      });

      ctx.on(PreviewEvents.RegisterProvider, (payload) => {
        const provider = payload as PreviewProvider;
        registerProvider(provider);
      });

      ctx.on(PreviewEvents.CanPreview, (payload) => {
        const { uri } = payload as { uri: string };
        ctx.emit(PreviewEvents.CanPreviewResult, { uri, result: canPreview(uri) });
      });

      // Listen for live updates on previewable files
      ctx.on(FileEvents.Written, (payload) => {
        const { path } = payload as { path: string };
        const activePanel = activePreviews.get(path);
        if (activePanel) {
          const provider = providers.get(activePanel.previewType);
          if (provider?.supportsLiveUpdate) {
            activePanel.refresh();
          }
        }
      });
    },

    onDispose() {
      // Dispose all active previews (revokes object URLs)
      for (const panel of activePreviews.values()) {
        panel.dispose();
      }
      activePreviews.clear();
      providers.clear();
    },
  };
}

function getExtension(uri: string): string {
  const dot = uri.lastIndexOf(".");
  return dot >= 0 ? uri.slice(dot).toLowerCase() : "";
}

export type {
  PreviewProvider,
  PreviewFile,
  PreviewPanel,
  PreviewOptions,
  PreviewableType,
  PreviewToolbarAction,
  PreviewTab,
} from "./types";
