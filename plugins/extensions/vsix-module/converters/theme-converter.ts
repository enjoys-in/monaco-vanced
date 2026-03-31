// ── VSIX Module — Theme Converter ────────────────────────────
// Converts VS Code theme JSON → Monaco IStandaloneThemeData

interface VSCodeTheme {
  name?: string;
  type?: string;
  colors?: Record<string, string>;
  tokenColors?: Array<{
    scope?: string | string[];
    settings: { foreground?: string; background?: string; fontStyle?: string };
  }>;
}

interface MonacoThemeData {
  base: "vs" | "vs-dark" | "hc-black";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; background?: string; fontStyle?: string }>;
  colors: Record<string, string>;
}

export function convertVSCodeTheme(vsTheme: VSCodeTheme): MonacoThemeData {
  const base = resolveBase(vsTheme.type);

  const rules: MonacoThemeData["rules"] = [];
  if (vsTheme.tokenColors) {
    for (const tc of vsTheme.tokenColors) {
      const scopes = normalizeScopes(tc.scope);
      for (const scope of scopes) {
        const rule: MonacoThemeData["rules"][number] = { token: scope };
        if (tc.settings.foreground) rule.foreground = stripHash(tc.settings.foreground);
        if (tc.settings.background) rule.background = stripHash(tc.settings.background);
        if (tc.settings.fontStyle) rule.fontStyle = tc.settings.fontStyle;
        rules.push(rule);
      }
    }
  }

  const colors: Record<string, string> = {};
  if (vsTheme.colors) {
    for (const [key, value] of Object.entries(vsTheme.colors)) {
      colors[key] = value;
    }
  }

  return { base, inherit: true, rules, colors };
}

function resolveBase(type?: string): MonacoThemeData["base"] {
  switch (type) {
    case "light":
    case "hc-light":
      return "vs";
    case "hc":
    case "hc-black":
      return "hc-black";
    default:
      return "vs-dark";
  }
}

function normalizeScopes(scope?: string | string[]): string[] {
  if (!scope) return [""];
  if (typeof scope === "string") return scope.split(",").map((s) => s.trim());
  return scope;
}

function stripHash(color: string): string {
  return color.startsWith("#") ? color.slice(1) : color;
}
