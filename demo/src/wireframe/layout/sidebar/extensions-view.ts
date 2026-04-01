// ── Extensions View — Real 81 Plugin Modules ────────────────

import { C } from "../../types";
import { el } from "../../utils";
import type { ViewContext, PluginInfo } from "./types";
import { PLUGIN_CATALOG } from "./types";

export function buildExtensionsView(ctx: ViewContext): HTMLElement {
  const { apis } = ctx;

  const container = el("div", { style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;" });
  const searchWrap = el("div", { style: "padding:10px 12px 6px;" });
  const searchInput = el("input", { type: "text", placeholder: "Search extensions...", class: "vsc-input" }) as HTMLInputElement;
  searchWrap.appendChild(searchInput);

  const filterRow = el("div", { style: "display:flex;gap:4px;padding:4px 12px 10px;flex-wrap:wrap;" });
  let activeFilter = "all";
  const filters = [
    { id: "all", label: "All (81)" }, { id: "installed", label: "Installed" },
    { id: "Theming", label: "Theming" }, { id: "Editor", label: "Editor" },
    { id: "AI / Intelligence", label: "AI" }, { id: "Language", label: "Language" },
    { id: "Devtools", label: "Devtools" }, { id: "Extensions", label: "Extensions" },
    { id: "Platform", label: "Platform" }, { id: "SCM", label: "SCM" },
  ];
  const filterEls: HTMLElement[] = [];
  for (const f of filters) {
    const pill = el("div", { class: "vsc-tab-pill", "data-active": f.id === activeFilter ? "true" : "false" }, f.label);
    pill.addEventListener("click", () => { activeFilter = f.id; filterEls.forEach((fe) => fe.dataset.active = "false"); pill.dataset.active = "true"; renderExtList(); });
    filterEls.push(pill);
    filterRow.appendChild(pill);
  }

  const extList = el("div", { style: "flex:1;overflow-y:auto;padding:0 12px;" });
  function renderExtList() {
    extList.innerHTML = "";
    const q = searchInput.value.trim().toLowerCase();
    let filtered = PLUGIN_CATALOG;
    if (activeFilter === "installed") filtered = filtered.filter((p) => p.installed);
    else if (activeFilter !== "all") filtered = filtered.filter((p) => p.category === activeFilter);
    if (q) filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    const groups = new Map<string, PluginInfo[]>();
    for (const p of filtered) { const cat = groups.get(p.category) ?? []; cat.push(p); groups.set(p.category, cat); }
    if (groups.size === 0) { extList.appendChild(el("div", { style: `color:${C.fgDim};font-size:12px;padding:16px 0;text-align:center;` }, "No extensions found.")); return; }
    for (const [cat, plugins] of groups) {
      const catHeader = el("div", { style: `font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:8px 0 4px;display:flex;align-items:center;gap:6px;` });
      catHeader.append(el("span", {}, cat), el("span", { class: "vsc-badge", style: `font-size:9px;padding:0 5px;` }, String(plugins.length)));
      extList.appendChild(catHeader);
      for (const p of plugins) {
        const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:10px;padding:8px 6px;cursor:pointer;` });
        const iconEl = el("div", { style: `width:36px;height:36px;min-width:36px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:${p.color}18;flex-shrink:0;` });
        iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="${p.color}"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z"/></svg>`;
        const info = el("div", { style: "flex:1;min-width:0;" });
        const titleRow = el("div", { style: "display:flex;align-items:center;gap:6px;" });
        titleRow.append(el("span", { style: `font-size:13px;color:${C.fg};font-weight:500;` }, p.name));
        if (p.installed) { const check = el("span", { style: `color:${C.successGreen};display:flex;` }); check.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`; titleRow.appendChild(check); }
        info.append(titleRow, el("div", { style: `font-size:11px;color:${C.fgDim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;` }, p.desc));
        const action = el("button", { class: `vsc-btn ${p.installed ? "vsc-btn-secondary" : "vsc-btn-primary"}`, style: "font-size:11px;padding:3px 10px;flex-shrink:0;" }, p.installed ? "Installed" : "Install");
        action.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!p.installed) {
            p.installed = true;
            action.textContent = "Installed";
            action.className = "vsc-btn vsc-btn-secondary";
            apis.notification?.show({ type: "success", message: `${p.name} installed successfully.`, duration: 3000 });
          } else {
            p.installed = false;
            action.textContent = "Install";
            action.className = "vsc-btn vsc-btn-primary";
            apis.notification?.show({ type: "info", message: `${p.name} uninstalled.`, duration: 3000 });
          }
        });
        row.append(iconEl, info, action);
        extList.appendChild(row);
      }
    }
  }
  searchInput.addEventListener("input", renderExtList);
  container.append(searchWrap, filterRow, extList);
  requestAnimationFrame(renderExtList);
  return container;
}
