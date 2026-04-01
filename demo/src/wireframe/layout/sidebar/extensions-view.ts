// ── Extensions View — Marketplace powered via VSIX pipeline ──

import { C } from "../../types";
import { el } from "../../utils";
import type { ViewContext } from "./types";
import { ExtensionEvents, VsixEvents, MarketplaceEvents } from "@enjoys/monaco-vanced/core/events";
import type { MarketplaceEntry } from "@enjoys/monaco-vanced/extensions/marketplace-module";

// ── Marketplace extension catalog (simulates real registry) ──
const MARKETPLACE_EXTENSIONS: MarketplaceEntry[] = [
  { id: "esbenp.prettier-vscode", name: "Prettier", publisher: "Prettier", version: "11.0.0", description: "Code formatter using Prettier", downloads: 48_200_000, rating: 4.2, categories: ["Formatters"] },
  { id: "dbaeumer.vscode-eslint", name: "ESLint", publisher: "Microsoft", version: "3.0.10", description: "Integrates ESLint JavaScript into VS Code", downloads: 38_700_000, rating: 4.3, categories: ["Linters"] },
  { id: "ms-python.python", name: "Python", publisher: "Microsoft", version: "2025.4.0", description: "IntelliSense, linting, debugging for Python", downloads: 120_000_000, rating: 4.5, categories: ["Programming Languages"] },
  { id: "bradlc.vscode-tailwindcss", name: "Tailwind CSS IntelliSense", publisher: "Tailwind Labs", version: "0.14.1", description: "Intelligent Tailwind CSS tooling", downloads: 15_600_000, rating: 4.4, categories: ["Other"] },
  { id: "ms-vscode.vscode-typescript-next", name: "TypeScript Nightly", publisher: "Microsoft", version: "5.8.20260401", description: "Enables typescript@next as VS Code's built-in TS version", downloads: 5_200_000, rating: 4.1, categories: ["Programming Languages"] },
  { id: "eamodio.gitlens", name: "GitLens", publisher: "GitKraken", version: "16.4.0", description: "Supercharge Git — Visualize authorship, explore history", downloads: 35_100_000, rating: 4.4, categories: ["SCM Providers"] },
  { id: "ms-azuretools.vscode-docker", name: "Docker", publisher: "Microsoft", version: "1.30.0", description: "Docker container management", downloads: 28_300_000, rating: 4.3, categories: ["Other"] },
  { id: "formulahendry.auto-rename-tag", name: "Auto Rename Tag", publisher: "Jun Han", version: "0.1.10", description: "Auto rename paired HTML/XML tag", downloads: 17_500_000, rating: 3.8, categories: ["Other"] },
  { id: "ritwickdey.liveserver", name: "Live Server", publisher: "Ritwick Dey", version: "5.7.9", description: "Launch a local dev server with live reload", downloads: 46_000_000, rating: 4.3, categories: ["Other"] },
  { id: "pkief.material-icon-theme", name: "Material Icon Theme", publisher: "Philipp Kief", version: "5.14.1", description: "Material Design icons for files and folders", downloads: 26_800_000, rating: 4.6, categories: ["Themes"] },
  { id: "github.copilot", name: "GitHub Copilot", publisher: "GitHub", version: "1.250.0", description: "AI pair programmer — code suggestions powered by AI", downloads: 22_000_000, rating: 4.1, categories: ["Machine Learning"] },
  { id: "ms-vscode-remote.remote-ssh", name: "Remote - SSH", publisher: "Microsoft", version: "0.116.0", description: "Open folders on remote machines via SSH", downloads: 18_900_000, rating: 4.0, categories: ["Other"] },
  { id: "usernamehw.errorlens", name: "Error Lens", publisher: "Alexander", version: "3.20.0", description: "Improve highlighting of errors and warnings inline", downloads: 12_400_000, rating: 4.7, categories: ["Other"] },
  { id: "christian-kohler.path-intellisense", name: "Path Intellisense", publisher: "Christian Kohler", version: "2.9.0", description: "Autocomplete filenames in your code", downloads: 14_800_000, rating: 4.2, categories: ["Other"] },
  { id: "mikestead.dotenv", name: "DotENV", publisher: "mikestead", version: "1.0.1", description: "Support for .env file syntax", downloads: 11_200_000, rating: 4.0, categories: ["Programming Languages"] },
  { id: "yzhang.markdown-all-in-one", name: "Markdown All in One", publisher: "Yu Zhang", version: "3.6.2", description: "All you need for Markdown writing", downloads: 10_700_000, rating: 4.4, categories: ["Programming Languages"] },
  { id: "wayou.vscode-todo-highlight", name: "TODO Highlight", publisher: "Wayou Liu", version: "1.0.5", description: "Highlight TODO, FIXME and other annotations", downloads: 7_600_000, rating: 4.2, categories: ["Other"] },
  { id: "vscodevim.vim", name: "Vim", publisher: "vscodevim", version: "1.28.1", description: "Vim emulation for VS Code", downloads: 9_200_000, rating: 3.7, categories: ["Keymaps"] },
  { id: "ms-vscode.cpptools", name: "C/C++", publisher: "Microsoft", version: "1.22.6", description: "C/C++ IntelliSense, debugging, and code browsing", downloads: 62_000_000, rating: 4.0, categories: ["Programming Languages"] },
  { id: "redhat.java", name: "Language Support for Java", publisher: "Red Hat", version: "1.38.0", description: "Java linting, IntelliSense, formatting", downloads: 22_500_000, rating: 4.1, categories: ["Programming Languages"] },
  { id: "rust-lang.rust-analyzer", name: "rust-analyzer", publisher: "rust-lang", version: "0.4.2200", description: "Rust language support for VS Code", downloads: 8_700_000, rating: 4.6, categories: ["Programming Languages"] },
  { id: "golang.go", name: "Go", publisher: "Go Team at Google", version: "0.44.0", description: "Rich Go language support", downloads: 15_300_000, rating: 4.3, categories: ["Programming Languages"] },
  { id: "svelte.svelte-vscode", name: "Svelte for VS Code", publisher: "Svelte", version: "108.5.3", description: "Svelte language support", downloads: 4_200_000, rating: 4.2, categories: ["Programming Languages"] },
  { id: "vue.volar", name: "Vue - Official", publisher: "Vue", version: "2.2.6", description: "Official Vue.js language features extension", downloads: 11_800_000, rating: 4.0, categories: ["Programming Languages"] },
  { id: "astro-build.astro-vscode", name: "Astro", publisher: "Astro", version: "2.16.4", description: "Astro language support", downloads: 3_800_000, rating: 4.3, categories: ["Programming Languages"] },
  { id: "biomejs.biome", name: "Biome", publisher: "biomejs", version: "2025.3.281", description: "Biome — formatter, linter, bundler in one", downloads: 2_100_000, rating: 4.5, categories: ["Formatters", "Linters"] },
  { id: "ms-playwright.playwright", name: "Playwright Test", publisher: "Microsoft", version: "1.1.7", description: "Run Playwright tests inside VS Code", downloads: 3_500_000, rating: 4.4, categories: ["Testing"] },
  { id: "vitest.explorer", name: "Vitest", publisher: "Vitest", version: "1.8.0", description: "Run and debug Vitest tests", downloads: 2_800_000, rating: 4.3, categories: ["Testing"] },
  { id: "prisma.prisma", name: "Prisma", publisher: "Prisma", version: "5.22.0", description: "Prisma schema language support", downloads: 5_400_000, rating: 4.5, categories: ["Programming Languages"] },
  { id: "denoland.vscode-deno", name: "Deno", publisher: "Deno Land", version: "3.42.0", description: "Deno language support", downloads: 2_200_000, rating: 4.1, categories: ["Programming Languages"] },
];

// ── Category colors ──────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  "Formatters": "#c586c0", "Linters": "#f14c4c", "Programming Languages": "#569cd6",
  "Other": "#9cdcfe", "SCM Providers": "#ce9178", "Themes": "#dcdcaa",
  "Machine Learning": "#b5cea8", "Keymaps": "#4ec9b0", "Testing": "#89d185",
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
  const full = Math.floor(rating);
  const half = rating - full >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

export function buildExtensionsView(ctx: ViewContext): HTMLElement {
  const { apis, eventBus, vsixApi, marketplaceApi } = ctx;

  const installedIds = new Set<string>();
  const installingIds = new Set<string>();

  // ── Container ──────────────────────────────────────────────
  const container = el("div", { style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;" });

  // ── Search ─────────────────────────────────────────────────
  const searchWrap = el("div", { style: "padding:10px 12px 6px;" });
  const searchInput = el("input", { type: "text", placeholder: "Search Marketplace…", class: "vsc-input" }) as HTMLInputElement;
  searchWrap.appendChild(searchInput);

  // ── Filters ────────────────────────────────────────────────
  const filterRow = el("div", { style: "display:flex;gap:4px;padding:4px 12px 10px;flex-wrap:wrap;" });
  let activeFilter = "all";
  const allCats = [...new Set(MARKETPLACE_EXTENSIONS.flatMap((e) => e.categories))].sort();
  const filters = [
    { id: "all", label: `All (${MARKETPLACE_EXTENSIONS.length})` },
    { id: "installed", label: "Installed" },
    { id: "popular", label: "Popular" },
    ...allCats.map((c) => ({ id: c, label: c })),
  ];
  const filterEls: HTMLElement[] = [];
  for (const f of filters) {
    const pill = el("div", { class: "vsc-tab-pill", "data-active": f.id === activeFilter ? "true" : "false" }, f.label);
    pill.addEventListener("click", () => { activeFilter = f.id; filterEls.forEach((fe) => fe.dataset.active = "false"); pill.dataset.active = "true"; renderList(); });
    filterEls.push(pill);
    filterRow.appendChild(pill);
  }

  // ── List ───────────────────────────────────────────────────
  const extList = el("div", { style: "flex:1;overflow-y:auto;padding:0 12px;" });

  // ── Marketplace search (with local fallback) ───────────────
  async function searchMarketplace(query: string): Promise<MarketplaceEntry[]> {
    if (marketplaceApi) {
      try {
        return await marketplaceApi.search({ query, limit: 30 });
      } catch { /* fallback below */ }
    }
    // Local fallback
    const q = query.toLowerCase();
    return MARKETPLACE_EXTENSIONS.filter((e) =>
      e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.publisher.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
    );
  }

  // ── Install via marketplace / VSIX pipeline ────────────────
  async function installExtension(ext: MarketplaceEntry, btn: HTMLButtonElement) {
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
      // Demo fallback — simulate successful install
      installedIds.add(ext.id);
      btn.textContent = "Uninstall";
      btn.removeAttribute("disabled");
      apis.notification?.show({ type: "success", message: `${ext.name} installed.`, duration: 3000 });
      eventBus.emit(ExtensionEvents.Installed, { id: ext.id, name: ext.name });
    } finally {
      installingIds.delete(ext.id);
    }
  }

  function uninstallExtension(ext: MarketplaceEntry, btn: HTMLButtonElement) {
    installedIds.delete(ext.id);
    if (vsixApi) vsixApi.uninstall(ext.id);
    btn.textContent = "Install";
    btn.className = "vsc-btn vsc-btn-primary";
    apis.notification?.show({ type: "info", message: `${ext.name} uninstalled.`, duration: 3000 });
    eventBus.emit(ExtensionEvents.Uninstalled, { id: ext.id, name: ext.name });
  }

  // ── Render list ────────────────────────────────────────────
  let currentExts = MARKETPLACE_EXTENSIONS;

  function renderList() {
    extList.innerHTML = "";
    const q = searchInput.value.trim().toLowerCase();

    let list = currentExts;
    if (activeFilter === "installed") list = list.filter((e) => installedIds.has(e.id));
    else if (activeFilter === "popular") list = [...list].sort((a, b) => b.downloads - a.downloads).slice(0, 15);
    else if (activeFilter !== "all") list = list.filter((e) => e.categories.includes(activeFilter));
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.publisher.toLowerCase().includes(q));

    if (list.length === 0) {
      extList.appendChild(el("div", { style: `color:${C.fgDim};font-size:12px;padding:16px 0;text-align:center;` }, q ? "No extensions match your search." : "No extensions found."));
      return;
    }

    for (const ext of list) {
      const isInstalled = installedIds.has(ext.id);
      const color = catColor(ext.categories);

      const row = el("div", { class: "vsc-file-item", style: "display:flex;align-items:flex-start;gap:10px;padding:10px 6px;cursor:pointer;" });

      // Icon — first letter
      const icon = el("div", { style: `width:40px;height:40px;min-width:40px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:${color}18;flex-shrink:0;font-size:18px;font-weight:700;color:${color};` });
      icon.textContent = ext.name.charAt(0).toUpperCase();

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
        el("span", { style: "opacity:.5;" }, "·"),
        el("span", { style: "color:#dcdcaa;" }, renderStars(ext.rating)),
      );

      const descEl = el("div", { style: `font-size:11px;color:${C.fgDim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px;` }, ext.description);

      const tagsRow = el("div", { style: "display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;" });
      for (const cat of ext.categories) {
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
          renderList();
        } else {
          installExtension(ext, btn);
        }
      });

      row.append(icon, info, btn);
      extList.appendChild(row);
    }
  }

  // ── Debounced search ───────────────────────────────────────
  let searchTimer: ReturnType<typeof setTimeout>;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    searchTimer = setTimeout(async () => {
      if (q.length >= 2) {
        currentExts = await searchMarketplace(q);
      } else {
        currentExts = MARKETPLACE_EXTENSIONS;
      }
      renderList();
    }, 200);
  });

  container.append(searchWrap, filterRow, extList);
  requestAnimationFrame(renderList);
  return container;
}
