// ── Context menu, command palette, bottom panel ─────────────

import type { MenuItem } from "@enjoys/monaco-vanced/layout/context-menu-module";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { ContextMenuEvents, HeaderEvents, PanelEvents } from "@enjoys/monaco-vanced/core/events";
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

const PANEL_TABS = ["Problems", "Output", "Terminal", "Debug Console"];

export function wireBottomPanel(dom: DOMRefs, eventBus: EventBus, on: OnHandler, files: { uri: string; name: string }[] = []) {
  let activeTab = "Terminal";

  // Render tabs
  for (const tab of PANEL_TABS) {
    const tabEl = el("div", {
      class: "vsc-panel-tab",
      "data-active": tab === activeTab ? "true" : "false",
      style: `padding:0 12px;height:100%;display:flex;align-items:center;cursor:pointer;font-size:11px;text-transform:uppercase;font-weight:500;color:${tab === activeTab ? C.fgBright : C.fgDim};border-bottom:1px solid ${tab === activeTab ? C.fgBright : "transparent"};`,
    }, tab);
    tabEl.addEventListener("click", () => {
      activeTab = tab;
      dom.bottomPanelTabs.querySelectorAll(".vsc-panel-tab").forEach((t) => {
        const te = t as HTMLElement;
        const isActive = te.textContent === tab;
        te.dataset.active = String(isActive);
        te.style.color = isActive ? C.fgBright : C.fgDim;
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

  function renderPanelContent(tab: string) {
    dom.bottomPanelContent.innerHTML = "";
    if (tab === "Terminal") {
      const termContainer = el("div", { style: `color:${C.fg};font-size:13px;` });
      const outputDiv = el("div", { style: "white-space:pre-wrap;" });
      outputDiv.innerHTML = `<span style="color:#89d185;">Welcome to Monaco Vanced Terminal</span>\n<span style="color:${C.fgDim};">Type commands here. Try: help, ls, pwd, echo, clear</span>\n\n`;

      const inputRow = el("div", { style: "display:flex;align-items:center;gap:0;margin-top:4px;" });
      const prompt = el("span", { style: `color:${C.fg};white-space:nowrap;` });
      prompt.innerHTML = `<span style="color:#89d185;">user@antigravity</span>:<span style="color:#569cd6;">~/project</span>$ `;
      const input = el("input", {
        type: "text",
        style: `flex:1;background:transparent;border:none;outline:none;color:${C.fg};font-family:inherit;font-size:13px;padding:0;`,
        spellcheck: "false",
        autocomplete: "off",
      }) as HTMLInputElement;

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const cmd = input.value.trim();
          outputDiv.innerHTML += `<span style="color:#89d185;">user@antigravity</span>:<span style="color:#569cd6;">~/project</span>$ ${escapeHtml(cmd)}\n`;
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
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;display:flex;align-items:center;gap:4px;">No problems have been detected in the workspace.</div>`;
    } else if (tab === "Output") {
      const outputEl = el("div", { style: `color:${C.fgDim};font-size:13px;` });
      outputEl.innerHTML = `[${new Date().toLocaleTimeString()}] [monaco-vanced] IDE ready\n[${new Date().toLocaleTimeString()}] [monaco-vanced] ${files.length} files loaded\n[${new Date().toLocaleTimeString()}] [monaco-vanced] All plugins mounted successfully`;
      dom.bottomPanelContent.appendChild(outputEl);
    } else {
      dom.bottomPanelContent.innerHTML = `<div style="color:${C.fgDim};font-size:13px;">${tab} — No active session. Start a debug session to see output here.</div>`;
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
      case "cat": return parts[1] ? `<span style="color:${C.fgDim};">cat: ${parts[1]}: Use the editor to view files</span>` : `<span style="color:${C.errorRed};">cat: missing operand</span>`;
      case "node": return "v22.0.0";
      case "npm": return "10.9.0";
      case "bun": return "1.2.0";
      case "git": return parts[1] === "status" ? `<span style="color:#89d185;">On branch main\nYour branch is up to date.</span>` : `<span style="color:${C.fgDim};">git: command simulated</span>`;
      default: return `<span style="color:${C.errorRed};">bash: ${escapeHtml(base)}: command not found</span>`;
    }
  }

  renderPanelContent(activeTab);

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
