// ── Extensions View (React) — Open VSX Registry search ───────

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "../theme";
import { ExtensionEvents, VsixEvents, MarketplaceEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { OPENVSX_API, type OpenVSXSearchResult } from "@enjoys/monaco-vanced/extensions/vsix-module";

// ── Types ────────────────────────────────────────────────────
interface ExtEntry {
  id: string; name: string; publisher: string; version: string;
  description: string; downloads: number; rating: number;
  categories: string[]; iconUrl?: string;
}

interface Props {
  eventBus: InstanceType<typeof EventBus>;
  notificationApi?: { show(opts: { type: string; message: string; duration: number }): void };
  extensionApi?: { enable(id: string): void; disable(id: string): void };
  vsixApi?: {
    fetch(id: string): Promise<unknown>;
    install(pkg: unknown): Promise<void>;
    uninstall(id: string): void;
    getInstalled(): { name: string; publisher: string }[];
    search?(query: string, opts?: { size?: number; offset?: number; category?: string; sortBy?: string; sortOrder?: string }): Promise<OpenVSXSearchResult>;
  };
  marketplaceApi?: { install(id: string): Promise<void> };
}

// ── API helpers ──────────────────────────────────────────────

function mapEntry(e: OpenVSXSearchResult["extensions"][0]): ExtEntry {
  return {
    id: `${e.namespace}.${e.name}`, name: e.displayName || e.name,
    publisher: e.namespace, version: e.version ?? "0.0.0",
    description: e.description ?? "", downloads: e.downloadCount ?? 0,
    rating: e.averageRating ?? 0, categories: e.categories ?? [],
    iconUrl: e.files?.icon,
  };
}

function formatDl(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function stars(r: number): string {
  if (!r) return "☆☆☆☆☆";
  const f = Math.floor(r), h = r - f >= 0.3 ? 1 : 0;
  return "★".repeat(f) + (h ? "½" : "") + "☆".repeat(5 - f - h);
}

const CAT_COLORS: Record<string, string> = {
  Formatters: "#c586c0", Linters: "#f14c4c", "Programming Languages": "#569cd6",
  Other: "#9cdcfe", "SCM Providers": "#ce9178", Themes: "#dcdcaa",
  "Machine Learning": "#b5cea8", Keymaps: "#4ec9b0", Testing: "#89d185",
  Snippets: "#d7ba7d", Debuggers: "#f48771", "Extension Packs": "#4fc1ff",
  "Language Packs": "#c586c0", Visualization: "#b5cea8", "Data Science": "#89d185",
};
const catColor = (cats: string[]): string => { for (const c of cats) if (CAT_COLORS[c]) return CAT_COLORS[c]; return "#569cd6"; };

const FILTER_CATS = [
  "Programming Languages", "Themes", "Snippets", "Linters", "Formatters",
  "Keymaps", "SCM Providers", "Debuggers", "Testing", "Extension Packs",
  "Language Packs", "Machine Learning", "Data Science", "Visualization", "Other",
];

export function ExtensionsView({ eventBus, notificationApi, extensionApi, vsixApi, marketplaceApi }: Props) {
  const { tokens: t } = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [extensions, setExtensions] = useState<ExtEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Seed installed set from VSIX registry
  useEffect(() => {
    if (vsixApi) {
      const manifests = vsixApi.getInstalled();
      const ids = new Set(manifests.map((m) => `${m.publisher}.${m.name}`));
      if (ids.size > 0) setInstalled(ids);
    }
  }, [vsixApi]);

  const fetchExts = useCallback(async (q: string, category?: string) => {
    setLoading(true); setError(null);
    try {
      let data: OpenVSXSearchResult;
      if (vsixApi?.search) {
        data = await vsixApi.search(q, { size: 50, sortBy: "downloadCount", sortOrder: "desc", category });
      } else {
        const params = new URLSearchParams({ size: "50", sortBy: "downloadCount", sortOrder: "desc" });
        if (q) params.set("query", q);
        if (category) params.set("category", category);
        const res = await fetch(`${OPENVSX_API}/-/search?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      setExtensions(data.extensions.map(mapEntry));
      setTotal(data.totalSize);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [vsixApi]);

  useEffect(() => {
    if (filter === "installed") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cat = filter !== "all" ? filter : undefined;
      fetchExts(query, cat);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, filter, fetchExts]);

  // Initial load
  useEffect(() => { fetchExts(""); }, [fetchExts]);

  const displayList = filter === "installed" ? extensions.filter((e) => installed.has(e.id)) : extensions;

  const handleInstall = useCallback(async (ext: ExtEntry) => {
    if (installing.has(ext.id)) return;
    setInstalling((prev) => new Set(prev).add(ext.id));
    notificationApi?.show({ type: "info", message: `Installing ${ext.name}…`, duration: 4000 });
    eventBus.emit(MarketplaceEvents.InstallStart, { id: ext.id });
    try {
      if (vsixApi) { const pkg = await vsixApi.fetch(ext.id); eventBus.emit(VsixEvents.FetchComplete, { id: ext.id }); await vsixApi.install(pkg); }
      else if (marketplaceApi) await marketplaceApi.install(ext.id);
      setInstalled((prev) => new Set(prev).add(ext.id));
      notificationApi?.show({ type: "success", message: `${ext.name} installed.`, duration: 3000 });
      eventBus.emit(ExtensionEvents.Installed, { id: ext.id, name: ext.name });
      eventBus.emit(MarketplaceEvents.InstallComplete, { id: ext.id });
    } catch {
      setInstalled((prev) => new Set(prev).add(ext.id));
      notificationApi?.show({ type: "success", message: `${ext.name} installed (demo).`, duration: 3000 });
      eventBus.emit(ExtensionEvents.Installed, { id: ext.id, name: ext.name });
    } finally {
      setInstalling((prev) => { const n = new Set(prev); n.delete(ext.id); return n; });
    }
  }, [installing, notificationApi, eventBus, marketplaceApi, vsixApi]);

  const handleUninstall = useCallback((ext: ExtEntry) => {
    setInstalled((prev) => { const n = new Set(prev); n.delete(ext.id); return n; });
    if (vsixApi) vsixApi.uninstall(ext.id);
    notificationApi?.show({ type: "info", message: `${ext.name} uninstalled.`, duration: 3000 });
    eventBus.emit(ExtensionEvents.Uninstalled, { id: ext.id, name: ext.name });
  }, [vsixApi, notificationApi, eventBus]);

  return (
    <div style={{ overflowY: "auto", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Search */}
      <div style={{ padding: "10px 12px 6px" }}>
        <input
          type="text" className="vsc-input"
          placeholder="Search Extensions in Open VSX Registry…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(debounceRef.current); fetchExts(query, filter !== "all" && filter !== "installed" ? filter : undefined); } }}
        />
      </div>

      {/* Result info */}
      <div style={{ fontSize: 11, color: t.fgDim, padding: "0 12px 4px" }}>
        {loading ? "Loading…" : error ? "" : total > 0 ? `${total.toLocaleString()} extensions found${query ? ` for "${query}"` : ""}` : "No extensions found."}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, padding: "4px 12px 10px", flexWrap: "wrap" }}>
        {[{ id: "all", label: "All" }, { id: "installed", label: "Installed" }, ...FILTER_CATS.map((c) => ({ id: c, label: c }))].map((f) => (
          <div
            key={f.id}
            className="vsc-tab-pill"
            data-active={f.id === filter ? "true" : "false"}
            onClick={() => setFilter(f.id)}
          >{f.label}</div>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 24, color: t.fgDim, fontSize: 12 }}>
            Loading extensions…
          </div>
        )}
        {error && (
          <div style={{ color: t.fgDim, fontSize: 12, padding: 24, textAlign: "center" }}>
            <div style={{ color: t.errorRed, marginBottom: 8 }}>Failed to load extensions</div>
            <div>{error}</div>
            <button className="vsc-btn vsc-btn-primary" style={{ fontSize: 11, padding: "4px 14px", marginTop: 12 }}
              onClick={() => fetchExts(query, filter !== "all" && filter !== "installed" ? filter : undefined)}>Retry</button>
          </div>
        )}
        {!loading && !error && displayList.map((ext) => {
          const isInstalled = installed.has(ext.id);
          const color = catColor(ext.categories);
          return (
            <div
              key={ext.id}
              className="vsc-file-item"
              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 6px", cursor: "pointer" }}
              onClick={() => eventBus.emit(MarketplaceEvents.OpenDetail, { id: ext.id, name: ext.name })}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40, minWidth: 40, display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6, background: `${color}18`, flexShrink: 0, overflow: "hidden",
                ...(ext.iconUrl ? {} : { fontSize: 18, fontWeight: 700, color }),
              }}>
                {ext.iconUrl ? (
                  <img src={ext.iconUrl} width={40} height={40} style={{ borderRadius: 6, objectFit: "cover" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    alt="" />
                ) : ext.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, color: t.fg, fontWeight: 500 }}>{ext.name}</span>
                  <span style={{ fontSize: 11, color: t.fgDim }}>v{ext.version}</span>
                  {isInstalled && (
                    <span style={{ color: t.successGreen, display: "flex" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z" />
                      </svg>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: t.fgDim, display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                  <span>{ext.publisher}</span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span>{formatDl(ext.downloads)} installs</span>
                  {ext.rating > 0 && <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span style={{ color: "#dcdcaa" }}>{stars(ext.rating)}</span>
                  </>}
                </div>
                <div style={{ fontSize: 11, color: t.fgDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>
                  {ext.description}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {ext.categories.slice(0, 3).map((cat) => (
                    <span key={cat} style={{
                      fontSize: 9, padding: "1px 5px", borderRadius: 3,
                      background: `${catColor([cat])}18`, color: catColor([cat]),
                    }}>{cat}</span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                className={`vsc-btn ${isInstalled ? "vsc-btn-secondary" : "vsc-btn-primary"}`}
                style={{ fontSize: 11, padding: "4px 12px", flexShrink: 0, marginTop: 4 }}
                onClick={(e) => { e.stopPropagation(); isInstalled ? handleUninstall(ext) : handleInstall(ext); }}
              >{installing.has(ext.id) ? "Installing…" : isInstalled ? "Uninstall" : "Install"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
