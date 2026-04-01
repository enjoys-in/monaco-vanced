// ── Welcome Page — shown when no editor tabs are open ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, OnHandler, VirtualFile } from "../types";
import { C } from "../types";
import { el } from "../utils";

export function wireWelcomePage(
  dom: DOMRefs,
  eventBus: InstanceType<typeof EventBus>,
  on: OnHandler,
  files: VirtualFile[],
) {
  const container = dom.welcomePage;
  let isVisible = true;

  // ── Build the welcome page DOM ─────────────────────────────
  buildWelcomeDOM();
  show();

  function buildWelcomeDOM() {
    container.innerHTML = "";

    const wrapper = el("div", {
      style: `display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:40px 24px;overflow-y:auto;user-select:none;`,
    });

    // ── Logo / Brand ─────────────────────────────────────────
    const logo = el("div", {
      style: `display:flex;align-items:center;justify-content:center;width:72px;height:72px;border-radius:16px;background:linear-gradient(135deg, ${C.accent}22, ${C.accent}08);margin-bottom:20px;`,
    });
    logo.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="${C.accent}"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;

    const title = el("div", {
      style: `font-size:24px;font-weight:300;color:${C.fg};margin-bottom:4px;letter-spacing:-0.5px;`,
    }, "Antigravity");
    const subtitle = el("div", {
      style: `font-size:13px;color:${C.fgDim};margin-bottom:32px;`,
    }, "Monaco Vanced IDE — v3.0");

    // ── Start section ────────────────────────────────────────
    const startSection = makeSection("Start");
    const startItems = [
      { icon: "file", label: "New File…", shortcut: "Ctrl+N", action: () => eventBus.emit("command:execute", { id: "workbench.action.files.newUntitledFile" }) },
      { icon: "folder", label: "Open Folder…", shortcut: "Ctrl+K Ctrl+O", action: () => eventBus.emit("notification:show", { type: "info", message: "Open Folder: Not available in browser demo", duration: 3000 }) },
      { icon: "clone", label: "Clone Repository…", shortcut: "", action: () => eventBus.emit("notification:show", { type: "info", message: "Clone: Not available in browser demo", duration: 3000 }) },
    ];
    for (const item of startItems) {
      startSection.appendChild(makeActionRow(item.icon, item.label, item.shortcut, item.action));
    }

    // ── Recent section ───────────────────────────────────────
    const recentSection = makeSection("Recent");
    const recentFiles = files.slice(0, 5);
    for (const f of recentFiles) {
      const filePath = f.uri;
      const fileName = f.name;
      recentSection.appendChild(makeActionRow(
        "file-code",
        fileName,
        filePath,
        () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }),
        true,
      ));
    }

    // ── Help section ─────────────────────────────────────────
    const helpSection = makeSection("Help");
    const helpItems = [
      { icon: "terminal", label: "Command Palette", shortcut: "Ctrl+Shift+P", action: () => eventBus.emit("command-palette:toggle", {}) },
      { icon: "settings", label: "Settings", shortcut: "Ctrl+,", action: () => eventBus.emit("settings:ui-open", {}) },
      { icon: "extensions", label: "Browse Extensions", shortcut: "Ctrl+Shift+X", action: () => eventBus.emit("sidebar:activate", { viewId: "extensions" }) },
      { icon: "keyboard", label: "Keyboard Shortcuts", shortcut: "", action: () => eventBus.emit("settings:ui-open", { category: "keybindings" }) },
    ];
    for (const item of helpItems) {
      helpSection.appendChild(makeActionRow(item.icon, item.label, item.shortcut, item.action));
    }

    // ── Layout ───────────────────────────────────────────────
    const content = el("div", {
      style: "width:100%;max-width:620px;",
    });

    const columns = el("div", {
      style: "display:grid;grid-template-columns:1fr 1fr;gap:24px;",
    });
    const leftCol = el("div");
    const rightCol = el("div");
    leftCol.append(startSection, recentSection);
    rightCol.append(helpSection);
    columns.append(leftCol, rightCol);

    content.appendChild(columns);

    // ── Footer hint ──────────────────────────────────────────
    const footer = el("div", {
      style: `margin-top:40px;font-size:11px;color:${C.fgDim};text-align:center;opacity:0.6;`,
    }, "Tip: Toggle sidebar with Ctrl+B • Toggle panel with Ctrl+J");

    wrapper.append(logo, title, subtitle, content, footer);
    container.appendChild(wrapper);
  }

  function makeSection(title: string): HTMLElement {
    const section = el("div", { style: "margin-bottom:20px;" });
    section.appendChild(el("div", {
      style: `font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:${C.fgDim};margin-bottom:8px;padding-left:4px;font-weight:600;`,
    }, title));
    return section;
  }

  function makeActionRow(
    iconName: string,
    label: string,
    shortcut: string,
    action: () => void,
    isPath?: boolean,
  ): HTMLElement {
    const row = el("div", {
      style: `display:flex;align-items:center;gap:10px;padding:5px 8px;border-radius:5px;cursor:pointer;transition:background .12s;`,
    });
    row.addEventListener("mouseenter", () => { row.style.background = C.listHover; });
    row.addEventListener("mouseleave", () => { row.style.background = "transparent"; });
    row.addEventListener("click", action);

    const icon = el("span", {
      style: `display:flex;align-items:center;justify-content:center;width:18px;height:18px;color:${C.accent};flex-shrink:0;`,
    });
    icon.innerHTML = getWelcomeIcon(iconName);

    const labelEl = el("span", {
      style: `font-size:13px;color:${isPath ? C.textLink : C.fg};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`,
    }, label);

    row.append(icon, labelEl);

    if (shortcut) {
      const kbdStyle = isPath
        ? `font-size:11px;color:${C.fgDim};flex-shrink:0;`
        : `font-size:11px;color:${C.fgDim};padding:1px 5px;background:${C.inputBg};border:1px solid ${C.borderLight};border-radius:3px;flex-shrink:0;font-family:inherit;`;
      row.appendChild(el("span", { style: kbdStyle }, shortcut));
    }

    return row;
  }

  // ── Show / Hide ────────────────────────────────────────────
  function show() {
    isVisible = true;
    container.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.settingsWebview.style.display = "none";
    dom.tabBar.style.display = "none";
    dom.breadcrumbBar.style.display = "none";
    dom.titleCenter.textContent = "Welcome";
    document.title = "Welcome — Antigravity — Monaco Vanced";
  }

  function hide() {
    if (!isVisible) return;
    isVisible = false;
    container.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.tabBar.style.display = "";
    dom.breadcrumbBar.style.display = "";
  }

  // ── Event wiring ───────────────────────────────────────────
  // Hide when a file tab opens
  on(FileEvents.Open, () => { hide(); });

  // Hide when settings opens
  on("settings:ui-open", () => { hide(); });

  // Show when all tabs are closed
  on("welcome:show", () => { show(); });
}

// ── Icon helpers ─────────────────────────────────────────────
function getWelcomeIcon(name: string): string {
  const icons: Record<string, string> = {
    "file": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.71 4.29l-3-3L10 1H4L3 2v12l1 1h8l1-1V5l-.29-.71zM13 14H4V2h5v4h4v8zm-3-9V2l3 3h-3z"/></svg>`,
    "folder": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`,
    "clone": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 1.5l.5-.5h5l4 4v9l-.5.5h-9l-.5-.5v-13zM5 2v11h8V6H9.5L9 5.5V2H5zm4 0v3h3L9 2zM3 4H2v11h8v-1H3V4z"/></svg>`,
    "file-code": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M10.57 1.14l3.28 3.3.15.36v9.7l-.5.5h-11l-.5-.5v-13l.5-.5h7.72l.35.14zM10 5h3l-3-3v3zM3 14h10V6H9.5L9 5.5V2H3v12zm2.062-5.121l-1.933 1.628 1.933 1.627-.646.766L2.17 10.507l2.246-2.393.646.765zm3.23 4.121L6.168 7.283l.957-.196 2.124 5.717-.957.196zm2.062-2.248l1.932-1.628-1.932-1.627.646-.766 2.245 2.393-2.245 2.393-.646-.765z"/></svg>`,
    "terminal": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 3.5l.5-.5h13l.5.5v9l-.5.5h-13l-.5-.5v-9zM2 12h12V4H2v8zm6.146-3.146l-2-2 .708-.708L9.207 8.5l-2.353 2.354-.708-.708 2-2z"/></svg>`,
    "settings": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM8 10a2 2 0 110-4 2 2 0 010 4z"/></svg>`,
    "extensions": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1.5L15 0h-4.5L9 1.5V6l1.5 1.5H15L16.5 6V1.5h-3zm-9 0L6 0H1.5L0 1.5V6l1.5 1.5H6L7.5 6V1.5h-3zm0 9L6 9H1.5L0 10.5V15l1.5 1.5H6L7.5 15V10.5h-3zm9 0L15 9h-4.5L9 10.5V15l1.5 1.5H15L16.5 15V10.5h-3z"/></svg>`,
    "keyboard": `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zm0 9H2V4h12v8zM3 5h2v2H3V5zm3 0h2v2H6V5zm3 0h2v2H9V5zm3 0h1v2h-1V5zM3 8h1v2H3V8zm2 0h6v2H5V8zm7 0h1v2h-1V8z"/></svg>`,
  };
  return icons[name] ?? icons["file"];
}
