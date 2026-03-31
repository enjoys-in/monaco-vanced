// ── Build the full IDE chrome DOM (VS Code layout) ──────────

import type { DOMRefs } from "./types";
import { C } from "./types";
import { el } from "./utils";

export function buildShell(root: HTMLElement): DOMRefs {
  root.innerHTML = "";
  root.style.cssText = `display:flex;flex-direction:column;height:100%;width:100%;overflow:hidden;background:${C.bg};color:${C.fg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;-webkit-font-smoothing:antialiased;`;

  // ── Title Bar ──────────────────────────────────────────────
  const titleBar = el("div", {
    style: `display:flex;align-items:center;height:30px;min-height:30px;background:${C.titleBg};padding:0;-webkit-app-region:drag;user-select:none;border-bottom:1px solid ${C.border};`,
  });

  // macOS traffic lights spacer
  const trafficSpacer = el("div", {
    style: "width:70px;min-width:70px;-webkit-app-region:no-drag;display:flex;align-items:center;padding-left:8px;gap:8px;",
  });
  // Decorative traffic light dots
  for (const color of ["#ff5f57", "#febc2e", "#28c840"]) {
    const dot = el("div", { style: `width:12px;height:12px;border-radius:50%;background:${color};` });
    trafficSpacer.appendChild(dot);
  }

  // Menu bar
  const titleMenuBar = el("div", {
    style: "display:flex;align-items:center;gap:0;-webkit-app-region:no-drag;padding:0 4px;",
  });

  const titleText = el("span", {
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
    style: "display:flex;gap:2px;align-items:center;-webkit-app-region:no-drag;padding-right:8px;",
  });

  titleBar.append(trafficSpacer, titleMenuBar, titleText, titleCenter, titleActions);

  // ── Main Area ──────────────────────────────────────────────
  const mainArea = el("div", { style: "display:flex;flex:1;overflow:hidden;" });

  // ── Activity Bar ───────────────────────────────────────────
  const activityBar = el("div", {
    style: `display:flex;flex-direction:column;width:48px;min-width:48px;background:${C.activityBg};border-right:1px solid ${C.border};align-items:center;padding-top:0;justify-content:space-between;`,
  });
  const activityTop = el("div", { style: "display:flex;flex-direction:column;align-items:center;width:100%;" });
  const activityBottom = el("div", { style: "display:flex;flex-direction:column;align-items:center;width:100%;padding-bottom:4px;" });
  activityBar.append(activityTop, activityBottom);

  // ── Sidebar ────────────────────────────────────────────────
  const sidebarContainer = el("div", {
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
    style: `display:flex;align-items:stretch;height:35px;min-height:35px;background:${C.tabInactiveBg};border-bottom:1px solid ${C.border};`,
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
    style: `display:flex;align-items:center;min-height:22px;padding:0 12px;background:${C.editorBg};font-size:12px;color:${C.breadcrumbFg};gap:4px;border-bottom:1px solid ${C.border};`,
  });

  // Editor
  const editorContainer = el("div", { id: "editor-container", style: "flex:1;overflow:hidden;" });

  // ── Bottom Panel ───────────────────────────────────────────
  const bottomPanel = el("div", {
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

  editorPanel.append(tabBar, breadcrumbBar, editorContainer, bottomPanel);
  mainArea.append(activityBar, sidebarContainer, editorPanel);

  // ── Status Bar ─────────────────────────────────────────────
  const statusBar = el("div", {
    style: `display:flex;align-items:center;height:22px;min-height:22px;background:${C.statusBg};color:${C.statusFg};font-size:12px;padding:0 8px;user-select:none;`,
  });
  const statusLeft = el("div", { style: "display:flex;align-items:center;gap:0;height:100%;" });
  const statusRight = el("div", { style: "display:flex;align-items:center;gap:0;margin-left:auto;height:100%;" });
  statusBar.append(statusLeft, statusRight);

  // ── Overlays ───────────────────────────────────────────────
  const toastContainer = el("div", {
    style: "position:fixed;bottom:28px;right:12px;display:flex;flex-direction:column-reverse;gap:6px;z-index:10000;pointer-events:none;",
  });

  const contextMenuEl = el("div", { style: "position:fixed;display:none;z-index:9999;" });

  const commandPalette = el("div", {
    style: `position:fixed;top:0;left:50%;transform:translateX(-50%);width:600px;max-width:80vw;display:none;flex-direction:column;z-index:9998;margin-top:0;background:${C.sidebarBg};border:1px solid ${C.border};border-top:none;border-radius:0 0 6px 6px;box-shadow:0 8px 30px rgba(0,0,0,0.5);overflow:hidden;`,
  });
  const commandInput = el("input", {
    type: "text",
    placeholder: ">",
    style: `width:100%;padding:6px 14px;background:${C.bg};color:${C.fg};border:none;outline:none;font-size:13px;border-bottom:1px solid ${C.border};box-sizing:border-box;`,
  }) as HTMLInputElement;
  const commandList = el("div", { style: "max-height:300px;overflow-y:auto;" });
  commandPalette.append(commandInput, commandList);

  root.append(titleBar, mainArea, statusBar, toastContainer, contextMenuEl, commandPalette);

  return {
    root, titleBar, titleText, titleCenter: titleCenterLabel, titleActions, titleMenuBar,
    activityBar: activityTop, activityBottom,
    sidebarContainer, sidebarHeader: sidebarHeaderLabel, sidebarToolbar, sidebarContent,
    tabBar, tabList, tabActions, editorContainer, breadcrumbBar,
    bottomPanel, bottomPanelTabs, bottomPanelContent, bottomPanelActions,
    statusBar, statusLeft, statusRight,
    toastContainer, contextMenuEl, commandPalette, commandInput, commandList,
  };
}
