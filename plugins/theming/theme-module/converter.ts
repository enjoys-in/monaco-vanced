// ── Theme Module — VS Code Theme Converter ───────────────────
// Converts a VS Code theme (ThemeDefinition) → Monaco IStandaloneThemeData

import type { ThemeDefinition } from "./types";

interface MonacoThemeData {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

export function convertVSCodeTheme(theme: ThemeDefinition): MonacoThemeData {
  const base = resolveBase(theme.type);
  const rules: MonacoThemeData["rules"] = [];

  for (const tc of theme.tokenColors) {
    const scopes = normalizeScopes(tc.scope);
    for (const scope of scopes) {
      const rule: MonacoThemeData["rules"][number] = { token: scope };
      if (tc.settings.foreground) rule.foreground = stripHash(tc.settings.foreground);
      if (tc.settings.background) rule.background = stripHash(tc.settings.background);
      if (tc.settings.fontStyle) rule.fontStyle = tc.settings.fontStyle;
      rules.push(rule);
    }
  }

  // Copy editor colors
  const colors: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) {
    colors[key] = value;
  }

  return { base, inherit: true, rules, colors };
}

function resolveBase(type: string): MonacoThemeData["base"] {
  switch (type) {
    case "light":
      return "vs";
    case "hc":
    case "hc-black":
      return "hc-black";
    default:
      return "vs-dark";
  }
}

function normalizeScopes(scope: string | string[]): string[] {
  if (typeof scope === "string") return scope.split(",").map((s) => s.trim());
  return scope;
}

function stripHash(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
}
