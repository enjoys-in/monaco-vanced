// ── Build the full IDE chrome DOM (VS Code layout) ──────────

import type { DOMRefs } from "../types";
import { C } from "../types";
import { el } from "../utils";

export function buildShell(root: HTMLElement): DOMRefs {
  root.innerHTML = "";
  root.style.cssText = `display:flex;flex-direction:column;height:100%;width:100%;overflow:hidden;background:${C.bg};color:${C.fg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;-webkit-font-smoothing:antialiased;`;

  // ── Title Bar ──────────────────────────────────────────────
  const titleBar = el("div", {
    style: `display:flex;align-items:center;height:30px;min-height:30px;background:${C.titleBg};padding:0;-webkit-app-region:drag;user-select:none;border-bottom:1px solid ${C.border};backdrop-filter:saturate(180%) blur(20px);`,
  });

  // Menu bar
  const titleMenuBar = el("div", {
    class: "vsc-title-menu",
    style: "display:flex;align-items:center;gap:0;-webkit-app-region:no-drag;padding:0 4px 0 8px;",
  });

  const titleText = el("span", {
    class: "vsc-title-text",
    style: `font-size:11px;color:${C.fgDim};-webkit-app-region:no-drag;padding:0 4px;white-space:nowrap;`,
  }, "Monaco Vanced");

  // Center: filename being edited
  const titleCenter = el("div", {
    style: "flex:1;display:flex;justify-content:center;align-items:center;overflow:hidden;",
  });
  const titleCenterLabel = el("span", {
    style: `font-size:11px;color:${C.fgDim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`,
  });
  titleCenter.appendChild(titleCenterLabel);

  const titleActions = el("div", {
    class: "vsc-title-actions",
    style: "display:flex;gap:2px;align-items:center;-webkit-app-region:no-drag;padding-right:8px;",
  });

  // ── Header action buttons (layout, settings, command palette) ─
  const makeHeaderBtn = (title: string, svg: string) => {
    const btn = el("div", {
      title,
      style: `width:28px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${C.fgDim};border-radius:4px;transition:background .1s,color .1s;`,
    });
    btn.innerHTML = svg;
    btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.1)"; btn.style.color = C.fg; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; btn.style.color = C.fgDim; });
    return btn;
  };

  const layoutBtn = makeHeaderBtn("Toggle Panel (Ctrl+J)", `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h12l.5.5v13l-.5.5H2l-.5-.5v-13L2 1zm0 1v4h12V2H2zm0 5v7h12V7H2z"/></svg>`);
  layoutBtn.dataset.action = "togglePanel";
  const sidebarBtn = makeHeaderBtn("Toggle Sidebar (Ctrl+B)", `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1h12l.5.5v13l-.5.5H2l-.5-.5v-13L2 1zm0 1v12h3V2H2zm4 0v12h8V2H6z"/></svg>`);
  sidebarBtn.dataset.action = "toggleSidebar";
  const settingsBtn = makeHeaderBtn("Settings", `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.1 4.4L8.6 2H7.4l-.5 2.4-.7.3-2-1.3-.9.8 1.3 2-.3.7-2.4.5v1.2l2.4.5.3.7-1.3 2 .8.8 2-1.3.7.3.5 2.4h1.2l.5-2.4.7-.3 2 1.3.9-.8-1.3-2 .3-.7 2.4-.5V6.8l-2.4-.5-.3-.7 1.3-2-.8-.8-2 1.3-.7-.3zM9.4 1l.5 2.4L12 2.1l2 2-1.4 2.1 2.4.4v2.8l-2.4.5L14 12l-2 2-2.1-1.4-.5 2.4H6.6l-.5-2.4L4 14l-2-2 1.4-2.1L1 9.4V6.6l2.4-.5L2 4l2-2 2.1 1.4L6.6 1h2.8zM8 11a3 3 0 100-6 3 3 0 000 6zm0-1a2 2 0 110-4 2 2 0 010 4z"/></svg>`);
  settingsBtn.dataset.action = "openSettings";
  const commandPaletteBtn = makeHeaderBtn("Command Palette (Ctrl+Shift+P)", `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 01-.326 1.275.749.749 0 01-.734-.215l-3.04-3.04zM11.5 7a4.499 4.499 0 10-8.997 0A4.499 4.499 0 0011.5 7z"/></svg>`);
  commandPaletteBtn.dataset.action = "commandPalette";

  titleActions.append(commandPaletteBtn, layoutBtn, sidebarBtn, settingsBtn);

  titleBar.append(titleMenuBar, titleText, titleCenter, titleActions);

  // ── Main Area ──────────────────────────────────────────────
  const mainArea = el("div", { style: "display:flex;flex:1;overflow:hidden;" });

  // ── Activity Bar ───────────────────────────────────────────
  const activityBar = el("div", {
    class: "vsc-activity-bar",
    style: `display:flex;flex-direction:column;width:48px;min-width:48px;background:${C.activityBg};border-right:1px solid ${C.border};align-items:center;padding-top:0;justify-content:space-between;`,
  });
  const activityTop = el("div", { style: "display:flex;flex-direction:column;align-items:center;width:100%;" });
  const activityBottom = el("div", { style: "display:flex;flex-direction:column;align-items:center;width:100%;padding-bottom:4px;" });
  activityBar.append(activityTop, activityBottom);

  // ── Sidebar ────────────────────────────────────────────────
  const sidebarContainer = el("div", {
    class: "vsc-sidebar",
    style: `display:flex;flex-direction:column;width:240px;min-width:170px;background:${C.sidebarBg};border-right:1px solid ${C.border};overflow:hidden;position:relative;`,
  });
  const sidebarHeader = el("div", {
    style: `display:flex;align-items:center;justify-content:space-between;height:35px;min-height:35px;padding:0 12px 0 20px;text-transform:uppercase;font-size:11px;font-weight:600;letter-spacing:0.5px;color:${C.fgDim};`,
  });
  const sidebarHeaderLabel = el("span", {}, "Explorer");
  const sidebarToolbar = el("div", { style: "display:flex;align-items:center;gap:2px;" });
  sidebarHeader.append(sidebarHeaderLabel, sidebarToolbar);

  const sidebarContent = el("div", {
    class: "vsc-sidebar-content",
    style: "flex:1;overflow-y:auto;overflow-x:hidden;",
  });
  sidebarContainer.append(sidebarHeader, sidebarContent);

  // ── Editor Panel ───────────────────────────────────────────
  const editorPanel = el("div", { style: "display:flex;flex-direction:column;flex:1;overflow:hidden;" });

  // Tab bar
  const tabBar = el("div", {
    style: `display:flex;align-items:stretch;height:38px;min-height:38px;background:${C.tabInactiveBg};border-bottom:1px solid ${C.border};`,
  });
  const tabList = el("div", {
    class: "vsc-tab-bar",
    style: "display:flex;flex:1;overflow-x:auto;overflow-y:hidden;align-items:stretch;",
  });
  const tabActions = el("div", {
    style: "display:flex;align-items:center;padding:0 8px;gap:4px;",
  });
  tabBar.append(tabList, tabActions);

  // Breadcrumb bar
  const breadcrumbBar = el("div", {
    class: "vsc-breadcrumb-bar",
    style: `display:flex;align-items:center;min-height:22px;padding:0 12px;background:${C.editorBg};font-size:12px;color:${C.breadcrumbFg};gap:4px;border-bottom:1px solid ${C.border};`,
  });

  // Editor
  const editorContainer = el("div", { id: "editor-container", style: "flex:1;overflow:hidden;" });

  // Settings webview (shown instead of editor when settings tab is active)
  const settingsWebview = el("div", {
    style: `display:none;flex-direction:column;flex:1;overflow:hidden;background:${C.editorBg};`,
  });

  // Welcome page (shown when no files are open)
  const welcomePage = el("div", {
    style: `display:none;flex-direction:column;flex:1;overflow:hidden;background:${C.editorBg};`,
  });

  // ── Bottom Panel ───────────────────────────────────────────
  const bottomPanel = el("div", {
    class: "vsc-bottom-panel",
    style: `display:none;flex-direction:column;height:200px;min-height:100px;border-top:1px solid ${C.border};background:${C.panelBg};`,
  });
  const bottomPanelHeader = el("div", {
    style: `display:flex;align-items:center;justify-content:space-between;height:35px;min-height:35px;padding:0 8px 0 12px;background:${C.panelHeaderBg};border-bottom:1px solid ${C.border};`,
  });
  const bottomPanelTabs = el("div", { style: "display:flex;align-items:center;gap:0;height:100%;" });
  const bottomPanelActions = el("div", { style: "display:flex;align-items:center;gap:4px;" });
  bottomPanelHeader.append(bottomPanelTabs, bottomPanelActions);

  const bottomPanelContent = el("div", {
    style: "flex:1;overflow:auto;padding:8px 12px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:13px;",
  });
  bottomPanel.append(bottomPanelHeader, bottomPanelContent);

  editorPanel.append(tabBar, breadcrumbBar, editorContainer, settingsWebview, welcomePage, bottomPanel);
  mainArea.append(activityBar, sidebarContainer, editorPanel);

  // ── Status Bar ─────────────────────────────────────────────
  const statusBar = el("div", {
    style: `display:flex;align-items:center;height:22px;min-height:22px;background:${C.statusBg};color:${C.statusFg};font-size:12px;padding:0 8px;user-select:none;`,
  });
  const statusLeft = el("div", { style: "display:flex;align-items:center;gap:0;height:100%;" });
  const statusRight = el("div", { style: "display:flex;align-items:center;gap:0;margin-left:auto;height:100%;" });
  statusBar.append(statusLeft, statusRight);

  // ── Overlays ───────────────────────────────────────────────
  const sidebarBackdrop = el("div", {
    class: "vsc-sidebar-backdrop",
  });

  const toastContainer = el("div", {
    class: "vsc-toast-container",
    style: "position:fixed;bottom:28px;right:12px;display:flex;flex-direction:column-reverse;gap:6px;z-index:10000;pointer-events:none;",
  });

  const contextMenuEl = el("div", { style: "position:fixed;display:none;z-index:9999;" });

  const commandPalette = el("div", {
    class: "vsc-command-palette",
    style: `position:fixed;top:0;left:50%;transform:translateX(-50%);width:600px;max-width:80vw;display:none;flex-direction:column;z-index:9998;margin-top:0;background:${C.menuBg};border:1px solid ${C.borderLight};border-top:none;border-radius:0 0 8px 8px;box-shadow:0 8px 40px rgba(0,0,0,0.55);overflow:hidden;`,
  });
  const commandInput = el("input", {
    type: "text",
    placeholder: ">",
    class: "vsc-input",
    style: `width:100%;padding:8px 14px;background:${C.inputBg};border:none;border-bottom:1px solid ${C.border};border-radius:0;font-size:13px;box-sizing:border-box;`,
  }) as HTMLInputElement;
  const commandList = el("div", { style: "max-height:300px;overflow-y:auto;" });
  commandPalette.append(commandInput, commandList);

  root.append(titleBar, mainArea, statusBar, sidebarBackdrop, toastContainer, contextMenuEl, commandPalette);

  return {
    root, titleBar, titleText, titleCenter: titleCenterLabel, titleActions, titleMenuBar,
    activityBar: activityTop, activityBottom,
    sidebarContainer, sidebarHeader: sidebarHeaderLabel, sidebarToolbar, sidebarContent,
    tabBar, tabList, tabActions, editorContainer, settingsWebview, welcomePage, breadcrumbBar,
    bottomPanel, bottomPanelTabs, bottomPanelContent, bottomPanelActions,
    statusBar, statusLeft, statusRight,
    sidebarBackdrop, toastContainer, contextMenuEl, commandPalette, commandInput, commandList,
  };
}
