// ── Reactive theme system — themes loaded at runtime via plugin API ──

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { ThemeDefinition } from "../../../../plugins/theming/theme-module/types";
import { ThemeEvents } from "@enjoys/monaco-vanced/core/events";

// ── Theme token interface (wireframe/UI tokens) ──────────────
export interface ThemeTokens {
  bg: string;
  editorBg: string;
  sidebarBg: string;
  activityBg: string;
  titleBg: string;
  menuBg: string;
  tabBg: string;
  tabActiveBg: string;
  tabInactiveBg: string;
  statusBg: string;
  statusFg: string;
  border: string;
  borderLight: string;
  fg: string;
  fgDim: string;
  fgBright: string;
  accent: string;
  accentAlt: string;
  hover: string;
  listHover: string;
  listActive: string;
  activeIcon: string;
  inactiveIcon: string;
  breadcrumbFg: string;
  panelBg: string;
  panelHeaderBg: string;
  badgeBg: string;
  badgeFg: string;
  buttonBg: string;
  buttonHoverBg: string;
  inputBg: string;
  inputBorder: string;
  focusBorder: string;
  cardBg: string;
  cardBorder: string;
  successGreen: string;
  warningYellow: string;
  errorRed: string;
  textLink: string;
  separator: string;
}

// ── Dynamic theme registry (populated at runtime via registerThemes) ──
export const THEME_MAP: Record<string, ThemeTokens> = {};
export const THEME_DEFS: Record<string, ThemeDefinition> = {};

/** Register themes fetched from the theme plugin API at runtime */
export function registerThemes(themes: ThemeDefinition[]): void {
  for (const def of themes) {
    const tokens = themeDefToTokens(def);
    THEME_MAP[def.name] = tokens;
    if (def.id && def.id !== def.name) THEME_MAP[def.id] = tokens;
    THEME_DEFS[def.name] = def;
    if (def.id) THEME_DEFS[def.id] = def;
  }
  BUILTIN_THEME_NAMES.length = 0;
  BUILTIN_THEME_NAMES.push(...[...new Set(themes.map((d) => d.name))]);
}

/** Ordered list of available theme names (populated by registerThemes) */
export const BUILTIN_THEME_NAMES: string[] = [];

const DEFAULT_THEME = "Dracula";

/** Hardcoded dark fallback tokens — used before theme plugin loads */
export const DEFAULT_TOKENS: ThemeTokens = {
  bg: "#282a36", editorBg: "#282a36", sidebarBg: "#21222c",
  activityBg: "#343746", titleBg: "#21222c", menuBg: "#21222c",
  tabBg: "#282a36", tabActiveBg: "#282a36", tabInactiveBg: "#21222c",
  statusBg: "#007acc", statusFg: "#ffffff",
  border: "#3a3d4e", borderLight: "#464858",
  fg: "#f8f8f2", fgDim: "#6272a4", fgBright: "#ffffff",
  accent: "#007acc", accentAlt: "#007acc",
  hover: "#303240", listHover: "#303240", listActive: "#44475a",
  activeIcon: "#ffffff", inactiveIcon: "#6272a4", breadcrumbFg: "#6272a4",
  panelBg: "#282a36", panelHeaderBg: "#21222c",
  badgeBg: "#007acc", badgeFg: "#282a36",
  buttonBg: "#005a9e", buttonHoverBg: "#007acc",
  inputBg: "#303240", inputBorder: "#464858", focusBorder: "#007acc",
  cardBg: "#21222c", cardBorder: "#464858",
  successGreen: "#73c991", warningYellow: "#cca700",
  errorRed: "#f14c4c", textLink: "#007acc", separator: "#ffffff14",
};
function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, r + amount);
  const ng = Math.min(255, g + amount);
  const nb = Math.min(255, b + amount);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount: number): string {
  return lighten(hex, -amount);
}

function withAlpha(hex: string, alpha: string): string {
  return hex.slice(0, 7) + alpha;
}

export function themeDefToTokens(def: ThemeDefinition): ThemeTokens {
  const c = def.colors;
  const bg = c["editor.background"] ?? "#1e1e1e";
  const fg = c["editor.foreground"] ?? "#cccccc";
  const isDark = def.type === "dark" || def.type === "hc";
  const bracketBorder = c["editorBracketMatch.border"] ?? (isDark ? "#007acc" : "#0969da");

  const sidebarBg = isDark ? darken(bg, 10) : lighten(bg, -10);
  const activityBg = isDark ? lighten(bg, 15) : darken(bg, 15);
  const titleBg = sidebarBg;
  const menuBg = sidebarBg;
  const statusBg = bracketBorder;
  const lineNumFg = c["editorLineNumber.foreground"] ?? (isDark ? "#858585" : "#888888");
  const selBg = c["editor.selectionBackground"] ?? (isDark ? "#264f78" : "#add6ff");
  const lineHl = c["editor.lineHighlightBackground"] ?? (isDark ? lighten(bg, 8) : darken(bg, 6));

  return {
    bg,
    editorBg: bg,
    sidebarBg,
    activityBg,
    titleBg,
    menuBg,
    tabBg: bg,
    tabActiveBg: bg,
    tabInactiveBg: sidebarBg,
    statusBg,
    statusFg: isDark ? "#ffffff" : "#ffffff",
    border: isDark ? lighten(bg, 12) : darken(bg, 14),
    borderLight: isDark ? lighten(bg, 20) : darken(bg, 20),
    fg,
    fgDim: lineNumFg,
    fgBright: isDark ? "#ffffff" : "#000000",
    accent: bracketBorder,
    accentAlt: bracketBorder,
    hover: isDark ? lighten(bg, 8) : darken(bg, 6),
    listHover: isDark ? lighten(bg, 8) : darken(bg, 6),
    listActive: selBg.slice(0, 7),
    activeIcon: isDark ? "#ffffff" : fg,
    inactiveIcon: lineNumFg,
    breadcrumbFg: lineNumFg,
    panelBg: bg,
    panelHeaderBg: sidebarBg,
    badgeBg: bracketBorder,
    badgeFg: isDark ? bg : "#ffffff",
    buttonBg: isDark ? darken(bracketBorder, 20) : bracketBorder,
    buttonHoverBg: isDark ? bracketBorder : lighten(bracketBorder, 20),
    inputBg: isDark ? lighten(bg, 8) : "#ffffff",
    inputBorder: isDark ? lighten(bg, 20) : darken(bg, 20),
    focusBorder: bracketBorder,
    cardBg: sidebarBg,
    cardBorder: isDark ? lighten(bg, 20) : darken(bg, 20),
    successGreen: isDark ? "#73c991" : "#388a34",
    warningYellow: isDark ? "#cca700" : "#bf8803",
    errorRed: isDark ? "#f14c4c" : "#e51400",
    textLink: bracketBorder,
    separator: withAlpha(isDark ? "#ffffff" : "#000000", "14"),
  };
}

// (moved to top: THEME_MAP, THEME_DEFS, BUILTIN_THEME_NAMES, DEFAULT_TOKENS)

// ── React context ────────────────────────────────────────────
interface ThemeContextValue {
  tokens: ThemeTokens;
  themeName: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  tokens: DEFAULT_TOKENS,
  themeName: DEFAULT_THEME,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ── Provider — listens to ThemeEvents.Changed ────────────────
export function ThemeProvider({
  eventBus,
  children,
}: {
  eventBus: InstanceType<typeof EventBus>;
  children: ReactNode;
}) {
  const [themeName, setThemeName] = useState(DEFAULT_THEME);
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_TOKENS);

  const handleThemeChange = useCallback((payload: unknown) => {
    const p = payload as { name?: string; themeId?: string };
    const key = p.name ?? p.themeId ?? "";
    const newTokens = THEME_MAP[key];
    if (newTokens) {
      const def = THEME_DEFS[key];
      setThemeName(def?.name ?? key);
      setTokens(newTokens);
    }
  }, []);

  useEffect(() => {
    eventBus.on(ThemeEvents.Changed, handleThemeChange);
    return () => { eventBus.off(ThemeEvents.Changed, handleThemeChange); };
  }, [eventBus, handleThemeChange]);

  return (
    <ThemeContext.Provider value={{ tokens, themeName }}>
      {children}
    </ThemeContext.Provider>
  );
}
