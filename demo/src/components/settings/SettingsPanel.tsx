// ── React Settings — collapsible sidebar + theme-aware ───────

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTheme } from "../theme";
import { SearchInput, TabPill, CollapsibleSection } from "../shared";
import { SettingsEvents, ThemeEvents, ExtensionEvents, NotificationEvents } from "@enjoys/monaco-vanced/core/events";
import {
  EDITOR_SETTINGS, WORKBENCH_SETTINGS, FILES_SETTINGS,
  FEATURES_SETTINGS, WINDOW_SETTINGS, PLUGIN_CATALOG,
  THEMES, KEYBINDINGS, CATEGORIES, COMMONLY_USED_IDS,
  type SettingDef, type PluginInfo, type ThemeInfo, type SettingsCategory,
} from "./settings-data";
import { useSettingsStore } from "../../stores/settings-store";

type Emit = (ev: string, payload: unknown) => void;
type ThemeAPI = { apply(id: string): Promise<void>; getIndex(): { id: string; file: string }[]; getThemes(): { id: string; name: string; type: string; colors: Record<string, string> }[]; getCurrent(): string };
type ExtensionAPI = { enable(id: string): void; disable(id: string): void } | undefined;

// ══════════════════════════════════════════════════════════════
// Entry point
// ══════════════════════════════════════════════════════════════

export function SettingsPanel({ emit, themeApi, extensionApi }: { emit: Emit; themeApi?: ThemeAPI; extensionApi?: ExtensionAPI }) {
  const { tokens: t } = useTheme();
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("commonly-used");
  const [scope, setScope] = useState<"User" | "Workspace">("User");

  const allSettings = useMemo(() => {
    const base = [
      ...EDITOR_SETTINGS, ...WORKBENCH_SETTINGS,
      ...FILES_SETTINGS, ...FEATURES_SETTINGS, ...WINDOW_SETTINGS,
    ];
    for (const p of PLUGIN_CATALOG) base.push(...p.settings);
    return base;
  }, []);

  const handleSettingChange = useCallback((id: string, value: unknown) => {
    useSettingsStore.getState().setSetting(id, value);
    emit(SettingsEvents.Change, { id, value });
  }, [emit]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.editorBg, color: t.fg }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px", borderBottom: `1px solid ${t.border}`,
        background: t.editorBg,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={t.fgDim}>
          <path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.42 3.42-3.52-2.35-.83 4.16H9.58l-.84-4.15-3.52 2.35-3.42-3.43 2.35-3.52L0 12.42V7.58l4.15-.84L1.8 3.22 5.22 1.8l3.52 2.35L9.58 0h4.84l.84 4.15 3.52-2.35 3.42 3.42-2.35 3.53zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
        </svg>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Settings</span>
        <SearchInput
          placeholder="Search settings..."
          value={search}
          onChange={(v) => { setSearch(v); if (v) setActiveCat("search"); }}
          style={{ flex: 1, maxWidth: 500 }}
        />
        <div style={{ display: "flex", gap: 2, marginLeft: "auto" }}>
          {(["User", "Workspace"] as const).map((s) => (
            <TabPill key={s} label={s} active={scope === s} onClick={() => setScope(s)} />
          ))}
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar nav — collapsible */}
        <SidebarNav
          categories={CATEGORIES}
          activeCat={activeCat}
          onSelect={(id) => { setActiveCat(id); setSearch(""); }}
        />
        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 40px" }}>
          {search ? (
            <SearchResults allSettings={allSettings} query={search} onSettingChange={handleSettingChange} emit={emit} />
          ) : activeCat === "commonly-used" ? (
            <SettingsList title="Commonly Used" settings={allSettings.filter((s) => COMMONLY_USED_IDS.includes(s.id))} onChange={handleSettingChange} />
          ) : activeCat === "text-editor" ? (
            <SettingsList title="Text Editor" settings={EDITOR_SETTINGS} onChange={handleSettingChange} />
          ) : activeCat === "workbench" ? (
            <SettingsList title="Workbench" settings={WORKBENCH_SETTINGS} onChange={handleSettingChange} />
          ) : activeCat === "files" ? (
            <SettingsList title="Files" settings={FILES_SETTINGS} onChange={handleSettingChange} />
          ) : activeCat === "window" ? (
            <SettingsList title="Window" settings={WINDOW_SETTINGS} onChange={handleSettingChange} />
          ) : activeCat === "features" ? (
            <SettingsList title="Features" settings={FEATURES_SETTINGS} onChange={handleSettingChange} />
          ) : activeCat === "plugins" ? (
            <PluginsConfig emit={emit} extensionApi={extensionApi} />
          ) : activeCat === "themes" ? (
            <ThemesConfig emit={emit} themeApi={themeApi} />
          ) : activeCat === "keybindings" ? (
            <KeybindingsConfig />
          ) : (
            <SubcategorySettings categoryId={activeCat} allSettings={allSettings} onChange={handleSettingChange} />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Sidebar Nav — collapsible categories
// ══════════════════════════════════════════════════════════════

function SidebarNav({
  categories, activeCat, onSelect,
}: {
  categories: SettingsCategory[];
  activeCat: string;
  onSelect: (id: string) => void;
}) {
  const { tokens: t } = useTheme();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div style={{
      width: 220, minWidth: 180, overflowY: "auto",
      borderRight: `1px solid ${t.border}`, padding: "8px 0",
      background: t.sidebarBg,
    }}>
      {categories.map((cat) => {
        const isActive = cat.id === activeCat;
        const isCollapsed = collapsed[cat.id] ?? false;
        const hasChildren = cat.children && cat.children.length > 0;

        return (
          <div key={cat.id}>
            <NavItem
              label={cat.label}
              active={isActive}
              hasChildren={hasChildren}
              collapsed={isCollapsed}
              onClick={() => { onSelect(cat.id); }}
              onToggle={hasChildren ? () => toggle(cat.id) : undefined}
              indent={0}
            />
            {hasChildren && !isCollapsed && cat.children!.map((sub) => (
              <NavItem
                key={sub.id}
                label={sub.label}
                active={sub.id === activeCat}
                indent={1}
                onClick={() => onSelect(sub.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function NavItem({
  label, active, hasChildren, collapsed, indent = 0, onClick, onToggle,
}: {
  label: string;
  active: boolean;
  hasChildren?: boolean;
  collapsed?: boolean;
  indent?: number;
  onClick: () => void;
  onToggle?: () => void;
}) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: `5px 16px 5px ${indent ? 40 : 16}px`,
        cursor: "pointer", fontSize: indent ? 12 : 13,
        color: active ? t.fg : t.fgDim,
        background: active ? t.hover : hovered ? t.hover : "transparent",
        borderLeft: indent ? "none" : `2px solid ${active ? t.accent : "transparent"}`,
        transition: "all .1s",
      }}
    >
      {hasChildren && (
        <span
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          style={{
            display: "inline-flex", transition: "transform .15s",
            transform: collapsed ? "rotate(0)" : "rotate(90deg)",
            flexShrink: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Settings List
// ══════════════════════════════════════════════════════════════

function SettingsList({
  title, settings, onChange,
}: {
  title: string;
  settings: SettingDef[];
  onChange: (id: string, value: unknown) => void;
}) {
  const { tokens: t } = useTheme();

  const groups = useMemo(() => {
    const g = new Map<string, SettingDef[]>();
    for (const s of settings) {
      const arr = g.get(s.group) ?? [];
      arr.push(s);
      g.set(s.group, arr);
    }
    return g;
  }, [settings]);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 20 }}>{settings.length} settings</div>
      {Array.from(groups.entries()).map(([group, items]) => (
        <CollapsibleSection key={group} title={group} badge={items.length}>
          {items.map((s) => (
            <SettingItem key={s.id} setting={s} onChange={onChange} />
          ))}
        </CollapsibleSection>
      ))}
    </div>
  );
}

function SubcategorySettings({
  categoryId, allSettings, onChange,
}: {
  categoryId: string;
  allSettings: SettingDef[];
  onChange: (id: string, value: unknown) => void;
}) {
  const { tokens: t } = useTheme();
  const groupName = categoryId.replace(/-/g, " ");
  const matched = allSettings.filter(
    (s) => s.group.toLowerCase() === groupName ||
           s.group.toLowerCase().replace(/ /g, "-") === categoryId,
  );

  if (matched.length === 0) {
    return <div style={{ color: t.fgDim, padding: 24, fontSize: 13 }}>No settings in this category.</div>;
  }

  return <SettingsList title={matched[0].group} settings={matched} onChange={onChange} />;
}

function SearchResults({
  allSettings, query, onSettingChange, emit,
}: {
  allSettings: SettingDef[];
  query: string;
  onSettingChange: (id: string, value: unknown) => void;
  emit: Emit;
}) {
  const { tokens: t } = useTheme();
  const q = query.toLowerCase();
  const matched = allSettings.filter(
    (s) => s.label.toLowerCase().includes(q) ||
           s.desc.toLowerCase().includes(q) ||
           s.id.toLowerCase().includes(q) ||
           (s.tags ?? []).some((tag) => tag.includes(q)),
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 16 }}>
        {matched.length} setting{matched.length !== 1 ? "s" : ""} found for "{query}"
      </div>
      {matched.map((s) => (
        <SettingItem key={s.id} setting={s} onChange={onSettingChange} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Setting Item
// ══════════════════════════════════════════════════════════════

function SettingItem({
  setting, onChange,
}: {
  setting: SettingDef;
  onChange: (id: string, value: unknown) => void;
}) {
  const { tokens: t } = useTheme();
  const storeValue = useSettingsStore((s) => s.settings[setting.id]);
  const value = storeValue !== undefined ? String(storeValue) : setting.value;

  const handleChange = (newVal: string) => {
    const emitVal = setting.type === "number" ? Number(newVal)
      : setting.type === "checkbox" ? newVal === "true"
      : newVal;
    onChange(setting.id, emitVal);
  };

  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid color-mix(in srgb, ${t.border} 13%, transparent)` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{setting.label}</span>
        <span style={{ fontSize: 11, color: t.fgDim, fontFamily: "monospace" }}>{setting.id}</span>
      </div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 8, lineHeight: 1.5 }}>{setting.desc}</div>
      {setting.type === "checkbox" ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => handleChange(String(e.target.checked))}
            style={{ accentColor: t.accent, width: 16, height: 16, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12 }}>{value === "true" ? "Enabled" : "Disabled"}</span>
        </label>
      ) : setting.type === "select" ? (
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            minWidth: 180, padding: "5px 8px", fontSize: 13,
            background: t.inputBg, color: t.fg,
            border: `1px solid ${t.inputBorder}`, borderRadius: 4,
            outline: "none", fontFamily: "inherit",
          }}
        >
          {(setting.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={setting.type}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: setting.type === "number" ? 100 : 280,
            padding: "5px 8px", fontSize: 13,
            background: t.inputBg, color: t.fg,
            border: `1px solid ${t.inputBorder}`, borderRadius: 4,
            outline: "none", fontFamily: "inherit",
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Plugins Config
// ══════════════════════════════════════════════════════════════

function PluginsConfig({ emit, extensionApi }: { emit: Emit; extensionApi?: ExtensionAPI }) {
  const { tokens: t } = useTheme();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const cats = useMemo(() => {
    const set = new Set(PLUGIN_CATALOG.map((p) => p.category));
    return ["all", "installed", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    let list = PLUGIN_CATALOG;
    if (filter === "installed") list = list.filter((p) => p.installed);
    else if (filter !== "all") list = list.filter((p) => p.category === filter);
    const q = query.toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    return list;
  }, [filter, query]);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Plugin Configuration</div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 16 }}>
        Configure all {PLUGIN_CATALOG.length} plugins.
      </div>
      <SearchInput placeholder="Filter plugins..." value={query} onChange={setQuery} style={{ marginBottom: 16, maxWidth: 400 }} />
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map((c) => (
          <TabPill
            key={c}
            label={c === "all" ? `All (${PLUGIN_CATALOG.length})` : c === "installed" ? "Installed" : c}
            active={filter === c}
            onClick={() => setFilter(c)}
          />
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ color: t.fgDim, padding: 16, fontSize: 13 }}>No plugins match the filter.</div>
      ) : (
        filtered.map((p) => <PluginCard key={p.id} plugin={p} emit={emit} extensionApi={extensionApi} />)
      )}
    </div>
  );
}

function PluginCard({ plugin, emit, extensionApi }: { plugin: PluginInfo; emit: Emit; extensionApi?: ExtensionAPI }) {
  const { tokens: t } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const pluginState = useSettingsStore((s) => s.plugins[plugin.id]);
  const enabled = pluginState?.enabled ?? plugin.installed;

  const handleToggle = useCallback(() => {
    const next = !enabled;
    useSettingsStore.getState().setPluginEnabled(plugin.id, next);
    if (extensionApi) {
      if (next) extensionApi.enable(plugin.id);
      else extensionApi.disable(plugin.id);
    }
    emit(next ? ExtensionEvents.Enabled : ExtensionEvents.Disabled, { id: plugin.id, name: plugin.name });
  }, [enabled, extensionApi, plugin, emit]);

  return (
    <div style={{
      marginBottom: 12,
      border: `1px solid ${t.border}`,
      borderRadius: 6, overflow: "hidden",
      background: t.cardBg,
      opacity: enabled ? 1 : 0.6,
      transition: "opacity .15s",
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }}
      >
        <div style={{
          width: 32, height: 32, minWidth: 32,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, background: `${plugin.color}18`,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={plugin.color}>
            <path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{plugin.name}</span>
            <span style={{ fontSize: 11, color: t.fgDim, fontFamily: "monospace" }}>{plugin.id}</span>
            {plugin.installed && (
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: `color-mix(in srgb, ${t.successGreen} 13%, transparent)`, color: t.successGreen }}>
                Installed
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: t.fgDim, marginTop: 2 }}>{plugin.desc}</div>
        </div>
        {/* Enable / Disable toggle */}
        <div
          onClick={(e) => { e.stopPropagation(); handleToggle(); }}
          title={enabled ? "Disable plugin" : "Enable plugin"}
          style={{
            width: 36, height: 20, borderRadius: 10, cursor: "pointer",
            background: enabled ? t.accent : t.inputBg,
            border: `1px solid ${enabled ? t.accent : t.inputBorder}`,
            position: "relative", transition: "background .2s, border-color .2s",
            flexShrink: 0,
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: "50%",
            background: "#fff", position: "absolute",
            top: 2, left: enabled ? 19 : 2,
            transition: "left .2s",
          }} />
        </div>
        <span style={{
          fontSize: 10, padding: "2px 6px", borderRadius: 3,
          background: "rgba(255,255,255,0.06)", color: t.fgDim,
        }}>
          {plugin.category}
        </span>
        <span style={{
          display: "flex", color: t.fgDim,
          transition: "transform .15s",
          transform: expanded ? "rotate(90deg)" : "rotate(0)",
        }}>
          <svg width="12" height="12" viewBox="0 0 16 16">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "10px 14px" }}>
          {plugin.settings.length > 0 ? (
            plugin.settings.map((s) => (
              <SettingItem key={s.id} setting={s} onChange={(id, val) => {
                useSettingsStore.getState().setSetting(id, val);
                emit(SettingsEvents.Change, { id, value: val });
              }} />
            ))
          ) : (
            <div style={{ fontSize: 12, color: t.fgDim, padding: "8px 0", fontStyle: "italic" }}>
              No configurable settings for this plugin.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Themes Config
// ══════════════════════════════════════════════════════════════

const LIGHT_KEYWORDS = /light|solarized-light|github-light|min-light|quiet-light|ayu-light/i;

function cdnEntryToThemeInfo(entry: { id: string; file: string }): ThemeInfo {
  const isLight = LIGHT_KEYWORDS.test(entry.id);
  return {
    id: entry.id,
    name: entry.id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    type: isLight ? "light" : "dark",
    colors: isLight
      ? { bg: "#ffffff", fg: "#333333", accent: "#0366d6", sidebar: "#f6f8fa" }
      : { bg: "#1e1e1e", fg: "#cccccc", accent: "#007acc", sidebar: "#252526" },
    remote: true,
  };
}

function ThemesConfig({ emit, themeApi }: { emit: Emit; themeApi?: ThemeAPI }) {
  const { tokens: t, themeName } = useTheme();
  const [filter, setFilter] = useState<"all" | "dark" | "light" | "contrast">("all");
  const [cdnThemes, setCdnThemes] = useState<ThemeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(() => themeApi?.getCurrent() ?? "");

  useEffect(() => {
    if (!themeApi) return;
    const index = themeApi.getIndex();
    if (index.length > 0) {
      const builtinIds = new Set(THEMES.map((t) => t.id));
      setCdnThemes(index.filter((e) => !builtinIds.has(e.id)).map(cdnEntryToThemeInfo));
    }
  }, [themeApi]);

  const allThemes = useMemo(() => [...THEMES, ...cdnThemes], [cdnThemes]);
  const filtered = filter === "all" ? allThemes : allThemes.filter((th) => th.type === filter);

  const handleApply = useCallback(async (theme: ThemeInfo) => {
    // Prevent duplicate calls: skip if already active or a fetch is in progress
    if (loading || theme.id === activeId || theme.name === activeId) return;

    if (themeApi) {
      if (theme.remote) {
        setLoading(true);
        emit(NotificationEvents.Show, { id: "theme-apply", type: "info", message: `Fetching "${theme.name}" from CDN…`, duration: 4000 });
      }
      try {
        await themeApi.apply(theme.id);
        setActiveId(theme.id);
        if (theme.remote) {
          emit(NotificationEvents.Show, { id: "theme-apply", type: "success", message: `Theme "${theme.name}" activated.`, duration: 3000 });
        }
      } catch {
        const monacoTheme = theme.type === "light" ? "vs" : theme.type === "contrast" ? "hc-black" : "vs-dark";
        emit(ThemeEvents.Changed, { name: theme.name, type: theme.type, monacoTheme });
        setActiveId(theme.id);
        if (theme.remote) {
          emit(NotificationEvents.Show, { id: "theme-apply", type: "warning", message: `Failed to fetch "${theme.name}". Using fallback.`, duration: 3000 });
        }
      } finally {
        setLoading(false);
      }
    } else {
      const monacoTheme = theme.type === "light" ? "vs" : theme.type === "contrast" ? "hc-black" : "vs-dark";
      emit(ThemeEvents.Changed, { name: theme.name, type: theme.type, monacoTheme });
      setActiveId(theme.id);
    }
  }, [themeApi, emit, loading, activeId]);

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Color Themes</div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 20 }}>
        Select a color theme. {allThemes.length} available{cdnThemes.length > 0 ? ` (${THEMES.length} builtin + ${cdnThemes.length} from CDN)` : ""}.
        {loading && <span style={{ marginLeft: 8, color: t.accent }}>Loading theme…</span>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["all", "dark", "light", "contrast"] as const).map((f) => (
          <TabPill key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} active={filter === f} onClick={() => setFilter(f)} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {filtered.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} active={theme.name === themeName || theme.id === themeName} onApply={handleApply} />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme, active, onApply }: { theme: ThemeInfo; active: boolean; onApply: (t: ThemeInfo) => void }) {
  const { tokens: t } = useTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onApply(theme)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer", borderRadius: 8, overflow: "hidden",
        border: `2px solid ${active ? t.accent : hovered ? t.fgDim : t.border}`,
        transition: "border-color .15s",
        background: t.cardBg,
      }}
    >
      {/* Preview */}
      <div style={{ height: 64, background: theme.colors.bg, display: "flex", overflow: "hidden" }}>
        <div style={{ width: 28, background: theme.colors.sidebar, borderRight: "1px solid rgba(255,255,255,0.06)" }} />
        <div style={{ flex: 1, padding: "8px 10px" }}>
          <div style={{ width: "50%", height: 4, background: `${theme.colors.fg}30`, borderRadius: 2, marginBottom: 4 }} />
          <div style={{ width: "75%", height: 4, background: `${theme.colors.fg}20`, borderRadius: 2, marginBottom: 4 }} />
          <div style={{ width: "35%", height: 4, background: `${theme.colors.accent}60`, borderRadius: 2, marginBottom: 4 }} />
          <div style={{ width: "60%", height: 4, background: `${theme.colors.fg}15`, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ height: 3, background: theme.colors.accent }} />
      {/* Label */}
      <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{theme.name}</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {theme.remote && (
            <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: `${t.accent}30`, color: t.accent }}>CDN</span>
          )}
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 3,
            background: "rgba(255,255,255,0.06)", color: t.fgDim,
          }}>
            {theme.type}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Keybindings Config
// ══════════════════════════════════════════════════════════════

function KeybindingsConfig() {
  const { tokens: t } = useTheme();
  const [query, setQuery] = useState("");

  const filtered = query
    ? KEYBINDINGS.filter((k) => k.command.toLowerCase().includes(query.toLowerCase()) || k.key.toLowerCase().includes(query.toLowerCase()))
    : KEYBINDINGS;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Keyboard Shortcuts</div>
      <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 16 }}>
        {KEYBINDINGS.length} keybindings configured.
      </div>
      <SearchInput placeholder="Search keybindings..." value={query} onChange={setQuery} style={{ marginBottom: 12, maxWidth: 400 }} />
      {/* Table header */}
      <div style={{
        display: "flex", padding: "6px 12px",
        fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px",
        color: t.fgDim, borderBottom: `1px solid ${t.border}`, marginBottom: 4,
      }}>
        <span style={{ flex: 1 }}>Command</span>
        <span style={{ width: 160, textAlign: "center" }}>Keybinding</span>
        <span style={{ width: 120 }}>When</span>
      </div>
      {filtered.map((kb) => (
        <div
          key={kb.command}
          style={{
            display: "flex", alignItems: "center", padding: "6px 12px",
            height: 32, fontSize: 13, borderRadius: 3,
            transition: "background .1s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.listHover; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span style={{ flex: 1 }}>{kb.command}</span>
          <span style={{ width: 160, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
            {kb.key.split("+").map((part, i) => (
              <span key={i}>
                {i > 0 && <span style={{ color: t.fgDim, fontSize: 10 }}>+</span>}
                <span style={{
                  display: "inline-block", padding: "2px 6px",
                  background: t.cardBg, border: `1px solid ${t.borderLight}`,
                  borderRadius: 3, fontSize: 11, fontFamily: "monospace",
                }}>
                  {part.trim()}
                </span>
              </span>
            ))}
          </span>
          <span style={{ width: 120, fontSize: 11, color: t.fgDim }}>{kb.when || "—"}</span>
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ color: t.fgDim, padding: 16, fontSize: 13, textAlign: "center" }}>No keybindings found.</div>
      )}
    </div>
  );
}
