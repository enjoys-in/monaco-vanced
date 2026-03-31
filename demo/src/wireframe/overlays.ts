// ── Context menu, command palette, bottom panel ─────────────

import type { MenuItem } from "@enjoys/monaco-vanced/layout/context-menu-module";
import { ContextMenuEvents, HeaderEvents, PanelEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { C } from "./types";
import { el, escapeHtml } from "./utils";

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
  dom.contextMenuEl.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:9999;background:${C.sidebarBg};border:1px solid ${C.border};border-radius:5px;padding:4px 0;min-width:200px;box-shadow:0 4px 16px rgba(0,0,0,0.4);`;

  items.forEach((item) => {
    if (item.type === "separator") {
      dom.contextMenuEl.appendChild(el("div", { style: `height:1px;background:${C.border};margin:4px 8px;` }));
      return;
    }
    const row = el("div", {
      style: `display:flex;align-items:center;padding:4px 24px;cursor:pointer;font-size:13px;color:${item.disabled ? C.fgDim : C.fg};`,
    });
    row.textContent = item.label;
    if (!item.disabled) {
      row.addEventListener("mouseenter", () => { row.style.background = C.accent; row.style.color = "#fff"; });
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
    dom.commandInput.value = "";
    dom.commandInput.focus();
    renderResults("");
  }

  function close() {
    isOpen = false;
    dom.commandPalette.style.display = "none";
    dom.commandList.innerHTML = "";
  }

  function renderResults(query: string) {
    dom.commandList.innerHTML = "";
    const commands = apis.command?.search(query) ?? apis.command?.getAll() ?? [];
    commands.slice(0, 50).forEach((cmd) => {
      const row = el("div", { style: "display:flex;align-items:center;padding:6px 14px;cursor:pointer;font-size:13px;" });
      row.addEventListener("mouseenter", () => { row.style.background = C.hover; });
      row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
      const label = typeof cmd === "string" ? cmd : (cmd as { label?: string; id: string }).label ?? (cmd as { id: string }).id;
      const id = typeof cmd === "string" ? cmd : (cmd as { id: string }).id;
      row.innerHTML = `<span style="flex:1">${escapeHtml(label)}</span>`;
      row.addEventListener("click", () => { close(); apis.command?.execute(id); });
      dom.commandList.appendChild(row);
    });
  }

  dom.commandInput.addEventListener("input", () => renderResults(dom.commandInput.value));
  dom.commandInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Enter") (dom.commandList.firstElementChild as HTMLElement | null)?.click();
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "P") {
      e.preventDefault();
      isOpen ? close() : open();
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (isOpen && !dom.commandPalette.contains(e.target as Node)) close();
  });

  on(HeaderEvents.CommandOpen, open);
}

// ── Bottom panel ────────────────────────────────────────────

export function wireBottomPanel(dom: DOMRefs, _apis: WireframeAPIs, on: OnHandler) {
  on(PanelEvents.BottomToggle, () => {
    const isVisible = dom.bottomPanel.style.display === "flex";
    dom.bottomPanel.style.display = isVisible ? "none" : "flex";
  });
}
