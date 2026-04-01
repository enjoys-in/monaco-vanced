// ── Reactive theme system — uses builtin ThemeDefinition from plugin ──

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { ThemeDefinition } from "../../../../plugins/theming/theme-module/types";
import { ThemeEvents } from "@enjoys/monaco-vanced/core/events";

// ── Builtin theme JSONs from plugin ──────────────────────────
import draculaJson from "../../../../plugins/theming/theme-module/builtin/dracula.json";
import githubDarkJson from "../../../../plugins/theming/theme-module/builtin/github-dark.json";
import githubLightJson from "../../../../plugins/theming/theme-module/builtin/github-light.json";
import monokaiJson from "../../../../plugins/theming/theme-module/builtin/monokai.json";
import oneDarkJson from "../../../../plugins/theming/theme-module/builtin/one-dark.json";

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

// ── Builtin themes as ThemeDefinition ────────────────────────
const BUILTIN_THEMES: ThemeDefinition[] = [
  draculaJson as unknown as ThemeDefinition,
  githubDarkJson as unknown as ThemeDefinition,
  githubLightJson as unknown as ThemeDefinition,
  monokaiJson as unknown as ThemeDefinition,
  oneDarkJson as unknown as ThemeDefinition,
];

// ── Convert VS Code ThemeDefinition → ThemeTokens ────────────
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

// ── Build THEME_MAP from builtin JSONs ───────────────────────
export const THEME_MAP: Record<string, ThemeTokens> = {};
export const THEME_DEFS: Record<string, ThemeDefinition> = {};

for (const def of BUILTIN_THEMES) {
  THEME_MAP[def.name] = themeDefToTokens(def);
  THEME_DEFS[def.name] = def;
}

/** Ordered list of builtin theme names */
export const BUILTIN_THEME_NAMES = BUILTIN_THEMES.map((d) => d.name);

const DEFAULT_THEME = "Dracula";
const DEFAULT_TOKENS = THEME_MAP[DEFAULT_THEME];

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
    const { name } = payload as { name: string };
    const newTokens = THEME_MAP[name];
    if (newTokens) {
      setThemeName(name);
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
