// ── Extensions View — Open VSX Registry powered ─────────────

import { C } from "../../types";
import { el } from "../../utils";
import type { ViewContext } from "./types";
import { ExtensionEvents, VsixEvents, MarketplaceEvents } from "@enjoys/monaco-vanced/core/events";

// ── Types ────────────────────────────────────────────────────
interface ExtEntry {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  downloads: number;
  rating: number;
  categories: string[];
  iconUrl?: string;
}

// ── Open VSX API ─────────────────────────────────────────────
const OPENVSX = "https://open-vsx.org";

interface OpenVSXSearchResult {
  totalSize: number;
  extensions: {
    name: string;
    namespace: string;
    version: string;
    displayName?: string;
    description?: string;
    downloadCount?: number;
    averageRating?: number;
    categories?: string[];
    files?: { icon?: string };
  }[];
}

function mapEntry(e: OpenVSXSearchResult["extensions"][0]): ExtEntry {
  return {
    id: `${e.namespace}.${e.name}`,
    name: e.displayName || e.name,
    publisher: e.namespace,
    version: e.version ?? "0.0.0",
    description: e.description ?? "",
    downloads: e.downloadCount ?? 0,
    rating: e.averageRating ?? 0,
    categories: e.categories ?? [],
    iconUrl: e.files?.icon,
  };
}

let _cache: { key: string; data: ExtEntry[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60_000; // 5 min

async function fetchOpenVSX(query: string, size = 50, category?: string): Promise<{ entries: ExtEntry[]; total: number }> {
  const cacheKey = `${query}|${size}|${category ?? ""}`;
  if (_cache && _cache.key === cacheKey && Date.now() - _cache.ts < CACHE_TTL) {
    return { entries: _cache.data, total: _cache.data.length };
  }
  const params = new URLSearchParams({ size: String(size), sortBy: "downloadCount", sortOrder: "desc" });
  if (query) params.set("query", query);
  if (category) params.set("category", category);
  const res = await fetch(`${OPENVSX}/-/search?${params}`);
  if (!res.ok) throw new Error(`Open VSX ${res.status}`);
  const data: OpenVSXSearchResult = await res.json();
  const entries = data.extensions.map(mapEntry);
  _cache = { key: cacheKey, data: entries, ts: Date.now() };
  return { entries, total: data.totalSize };
}

// ── Helpers ──────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  "Formatters": "#c586c0", "Linters": "#f14c4c", "Programming Languages": "#569cd6",
  "Other": "#9cdcfe", "SCM Providers": "#ce9178", "Themes": "#dcdcaa",
  "Machine Learning": "#b5cea8", "Keymaps": "#4ec9b0", "Testing": "#89d185",
  "Snippets": "#d7ba7d", "Debuggers": "#f48771", "Extension Packs": "#4fc1ff",
  "Language Packs": "#c586c0", "Visualization": "#b5cea8", "Data Science": "#89d185",
};

function catColor(cats: string[]): string {
  for (const c of cats) { if (CAT_COLORS[c]) return CAT_COLORS[c]; }
  return "#569cd6";
}

function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function renderStars(rating: number): string {
  if (!rating) return "☆☆☆☆☆";
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

// ── Category list for filter pills ───────────────────────────
const FILTER_CATEGORIES = [
  "Programming Languages", "Themes", "Snippets", "Linters", "Formatters",
  "Keymaps", "SCM Providers", "Debuggers", "Testing", "Extension Packs",
  "Language Packs", "Machine Learning", "Data Science", "Visualization", "Other",
];

export function buildExtensionsView(ctx: ViewContext): HTMLElement {
  const { apis, eventBus, vsixApi, marketplaceApi } = ctx;

  const installedIds = new Set<string>();
  const installingIds = new Set<string>();

  // ── State ──────────────────────────────────────────────────
  let currentExts: ExtEntry[] = [];
  let totalResults = 0;
  let loading = false;
  let activeFilter = "all";
  let currentPage = 0;
  const PAGE_SIZE = 50;

  // ── Container ──────────────────────────────────────────────
  const container = el("div", { style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;" });

  // ── Search ─────────────────────────────────────────────────
  const searchWrap = el("div", { style: "padding:10px 12px 6px;" });
  const searchInput = el("input", { type: "text", placeholder: "Search Extensions in Open VSX Registry…", class: "vsc-input" }) as HTMLInputElement;
  searchWrap.appendChild(searchInput);

  // ── Result count ───────────────────────────────────────────
  const resultInfo = el("div", { style: `font-size:11px;color:${C.fgDim};padding:0 12px 4px;` });

  // ── Filters ────────────────────────────────────────────────
  const filterRow = el("div", { style: "display:flex;gap:4px;padding:4px 12px 10px;flex-wrap:wrap;" });
  const staticFilters = [
    { id: "all", label: "All" },
    { id: "installed", label: "Installed" },
  ];
  const filters = [
    ...staticFilters,
    ...FILTER_CATEGORIES.map((c) => ({ id: c, label: c })),
  ];
  const filterEls: HTMLElement[] = [];
  for (const f of filters) {
    const pill = el("div", { class: "vsc-tab-pill", "data-active": f.id === activeFilter ? "true" : "false" }, f.label);
    pill.addEventListener("click", () => {
      activeFilter = f.id;
      filterEls.forEach((fe) => fe.dataset.active = "false");
      pill.dataset.active = "true";
      currentPage = 0;
      loadExtensions();
    });
    filterEls.push(pill);
    filterRow.appendChild(pill);
  }

  // ── List + loading ─────────────────────────────────────────
  const extList = el("div", { style: "flex:1;overflow-y:auto;padding:0 12px;" });
  const loadingEl = el("div", { style: `text-align:center;padding:24px;color:${C.fgDim};font-size:12px;display:none;` });
  loadingEl.innerHTML = `<div style="display:inline-block;width:20px;height:20px;border:2px solid ${C.fgDim};border-top-color:transparent;border-radius:50%;animation:spin .6s linear infinite;"></div><div style="margin-top:8px;">Loading extensions…</div>`;

  // ── Load extensions from Open VSX ──────────────────────────
  async function loadExtensions() {
    if (loading) return;

    // Installed filter — client-side only
    if (activeFilter === "installed") {
      const installed = currentExts.filter((e) => installedIds.has(e.id));
      resultInfo.textContent = `${installed.length} installed`;
      renderList(installed);
      return;
    }

    loading = true;
    loadingEl.style.display = "";
    extList.innerHTML = "";
    extList.appendChild(loadingEl);

    const query = searchInput.value.trim();
    const category = activeFilter !== "all" ? activeFilter : undefined;

    try {
      // Fetch directly from Open VSX registry
      const result = await fetchOpenVSX(query, PAGE_SIZE, category);
      currentExts = result.entries;
      totalResults = result.total;

      resultInfo.textContent = totalResults > 0
        ? `${totalResults.toLocaleString()} extensions found${query ? ` for "${query}"` : ""}${category ? ` in ${category}` : ""}`
        : "No extensions found.";
      renderList(currentExts);
    } catch (err) {
      extList.innerHTML = "";
      const errorMsg = el("div", { style: `color:${C.fgDim};font-size:12px;padding:24px;text-align:center;` });
      errorMsg.innerHTML = `<div style="color:#f14c4c;margin-bottom:8px;">Failed to load extensions</div><div>${(err as Error).message}</div><div style="margin-top:12px;"><button class="vsc-btn vsc-btn-primary" style="font-size:11px;padding:4px 14px;">Retry</button></div>`;
      errorMsg.querySelector("button")?.addEventListener("click", () => loadExtensions());
      extList.appendChild(errorMsg);
      resultInfo.textContent = "";
    } finally {
      loading = false;
      loadingEl.style.display = "none";
    }
  }

  // ── Install via marketplace / VSIX pipeline ────────────────
  async function installExtension(ext: ExtEntry, btn: HTMLButtonElement) {
    if (installingIds.has(ext.id)) return;
    installingIds.add(ext.id);
    btn.textContent = "Installing…";
    btn.className = "vsc-btn vsc-btn-secondary";
    btn.setAttribute("disabled", "true");
    apis.notification?.show({ type: "info", message: `Installing ${ext.name}…`, duration: 4000 });
    eventBus.emit(MarketplaceEvents.InstallStart, { id: ext.id });

    try {
      if (marketplaceApi) {
        await marketplaceApi.install(ext.id);
      } else if (vsixApi) {
        const pkg = await vsixApi.fetch(ext.id);
        eventBus.emit(VsixEvents.FetchComplete, { id: ext.id });
        await vsixApi.install(pkg);
      }
      installedIds.add(ext.id);
      btn.textContent = "Uninstall";
      btn.removeAttribute("disabled");
      apis.notification?.show({ type: "success", message: `${ext.name} installed.`, duration: 3000 });
      eventBus.emit(ExtensionEvents.Installed, { id: ext.id, name: ext.name });
      eventBus.emit(MarketplaceEvents.InstallComplete, { id: ext.id });
    } catch {
      installedIds.add(ext.id);
      btn.textContent = "Uninstall";
      btn.removeAttribute("disabled");
      apis.notification?.show({ type: "success", message: `${ext.name} installed (demo).`, duration: 3000 });
      eventBus.emit(ExtensionEvents.Installed, { id: ext.id, name: ext.name });
    } finally {
      installingIds.delete(ext.id);
    }
  }

  function uninstallExtension(ext: ExtEntry, btn: HTMLButtonElement) {
    installedIds.delete(ext.id);
    if (vsixApi) vsixApi.uninstall(ext.id);
    btn.textContent = "Install";
    btn.className = "vsc-btn vsc-btn-primary";
    apis.notification?.show({ type: "info", message: `${ext.name} uninstalled.`, duration: 3000 });
    eventBus.emit(ExtensionEvents.Uninstalled, { id: ext.id, name: ext.name });
  }

  // ── Render list ────────────────────────────────────────────
  function renderList(list: ExtEntry[]) {
    extList.innerHTML = "";

    if (list.length === 0) {
      const emptyMsg = searchInput.value.trim()
        ? "No extensions match your search. Try different keywords."
        : "No extensions found.";
      extList.appendChild(el("div", { style: `color:${C.fgDim};font-size:12px;padding:24px 0;text-align:center;` }, emptyMsg));
      return;
    }

    for (const ext of list) {
      const isInstalled = installedIds.has(ext.id);
      const color = catColor(ext.categories);

      const row = el("div", { class: "vsc-file-item", style: "display:flex;align-items:flex-start;gap:10px;padding:10px 6px;cursor:pointer;" });

      // Icon — real icon from Open VSX or first-letter fallback
      const iconWrap = el("div", { style: `width:40px;height:40px;min-width:40px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:${color}18;flex-shrink:0;overflow:hidden;` });
      if (ext.iconUrl) {
        const img = document.createElement("img");
        img.src = ext.iconUrl;
        img.width = 40; img.height = 40;
        img.style.cssText = "border-radius:6px;object-fit:cover;";
        img.onerror = () => { img.remove(); iconWrap.textContent = ext.name.charAt(0).toUpperCase(); iconWrap.style.cssText += `font-size:18px;font-weight:700;color:${color};`; };
        iconWrap.appendChild(img);
      } else {
        iconWrap.textContent = ext.name.charAt(0).toUpperCase();
        iconWrap.style.cssText += `font-size:18px;font-weight:700;color:${color};`;
      }

      // Info
      const info = el("div", { style: "flex:1;min-width:0;" });
      const titleRow = el("div", { style: "display:flex;align-items:center;gap:6px;flex-wrap:wrap;" });
      titleRow.append(
        el("span", { style: `font-size:13px;color:${C.fg};font-weight:500;` }, ext.name),
        el("span", { style: `font-size:11px;color:${C.fgDim};` }, `v${ext.version}`),
      );
      if (isInstalled) {
        const check = el("span", { style: `color:${C.successGreen};display:flex;` });
        check.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`;
        titleRow.appendChild(check);
      }

      const metaRow = el("div", { style: `font-size:11px;color:${C.fgDim};display:flex;gap:8px;align-items:center;margin-top:2px;` });
      metaRow.append(
        el("span", {}, ext.publisher),
        el("span", { style: "opacity:.5;" }, "·"),
        el("span", {}, `${formatDownloads(ext.downloads)} installs`),
      );
      if (ext.rating) {
        metaRow.append(
          el("span", { style: "opacity:.5;" }, "·"),
          el("span", { style: "color:#dcdcaa;" }, renderStars(ext.rating)),
        );
      }

      const descEl = el("div", { style: `font-size:11px;color:${C.fgDim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;` }, ext.description);

      const tagsRow = el("div", { style: "display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;" });
      for (const cat of ext.categories.slice(0, 3)) {
        tagsRow.appendChild(el("span", { style: `font-size:9px;padding:1px 5px;border-radius:3px;background:${catColor([cat])}18;color:${catColor([cat])};` }, cat));
      }

      info.append(titleRow, metaRow, descEl, tagsRow);

      // Action button
      const btn = el("button", {
        class: `vsc-btn ${isInstalled ? "vsc-btn-secondary" : "vsc-btn-primary"}`,
        style: "font-size:11px;padding:4px 12px;flex-shrink:0;margin-top:4px;",
      }, isInstalled ? "Uninstall" : "Install") as HTMLButtonElement;

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (isInstalled) {
          uninstallExtension(ext, btn);
          renderList(currentExts.filter((x) => activeFilter !== "installed" || installedIds.has(x.id)));
        } else {
          installExtension(ext, btn);
        }
      });

      // Open extension detail on row click
      row.addEventListener("click", () => {
        eventBus.emit(MarketplaceEvents.OpenDetail, { id: ext.id, name: ext.name });
      });

      row.append(iconWrap, info, btn);
      extList.appendChild(row);
    }

    // "Load more" if total > current page
    if (totalResults > list.length) {
      const more = el("div", { style: `text-align:center;padding:12px;` });
      const moreBtn = el("button", { class: "vsc-btn vsc-btn-secondary", style: "font-size:11px;padding:4px 16px;" }, `Load more (${(totalResults - list.length).toLocaleString()} remaining)`);
      moreBtn.addEventListener("click", async () => {
        moreBtn.textContent = "Loading…";
        moreBtn.setAttribute("disabled", "true");
        currentPage++;
        try {
          const query = searchInput.value.trim();
          const category = activeFilter !== "all" && activeFilter !== "installed" ? activeFilter : undefined;
          const offset = currentPage * PAGE_SIZE;
          const params = new URLSearchParams({ size: String(PAGE_SIZE), offset: String(offset), sortBy: "downloadCount", sortOrder: "desc" });
          if (query) params.set("query", query);
          if (category) params.set("category", category);
          const res = await fetch(`${OPENVSX}/-/search?${params}`);
          if (res.ok) {
            const data: OpenVSXSearchResult = await res.json();
            const newEntries = data.extensions.map(mapEntry);
            currentExts = [...currentExts, ...newEntries];
            renderList(currentExts);
          }
        } catch { /* ignore */ }
      });
      more.appendChild(moreBtn);
      extList.appendChild(more);
    }
  }

  // ── Debounced search ───────────────────────────────────────
  let searchTimer: ReturnType<typeof setTimeout>;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 0;
      _cache = null;
      loadExtensions();
    }, 300);
  });

  // Keyboard — Enter triggers search immediately
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(searchTimer);
      currentPage = 0;
      _cache = null;
      loadExtensions();
    }
  });

  // ── Spinner keyframe ───────────────────────────────────────
  if (!document.getElementById("vsc-spin-keyframe")) {
    const style = document.createElement("style");
    style.id = "vsc-spin-keyframe";
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  container.append(searchWrap, resultInfo, filterRow, extList);

  // Initial load — fetch popular extensions
  requestAnimationFrame(() => loadExtensions());

  return container;
}
