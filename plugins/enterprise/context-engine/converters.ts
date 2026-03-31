// ── Context Engine Converters ──────────────────────────────

import type {
  ContextEngineManifest,
} from "./interfaces/manifest";

export interface ProviderRegistration {
  language: string;
  providerName: string;
  filePath: string;
}

export interface MonacoThemeDef {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

export interface MonarchLanguageDef {
  tokenizer: Record<string, Array<[string | RegExp, string] | { include: string }>>;
  defaultToken?: string;
  keywords?: string[];
}

export function convertManifestToProviders(manifest: ContextEngineManifest): ProviderRegistration[] {
  const registrations: ProviderRegistration[] = [];

  for (const lang of manifest.languages) {
    for (const [providerName, filePath] of Object.entries(lang.files)) {
      if (filePath) {
        registrations.push({
          language: lang.id,
          providerName,
          filePath,
        });
      }
    }
  }

  return registrations;
}

export function convertTheme(themeData: Record<string, unknown>): MonacoThemeDef {
  const base = (themeData.type === "dark" ? "vs-dark" : "vs") as MonacoThemeDef["base"];
  const colors = (themeData.colors ?? {}) as Record<string, string>;

  const tokenColors = (themeData.tokenColors ?? []) as Array<{
    scope?: string | string[];
    settings?: { foreground?: string; fontStyle?: string };
  }>;

  const rules = tokenColors.flatMap((tc) => {
    const scopes = Array.isArray(tc.scope) ? tc.scope : tc.scope ? [tc.scope] : [""];
    return scopes.map((scope) => ({
      token: scope,
      foreground: tc.settings?.foreground?.replace("#", ""),
      fontStyle: tc.settings?.fontStyle,
    }));
  });

  return { base, inherit: true, rules, colors };
}

export function convertGrammar(tokensData: Record<string, unknown>): MonarchLanguageDef {
  const tokenizer: MonarchLanguageDef["tokenizer"] = {};
  const rawTokenizer = tokensData.tokenizer as Record<string, unknown[]> | undefined;

  if (rawTokenizer) {
    for (const [state, rules] of Object.entries(rawTokenizer)) {
      tokenizer[state] = (rules as Array<unknown[]>).map((rule) => {
        if (Array.isArray(rule) && rule.length >= 2) {
          return [rule[0] as string, rule[1] as string];
        }
        return rule as unknown as { include: string };
      });
    }
  }

  return {
    tokenizer,
    defaultToken: (tokensData.defaultToken as string) ?? "",
    keywords: (tokensData.keywords as string[]) ?? [],
  };
}
