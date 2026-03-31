// ── Build the full IDE chrome DOM ───────────────────────────

import type { DOMRefs } from "./types";
import { C } from "./types";
import { el } from "./utils";

export function buildShell(root: HTMLElement): DOMRefs {
  root.innerHTML = "";
  root.style.cssText = `display:flex;flex-direction:column;height:100%;width:100%;overflow:hidden;background:${C.bg};color:${C.fg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;`;

  const titleBar = el("div", {
    style: `display:flex;align-items:center;height:35px;min-height:35px;background:${C.titleBg};border-bottom:1px solid ${C.border};padding:0 10px;-webkit-app-region:drag;user-select:none;`,
  });
  const titleText = el("span", { style: `font-size:12px;color:${C.fgDim};-webkit-app-region:no-drag;` }, "Monaco Vanced");
  const titleCenter = el("div", { style: "flex:1;display:flex;justify-content:center;align-items:center;" });
  const titleActions = el("div", { style: `display:flex;gap:8px;align-items:center;-webkit-app-region:no-drag;` });
  titleBar.append(titleText, titleCenter, titleActions);

  const mainArea = el("div", { style: "display:flex;flex:1;overflow:hidden;" });

  const activityBar = el("div", {
    style: `display:flex;flex-direction:column;width:48px;min-width:48px;background:${C.activityBg};border-right:1px solid ${C.border};align-items:center;padding-top:4px;`,
  });

  const sidebarContainer = el("div", {
    style: `display:flex;flex-direction:column;width:240px;min-width:170px;background:${C.sidebarBg};border-right:1px solid ${C.border};overflow:hidden;`,
  });
  const sidebarHeader = el("div", {
    style: `display:flex;align-items:center;height:35px;min-height:35px;padding:0 12px;text-transform:uppercase;font-size:11px;font-weight:600;letter-spacing:0.5px;color:${C.fgDim};`,
  }, "Explorer");
  const sidebarContent = el("div", { style: "flex:1;overflow-y:auto;padding:4px 0;" });
  sidebarContainer.append(sidebarHeader, sidebarContent);

  const editorPanel = el("div", { style: "display:flex;flex-direction:column;flex:1;overflow:hidden;" });

  const tabBar = el("div", {
    style: `display:flex;align-items:center;height:35px;min-height:35px;background:${C.tabInactiveBg};overflow-x:auto;overflow-y:hidden;`,
    class: "tab-bar",
  });

  const editorContainer = el("div", { id: "editor-container", style: "flex:1;overflow:hidden;" });

  const bottomPanel = el("div", {
    style: `display:none;flex-direction:column;height:200px;min-height:100px;border-top:1px solid ${C.border};background:${C.sidebarBg};`,
  });
  const bottomPanelHeader = el("div", {
    style: `display:flex;align-items:center;height:30px;min-height:30px;padding:0 12px;font-size:11px;text-transform:uppercase;font-weight:600;color:${C.fgDim};border-bottom:1px solid ${C.border};`,
  }, "Terminal");
  const bottomPanelContent = el("div", { style: "flex:1;overflow:auto;padding:8px 12px;" });
  bottomPanel.append(bottomPanelHeader, bottomPanelContent);

  editorPanel.append(tabBar, editorContainer, bottomPanel);
  mainArea.append(activityBar, sidebarContainer, editorPanel);

  const statusBar = el("div", {
    style: `display:flex;align-items:center;height:22px;min-height:22px;background:${C.statusBg};color:${C.statusFg};font-size:12px;padding:0 10px;`,
  });
  const statusLeft = el("div", { style: "display:flex;align-items:center;gap:12px;" });
  const statusRight = el("div", { style: "display:flex;align-items:center;gap:12px;margin-left:auto;" });
  statusBar.append(statusLeft, statusRight);

  const toastContainer = el("div", {
    style: "position:fixed;bottom:30px;right:16px;display:flex;flex-direction:column-reverse;gap:8px;z-index:10000;pointer-events:none;max-width:380px;",
  });

  const contextMenuEl = el("div", { style: "position:fixed;display:none;z-index:9999;" });

  const commandPalette = el("div", {
    style: `position:fixed;top:0;left:50%;transform:translateX(-50%);width:600px;max-width:80vw;display:none;flex-direction:column;z-index:9998;margin-top:1px;background:${C.sidebarBg};border:1px solid ${C.border};border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,0.5);overflow:hidden;`,
  });
  const commandInput = el("input", {
    type: "text",
    placeholder: "Type a command…",
    style: `width:100%;padding:8px 14px;background:${C.bg};color:${C.fg};border:none;outline:none;font-size:14px;border-bottom:1px solid ${C.border};`,
  }) as HTMLInputElement;
  const commandList = el("div", { style: "max-height:300px;overflow-y:auto;" });
  commandPalette.append(commandInput, commandList);

  root.append(titleBar, mainArea, statusBar, toastContainer, contextMenuEl, commandPalette);

  return {
    root, titleBar, titleText, titleCenter, titleActions,
    activityBar, sidebarContainer, sidebarHeader, sidebarContent,
    tabBar, editorContainer, bottomPanel, bottomPanelHeader, bottomPanelContent,
    statusBar, statusLeft, statusRight,
    toastContainer, contextMenuEl,
    commandPalette, commandInput, commandList,
  };
}
