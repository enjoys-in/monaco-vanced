// ── Reactive Settings Store — Zustand + Dexie persistence ────
// Central store for all settings values AND plugin enable/disable states.
// All React components subscribe via selectors → automatic re-render on change.
// Persists to IndexedDB (Dexie) so state survives browser reload.

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import Dexie, { type EntityTable } from "dexie";

// ── Dexie DB ─────────────────────────────────────────────────

interface SettingsRecord {
  id: string; // "settings" | "plugins"
  data: Record<string, unknown>;
  updatedAt: number;
}

class DemoSettingsDB extends Dexie {
  records!: EntityTable<SettingsRecord, "id">;

  constructor() {
    super("monaco-vanced-demo-settings");
    this.version(1).stores({ records: "id" });
  }
}

const db = new DemoSettingsDB();

// ── Types ────────────────────────────────────────────────────

export interface PluginState {
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface SettingsStoreState {
  /** All settings: key → value */
  settings: Record<string, unknown>;
  /** Plugin enable/disable: pluginId → state */
  plugins: Record<string, PluginState>;
  /** Whether the store has hydrated from IndexedDB */
  hydrated: boolean;

  // ── Actions ──────────────────────────────────────────────
  setSetting: (key: string, value: unknown) => void;
  setSettings: (batch: Record<string, unknown>) => void;
  getSetting: <T = unknown>(key: string, fallback?: T) => T;
  setPluginEnabled: (pluginId: string, enabled: boolean) => void;
  setPluginConfig: (pluginId: string, key: string, value: unknown) => void;
  initPlugin: (pluginId: string, enabled?: boolean, config?: Record<string, unknown>) => void;
  hydrate: () => Promise<void>;
}

// ── Debounced persist helper ─────────────────────────────────

let persistSettingsTimer: ReturnType<typeof setTimeout> | null = null;
let persistPluginsTimer: ReturnType<typeof setTimeout> | null = null;

function persistSettings(settings: Record<string, unknown>) {
  if (persistSettingsTimer) clearTimeout(persistSettingsTimer);
  persistSettingsTimer = setTimeout(() => {
    db.records.put({ id: "settings", data: settings, updatedAt: Date.now() }).catch(console.warn);
  }, 300);
}

function persistPlugins(plugins: Record<string, PluginState>) {
  if (persistPluginsTimer) clearTimeout(persistPluginsTimer);
  persistPluginsTimer = setTimeout(() => {
    db.records.put({ id: "plugins", data: plugins as unknown as Record<string, unknown>, updatedAt: Date.now() }).catch(console.warn);
  }, 300);
}

// ── Store ────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStoreState>()(
  subscribeWithSelector((set, get) => ({
    settings: {},
    plugins: {},
    hydrated: false,

    setSetting(key, value) {
      set((s) => {
        const next = { ...s.settings, [key]: value };
        persistSettings(next);
        return { settings: next };
      });
    },

    setSettings(batch) {
      set((s) => {
        const next = { ...s.settings, ...batch };
        persistSettings(next);
        return { settings: next };
      });
    },

    getSetting<T = unknown>(key: string, fallback?: T): T {
      return (get().settings[key] as T) ?? (fallback as T);
    },

    setPluginEnabled(pluginId, enabled) {
      set((s) => {
        const prev = s.plugins[pluginId] ?? { enabled: true, config: {} };
        const next = { ...s.plugins, [pluginId]: { ...prev, enabled } };
        persistPlugins(next);
        return { plugins: next };
      });
    },

    setPluginConfig(pluginId, key, value) {
      set((s) => {
        const prev = s.plugins[pluginId] ?? { enabled: true, config: {} };
        const nextConfig = { ...prev.config, [key]: value };
        const next = { ...s.plugins, [pluginId]: { ...prev, config: nextConfig } };
        persistPlugins(next);
        return { plugins: next };
      });
    },

    initPlugin(pluginId, enabled = true, config = {}) {
      const current = get().plugins[pluginId];
      if (current) return; // already initialized — don't overwrite persisted state
      set((s) => ({
        plugins: { ...s.plugins, [pluginId]: { enabled, config } },
      }));
    },

    async hydrate() {
      try {
        const [settingsRec, pluginsRec] = await Promise.all([
          db.records.get("settings"),
          db.records.get("plugins"),
        ]);
        set({
          settings: settingsRec?.data ?? {},
          plugins: (pluginsRec?.data ?? {}) as Record<string, PluginState>,
          hydrated: true,
        });
      } catch {
        set({ hydrated: true });
      }
    },
  })),
);
