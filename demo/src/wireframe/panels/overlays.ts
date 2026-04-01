// ── Context menu, command palette, bottom panel ─────────────

import * as monaco from "monaco-editor";
import type { MenuItem } from "@enjoys/monaco-vanced/layout/context-menu-module";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { ContextMenuEvents, HeaderEvents, PanelEvents, FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "../types";
import { C } from "../types";
import { el, escapeHtml } from "../utils";

// ── Context menu ────────────────────────────────────────────

export function wireContextMenu(dom: DOMRefs, apis: WireframeAPIs, on: OnHandler) {
  on(ContextMenuEvents.Show, (p) => {
    const { items, x, y } = p as { items: MenuItem[]; x: number; y: number };
    renderContextMenu(dom, apis, items, x, y);
  });

  on(ContextMenuEvents.Dismiss, () => {
    dom.contextMenuEl.style.display = "none";
    dom.contextMenuEl.innerHTML = "";
  });

  document.addEventListener("mousedown", (e) => {
    if (dom.contextMenuEl.style.display !== "none" && !dom.contextMenuEl.contains(e.target as Node)) {
      apis.contextMenu?.dismiss();
    }
  });
}

function renderContextMenu(dom: DOMRefs, apis: WireframeAPIs, items: MenuItem[], x: number, y: number) {
  dom.contextMenuEl.innerHTML = "";
  // Clamp position to viewport
  const maxX = window.innerWidth - 220;
  const maxY = window.innerHeight - items.length * 28 - 20;
  const cx = Math.min(x, maxX);
  const cy = Math.min(y, Math.max(0, maxY));

  dom.contextMenuEl.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;z-index:9999;background:${C.menuBg};border:1px solid ${C.borderLight};border-radius:6px;padding:4px 0;min-width:200px;box-shadow:0 6px 24px rgba(0,0,0,0.5);backdrop-filter:saturate(180%) blur(8px);`;

  items.forEach((item) => {
    if (item.type === "separator") {
      dom.contextMenuEl.appendChild(el("div", { style: `height:1px;background:${C.border};margin:4px 0;` }));
      return;
    }
    const row = el("div", {
      style: `display:flex;align-items:center;padding:4px 24px 4px 8px;cursor:pointer;font-size:13px;color:${item.disabled ? C.fgDim : C.fg};min-height:24px;`,
    });

    // Checkbox/icon placeholder
    const iconSlot = el("span", { style: "width:20px;display:inline-flex;justify-content:center;" });
    row.appendChild(iconSlot);

    const label = el("span", { style: "flex:1;" }, item.label);
    row.appendChild(label);

    // Keybinding hint
    if ((item as { keybinding?: string }).keybinding) {
      const kb = el("span", { style: `color:${C.fgDim};font-size:12px;margin-left:24px;` });
      kb.textContent = (item as { keybinding?: string }).keybinding!;
      row.appendChild(kb);
    }

    if (!item.disabled) {
      row.addEventListener("mouseenter", () => { row.style.background = C.listActive; row.style.color = C.fg; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; row.style.color = C.fg; });
      row.addEventListener("click", () => {
        if (item.command) apis.command?.execute(item.command);
        apis.contextMenu?.dismiss();
      });
    }
    dom.contextMenuEl.appendChild(row);
  });
}

// ── Command palette ─────────────────────────────────────────

export function wireCommandPalette(dom: DOMRefs, apis: WireframeAPIs, on: OnHandler) {
  let isOpen = false;

  function open() {
    isOpen = true;
    dom.commandPalette.style.display = "flex";
    dom.commandInput.value = ">";
    dom.commandInput.focus();
    // Place cursor at end
    requestAnimationFrame(() => {
      dom.commandInput.setSelectionRange(dom.commandInput.value.length, dom.commandInput.value.length);
    });
    renderResults("");
  }

  function close() {
    isOpen = false;
    dom.commandPalette.style.display = "none";
    dom.commandList.innerHTML = "";
  }

  function renderResults(query: string) {
    dom.commandList.innerHTML = "";
    const cleaned = query.replace(/^>\s*/, "");
    const commands = apis.command?.search(cleaned) ?? apis.command?.getAll() ?? [];
    let highlightIdx = 0;

    commands.slice(0, 50).forEach((cmd, i) => {
      const label = typeof cmd === "string" ? cmd : (cmd as { label?: string; id: string }).label ?? (cmd as { id: string }).id;
      const id = typeof cmd === "string" ? cmd : (cmd as { id: string }).id;

      const row = el("div", {
        "data-idx": String(i),
        style: `display:flex;align-items:center;padding:4px 14px;cursor:pointer;font-size:13px;min-height:28px;color:${C.fg};background:${i === 0 ? C.listActive : "transparent"};`,
      });
      row.addEventListener("mouseenter", () => {
        dom.commandList.querySelectorAll("div[data-idx]").forEach((r) => { (r as HTMLElement).style.background = "transparent"; });
        row.style.background = C.listActive;
        highlightIdx = i;
      });
      row.innerHTML = `<span style="flex:1">${escapeHtml(label)}</span>`;
      row.addEventListener("click", () => { close(); apis.command?.execute(id); });
      dom.commandList.appendChild(row);
    });
  }

  dom.commandInput.addEventListener("input", () => renderResults(dom.commandInput.value));
  dom.commandInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = dom.commandList.querySelectorAll("div[data-idx]");
      if (!items.length) return;
      const current = dom.commandList.querySelector(`div[data-idx][style*="background: ${C.listActive}"], div[data-idx][style*="background:${C.listActive}"]`) as HTMLElement | null;
      let idx = current ? Number(current.dataset.idx) : -1;
      if (e.key === "ArrowDown") idx = Math.min(idx + 1, items.length - 1);
      else idx = Math.max(idx - 1, 0);
      items.forEach((r) => { (r as HTMLElement).style.background = "transparent"; });
      (items[idx] as HTMLElement).style.background = C.listActive;
      (items[idx] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") {
      const active = dom.commandList.querySelector(`div[data-idx][style*="background: ${C.listActive}"], div[data-idx][style*="background:${C.listActive}"]`) as HTMLElement | null;
      (active ?? dom.commandList.firstElementChild as HTMLElement | null)?.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
      e.preventDefault();
      isOpen ? close() : open();
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (isOpen && !dom.commandPalette.contains(e.target as Node)) close();
  });

  on(HeaderEvents.CommandOpen, open);
}

// ── Bottom panel (Terminal / Output / Problems tabs) ─────────

const PANEL_TABS = ["Problems", "Output", "Terminal", "Debug Console", "Outline"];

export function wireBottomPanel(dom: DOMRefs, eventBus: EventBus, on: OnHandler, files: { uri: string; name: string }[] = []) {
  let activeTab = "Terminal";
  let currentFileUri = "";
  let problemsCount = 0;

  // Render tabs
  function updateTabBadge(tabName: string, count: number) {
    const tabEl = dom.bottomPanelTabs.querySelector(`.vsc-panel-tab[data-tab="${tabName}"]`) as HTMLElement | null;
    if (!tabEl) return;
    const existing = tabEl.querySelector(".vsc-tab-badge");
    if (existing) existing.remove();
    if (count > 0) {
      const badge = el("span", { class: "vsc-tab-badge", style: `background:${C.badgeBg};color:${C.badgeFg};font-size:9px;padding:0 5px;border-radius:8px;margin-left:6px;min-width:14px;text-align:center;display:inline-block;` }, String(count));
      tabEl.appendChild(badge);
    }
  }

  for (const tab of PANEL_TABS) {
    const tabEl = el("div", {
      class: "vsc-panel-tab",
      "data-tab": tab,
      "data-active": tab === activeTab ? "true" : "false",
      style: `padding:0 12px;height:100%;display:flex;align-items:center;cursor:pointer;font-size:11px;text-transform:uppercase;font-weight:500;color:${tab === activeTab ? C.fgBright : C.fgDim};border-bottom:1px solid ${tab === activeTab ? C.fgBright : "transparent"};gap:4px;`,
    }, tab);
    tabEl.addEventListener("click", () => {
      activeTab = tab;
      dom.bottomPanelTabs.querySelectorAll(".vsc-panel-tab").forEach((t) => {
        const te = t as HTMLElement;
        const isActive = te.dataset.tab === tab;
        te.dataset.active = String(isActive);
        te.style.color = isActive ? C.fgBright : C.fgDim;
        te.style.borderBottom = `1px solid ${isActive ? C.fgBright : "transparent"}`;
      });
      renderPanelContent(tab);
    });
    dom.bottomPanelTabs.appendChild(tabEl);
  }

  // Close button
  const closeBtn = el("div", {
    style: `cursor:pointer;padding:4px;display:flex;align-items:center;color:${C.fgDim};`,
    title: "Close Panel",
  });
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" fill="currentColor"/></svg>`;
  closeBtn.addEventListener("click", () => {
    dom.bottomPanel.style.display = "none";
  });
  dom.bottomPanelActions.appendChild(closeBtn);

  // ── Problems: dynamic from Monaco markers ──────────────
  function getMarkersByFile(): Map<string, monaco.editor.IMarker[]> {
    const allMarkers = monaco.editor.getModelMarkers({});
    const grouped = new Map<string, monaco.editor.IMarker[]>();
    for (const m of allMarkers) {
      const uri = m.resource.path.replace(/^\//, "");
      // Skip internal/special URIs
      if (uri.startsWith("__") || !uri) continue;
      const arr = grouped.get(uri) ?? [];
      arr.push(m);
      grouped.set(uri, arr);
    }
    return grouped;
  }

  function renderProblems() {
    dom.bottomPanelContent.innerHTML = "";

    // Check if any models exist (files are open)
    const models = monaco.editor.getModels();
    if (models.length === 0) {
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;display:flex;align-items:center;gap:6px;padding:8px 12px;">
        No files are open. Open a file to check for problems.
      </div>`;
      updateTabBadge("Problems", 0);
      return;
    }

    const grouped = getMarkersByFile();
    let total = 0;
    for (const arr of grouped.values()) total += arr.length;
    problemsCount = total;
    updateTabBadge("Problems", total);

    if (total === 0) {
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;display:flex;align-items:center;gap:6px;padding:8px 12px;">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="${C.successGreen}"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>
        No problems have been detected in the workspace.
      </div>`;
      return;
    }

    const list = el("div", { style: "overflow-y:auto;font-size:13px;" });
    for (const [file, markers] of grouped) {
      const errors = markers.filter((m) => m.severity === monaco.MarkerSeverity.Error).length;
      const warnings = markers.filter((m) => m.severity === monaco.MarkerSeverity.Warning).length;
      const fileRow = el("div", {
        style: `padding:4px 12px;display:flex;align-items:center;gap:6px;color:${C.fg};font-weight:500;cursor:pointer;`,
      });
      fileRow.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="${C.fgDim}"><path d="M13.85 4.44l-3.28-3.3-.71-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8l-.15-.36zm-.85.86h-3V2.5l3 2.8zM3 14V2h6v4h4v8H3z"/></svg>
        <span>${escapeHtml(file)}</span>
        ${errors > 0 ? `<span style="color:${C.errorRed};font-size:11px;display:flex;align-items:center;gap:2px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6"/></svg>${errors}</span>` : ""}
        ${warnings > 0 ? `<span style="color:${C.warningYellow};font-size:11px;display:flex;align-items:center;gap:2px;"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.56 1h.88l6.54 12.26-.44.74H1.46l-.44-.74L7.56 1z"/></svg>${warnings}</span>` : ""}`;
      fileRow.addEventListener("click", () => {
        eventBus.emit(FileEvents.Open, { uri: file, name: file.split("/").pop() });
      });

      list.appendChild(fileRow);

      for (const m of markers) {
        const sevColor = m.severity === monaco.MarkerSeverity.Error ? C.errorRed : m.severity === monaco.MarkerSeverity.Warning ? C.warningYellow : C.fgDim;
        const sevIcon = m.severity === monaco.MarkerSeverity.Error
          ? `<svg width="12" height="12" viewBox="0 0 16 16" fill="${sevColor}"><circle cx="8" cy="8" r="6"/></svg>`
          : m.severity === monaco.MarkerSeverity.Warning
            ? `<svg width="12" height="12" viewBox="0 0 16 16" fill="${sevColor}"><path d="M7.56 1h.88l6.54 12.26-.44.74H1.46l-.44-.74L7.56 1z"/></svg>`
            : `<svg width="12" height="12" viewBox="0 0 16 16" fill="${sevColor}"><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 4v5M8 10.5v1" stroke="currentColor" stroke-width="1.5"/></svg>`;

        const markerRow = el("div", {
          style: `padding:2px 12px 2px 30px;display:flex;align-items:center;gap:6px;color:${C.fgDim};cursor:pointer;font-size:12px;`,
        });
        markerRow.innerHTML = `${sevIcon}<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.message)}</span><span style="color:${C.fgDim};font-size:11px;">[Ln ${m.startLineNumber}, Col ${m.startColumn}]</span>`;
        markerRow.addEventListener("mouseenter", () => { markerRow.style.background = C.listHover; });
        markerRow.addEventListener("mouseleave", () => { markerRow.style.background = "transparent"; });
        markerRow.addEventListener("click", () => {
          eventBus.emit(FileEvents.Open, { uri: file, name: file.split("/").pop() });
        });
        list.appendChild(markerRow);
      }
    }
    dom.bottomPanelContent.appendChild(list);
  }

  // ── Symbol Store — caches parsed symbols per file ────────
  interface SymbolEntry {
    name: string;
    kind: string;
    line: number;
    icon: string;
    indent: number;
  }

  const symbolStore = new Map<string, SymbolEntry[]>();
  const symbolVersions = new Map<string, number>();

  function parseSymbols(content: string): SymbolEntry[] {
    const lines = content.split("\n");
    const symbols: SymbolEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ln = i + 1;
      const indent = (line.match(/^\s*/)?.[0].length ?? 0) > 0 ? 1 : 0;

      // Functions / methods
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) { symbols.push({ name: funcMatch[1], kind: "function", line: ln, icon: "ƒ", indent }); continue; }

      // Arrow functions / const assignments
      const arrowMatch = line.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
      if (arrowMatch) { symbols.push({ name: arrowMatch[1], kind: "function", line: ln, icon: "ƒ", indent }); continue; }

      // Classes
      const classMatch = line.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
      if (classMatch) { symbols.push({ name: classMatch[1], kind: "class", line: ln, icon: "C", indent: 0 }); continue; }

      // Interfaces / types
      const ifaceMatch = line.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/);
      if (ifaceMatch) { symbols.push({ name: ifaceMatch[1], kind: "interface", line: ln, icon: "I", indent: 0 }); continue; }

      // Enums
      const enumMatch = line.match(/(?:export\s+)?enum\s+(\w+)/);
      if (enumMatch) { symbols.push({ name: enumMatch[1], kind: "enum", line: ln, icon: "E", indent: 0 }); continue; }

      // React components (PascalCase exports)
      const compMatch = line.match(/(?:export\s+)?(?:const|function)\s+([A-Z]\w+)/);
      if (compMatch && !funcMatch && !arrowMatch) { symbols.push({ name: compMatch[1], kind: "component", line: ln, icon: "◇", indent: 0 }); continue; }

      // Zustand stores (create<...>)
      const storeMatch = line.match(/(?:export\s+)?const\s+(\w+)\s*=\s*create/);
      if (storeMatch) { symbols.push({ name: storeMatch[1], kind: "store", line: ln, icon: "S", indent: 0 }); continue; }

      // Module-level const/let/var (non-function)
      if (indent === 0) {
        const varMatch = line.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[=:]/);
        if (varMatch && !arrowMatch && !storeMatch) { symbols.push({ name: varMatch[1], kind: "variable", line: ln, icon: "V", indent: 0 }); continue; }
      }
    }

    return symbols;
  }

  function getSymbols(uri: string, model: monaco.editor.ITextModel): SymbolEntry[] {
    const version = model.getVersionId();
    if (symbolVersions.get(uri) === version && symbolStore.has(uri)) {
      return symbolStore.get(uri)!;
    }
    const symbols = parseSymbols(model.getValue());
    symbolStore.set(uri, symbols);
    symbolVersions.set(uri, version);
    return symbols;
  }

  // ── Outline: symbols from current model ────────────────
  function renderOutline() {
    dom.bottomPanelContent.innerHTML = "";

    if (!currentFileUri) {
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;padding:8px 12px;">No file is open. Open a file to see its outline.</div>`;
      return;
    }

    const models = monaco.editor.getModels();
    const activeModel = models.find((m) => m.uri.path.replace(/^\//, "") === currentFileUri);

    if (!activeModel) {
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;padding:8px 12px;">No active file. Open a file to see its outline.</div>`;
      return;
    }

    const fileName = currentFileUri;
    const headerEl = el("div", { style: `padding:6px 12px;font-size:11px;color:${C.fgDim};border-bottom:1px solid ${C.border};display:flex;align-items:center;justify-content:space-between;` });
    headerEl.innerHTML = `<span>Outline — ${escapeHtml(fileName)}</span>`;
    dom.bottomPanelContent.appendChild(headerEl);

    const symbols = getSymbols(currentFileUri, activeModel);

    if (symbols.length === 0) {
      dom.bottomPanelContent.appendChild(el("div", { style: `color:${C.fgDim};font-size:13px;padding:8px 12px;` }, "No symbols found in this file."));
      return;
    }

    const list = el("div", { style: "overflow-y:auto;font-size:13px;" });
    const kindColors: Record<string, string> = {
      function: "#dcdcaa",
      class: "#4ec9b0",
      interface: "#4ec9b0",
      enum: "#4ec9b0",
      component: "#4ec9b0",
      store: "#c586c0",
      variable: "#9cdcfe",
      import: "#569cd6",
    };

    for (const sym of symbols) {
      const paddingLeft = 12 + sym.indent * 16;
      const row = el("div", {
        style: `padding:3px ${12}px 3px ${paddingLeft}px;display:flex;align-items:center;gap:8px;cursor:pointer;color:${C.fg};`,
      });
      row.innerHTML = `<span style="color:${kindColors[sym.kind] || C.fgDim};font-weight:600;width:14px;text-align:center;font-size:12px;">${sym.icon}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(sym.name)}</span><span style="color:${C.fgDim};font-size:10px;opacity:0.7;">${sym.kind}</span><span style="color:${C.fgDim};font-size:11px;">Ln ${sym.line}</span>`;
      row.addEventListener("mouseenter", () => { row.style.background = C.listHover; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
      row.addEventListener("click", () => {
        eventBus.emit(FileEvents.Open, { uri: currentFileUri, name: currentFileUri.split("/").pop() });
      });
      list.appendChild(row);
    }
    dom.bottomPanelContent.appendChild(list);
  }

  function renderPanelContent(tab: string) {
    dom.bottomPanelContent.innerHTML = "";
    if (tab === "Terminal") {
      const termContainer = el("div", { style: `color:${C.fg};font-size:13px;` });
      const outputDiv = el("div", { style: "white-space:pre-wrap;" });
      outputDiv.innerHTML = `<span style="color:#89d185;">Welcome to Monaco Vanced Terminal</span>\n<span style="color:${C.fgDim};">Type commands here. Try: help, ls, pwd, echo, clear</span>\n\n`;

      const inputRow = el("div", { style: "display:flex;align-items:center;gap:0;margin-top:4px;" });
      const prompt = el("span", { style: `color:${C.fg};white-space:nowrap;` });
      prompt.innerHTML = `<span style="color:#89d185;">user@monaco-vanced</span>:<span style="color:#569cd6;">~/project</span>$ `;
      const input = el("input", {
        type: "text",
        style: `flex:1;background:transparent;border:none;outline:none;color:${C.fg};font-family:inherit;font-size:13px;padding:0;`,
        spellcheck: "false",
        autocomplete: "off",
      }) as HTMLInputElement;

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const cmd = input.value.trim();
          outputDiv.innerHTML += `<span style="color:#89d185;">user@monaco-vanced</span>:<span style="color:#569cd6;">~/project</span>$ ${escapeHtml(cmd)}\n`;
          if (cmd) {
            const output = handleTerminalCommand(cmd);
            if (output) outputDiv.innerHTML += output + "\n";
          }
          input.value = "";
          outputDiv.scrollTop = outputDiv.scrollHeight;
          termContainer.scrollTop = termContainer.scrollHeight;
        }
      });

      inputRow.append(prompt, input);
      termContainer.append(outputDiv, inputRow);
      dom.bottomPanelContent.appendChild(termContainer);
      requestAnimationFrame(() => input.focus());
    } else if (tab === "Problems") {
      renderProblems();
    } else if (tab === "Outline") {
      renderOutline();
    } else if (tab === "Output") {
      const outputEl = el("div", { style: `color:${C.fgDim};font-size:13px;` });
      outputEl.innerHTML = `[${new Date().toLocaleTimeString()}] [monaco-vanced] IDE ready\n[${new Date().toLocaleTimeString()}] [monaco-vanced] ${files.length} files loaded\n[${new Date().toLocaleTimeString()}] [monaco-vanced] All plugins mounted successfully`;
      dom.bottomPanelContent.appendChild(outputEl);
    } else {
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;">${escapeHtml(tab)} — No active session. Start a debug session to see output here.</div>`;
    }
  }

  function handleTerminalCommand(cmd: string): string {
    const parts = cmd.split(" ");
    const base = parts[0];
    switch (base) {
      case "help": return `<span style="color:${C.fgDim};">Available commands: help, ls, pwd, echo, clear, date, whoami, cat, node -v, npm -v</span>`;
      case "clear": dom.bottomPanelContent.querySelector("div")!.innerHTML = ""; return "";
      case "ls": return `<span style="color:#569cd6;">src/</span>  <span style="color:#569cd6;">public/</span>  <span style="color:${C.fg};">package.json</span>  <span style="color:${C.fg};">tsconfig.json</span>  <span style="color:${C.fg};">README.md</span>  <span style="color:${C.fg};">vite.config.ts</span>`;
      case "pwd": return "/home/user/project";
      case "echo": return parts.slice(1).join(" ");
      case "date": return new Date().toString();
      case "whoami": return "user";
      case "cat": return parts[1] ? `<span style="color:${C.fgDim};">cat: ${escapeHtml(parts[1])}: Use the editor to view files</span>` : `<span style="color:${C.errorRed};">cat: missing operand</span>`;
      case "node": return "v22.0.0";
      case "npm": return "10.9.0";
      case "bun": return "1.2.0";
      case "git": return parts[1] === "status" ? `<span style="color:#89d185;">On branch main\nYour branch is up to date.</span>` : `<span style="color:${C.fgDim};">git: command simulated</span>`;
      default: return `<span style="color:${C.errorRed};">bash: ${escapeHtml(base)}: command not found</span>`;
    }
  }

  renderPanelContent(activeTab);

  // Listen for marker changes to update Problems badge
  monaco.editor.onDidChangeMarkers(() => {
    const allMarkers = monaco.editor.getModelMarkers({});
    // Filter out internal URIs
    const count = allMarkers.filter((m) => {
      const uri = m.resource.path.replace(/^\//, "");
      return uri && !uri.startsWith("__");
    }).length;
    if (count !== problemsCount) {
      problemsCount = count;
      updateTabBadge("Problems", count);
      if (activeTab === "Problems") renderProblems();
    }
  });

  // Listen for model content changes to update symbol store + outline
  monaco.editor.getModels().forEach((model) => {
    model.onDidChangeContent(() => {
      const uri = model.uri.path.replace(/^\//, "");
      symbolVersions.delete(uri); // Invalidate cache
      if (activeTab === "Outline" && currentFileUri === uri) {
        renderOutline();
      }
    });
  });

  // Also listen for new models being created
  monaco.editor.onDidCreateModel((model) => {
    model.onDidChangeContent(() => {
      const uri = model.uri.path.replace(/^\//, "");
      symbolVersions.delete(uri);
      if (activeTab === "Outline" && currentFileUri === uri) {
        renderOutline();
      }
    });
  });

  // Listen for file open to track current file for Outline
  on(FileEvents.Open, (p) => {
    const { uri } = p as { uri: string };
    currentFileUri = uri;
    if (activeTab === "Outline") renderOutline();
  });

  // Resize handle for bottom panel
  const resizeTop = el("div", { style: `position:absolute;top:-2px;left:0;right:0;height:4px;cursor:ns-resize;z-index:5;` });
  dom.bottomPanel.style.position = "relative";
  dom.bottomPanel.appendChild(resizeTop);
  let dragging = false;
  let startY = 0;
  let startH = 0;
  resizeTop.addEventListener("mousedown", (e) => {
    dragging = true; startY = e.clientY; startH = dom.bottomPanel.offsetHeight;
    document.body.style.cursor = "ns-resize"; document.body.style.userSelect = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const newH = Math.max(100, Math.min(500, startH - (e.clientY - startY)));
    dom.bottomPanel.style.height = `${newH}px`;
  });
  document.addEventListener("mouseup", () => {
    if (!dragging) return; dragging = false;
    document.body.style.cursor = ""; document.body.style.userSelect = "";
  });

  on(PanelEvents.BottomToggle, () => {
    const isVisible = dom.bottomPanel.style.display === "flex";
    dom.bottomPanel.style.display = isVisible ? "none" : "flex";
  });
}
