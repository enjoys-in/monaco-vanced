// ── Context module plugin — CDN-based language intelligence packs ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type {
  ContextModuleOptions,
  LanguageManifest,
  ManifestLanguage,
  ProviderType,
} from "./types";
import { PROVIDER_TYPES } from "./types";
import { buildRegistrarMap } from "./provider-registry";

const DEFAULT_CDN = "https://cdn.jsdelivr.net/npm/@enjoys/context-engine";

export function createContextPlugin(
  options: ContextModuleOptions = {},
): MonacoPlugin {
  const cdnBase = options.cdnBase ?? DEFAULT_CDN;
  const disposables: IDisposable[] = [];

  return {
    id: "context-module",
    name: "Context Engine",
    version: "1.0.0",
    description:
      "Fetches language intelligence packs from CDN and registers all 25 Monaco providers",
    dependencies: ["editor-module"],
    priority: 50,
    defaultEnabled: true,

    async onMount(ctx: PluginContext) {
      const { monaco } = ctx;
      const registrars = buildRegistrarMap(monaco);

      // ── Fetch manifest ─────────────────────────────────────
      let manifest: LanguageManifest;
      try {
        const res = await fetch(`${cdnBase}/data/manifest.json`, {
          cache: "no-cache",
        });
        if (!res.ok) {
          console.warn(`[context-module] Manifest fetch failed: HTTP ${res.status}`);
          return;
        }
        manifest = (await res.json()) as LanguageManifest;
      } catch (err) {
        console.warn("[context-module] Cannot reach CDN:", err);
        return;
      }

      // ── Determine which languages to register ──────────────
      const targetLangs = options.languages
        ? manifest.languages.filter((l) => options.languages!.includes(l.id))
        : manifest.languages;

      const targetTypes: ProviderType[] = options.providerTypes ?? [...PROVIDER_TYPES];

      // ── Register providers for each language ───────────────
      const results = await Promise.allSettled(
        targetLangs.map((lang) =>
          registerLanguage(monaco, cdnBase, lang, targetTypes, registrars, disposables),
        ),
      );

      for (const r of results) {
        if (r.status === "rejected") {
          console.warn("[context-module]", r.reason);
        }
      }
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
    },
  };
}

// ── Register all providers for a single language ─────────────

async function registerLanguage(
  monaco: typeof monacoNs,
  cdnBase: string,
  lang: ManifestLanguage,
  types: ProviderType[],
  registrars: Record<ProviderType, (m: typeof monacoNs, l: string, d: unknown) => monacoNs.IDisposable | monacoNs.IDisposable[] | null>,
  disposables: IDisposable[],
): Promise<void> {
  const results = await Promise.allSettled(
    types.map(async (type) => {
      const filePath = lang.files?.[type];
      if (!filePath) return;

      const url = `${cdnBase}/data/${filePath}`;
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) return;

      const data: unknown = await res.json();
      const registrar = registrars[type];
      if (!registrar) return;

      try {
        const result = registrar(monaco, lang.id, data);
        if (result) {
          if (Array.isArray(result)) {
            disposables.push(...result);
          } else {
            disposables.push(result);
          }
        }
      } catch (err) {
        console.warn(`[context-module] ${lang.id}/${type} registration failed:`, err);
      }
    }),
  );

  let registered = 0;
  for (const r of results) {
    if (r.status === "fulfilled") registered++;
  }
}

export type { ContextModuleOptions, LanguageManifest, ManifestLanguage, ProviderType } from "./types";
export { PROVIDER_TYPES } from "./types";