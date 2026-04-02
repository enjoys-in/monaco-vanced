// ── Commands ──────────────────────────────────────────────────
// All editor actions + command palette items

import * as monaco from "monaco-editor";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";
import {
  PanelEvents, SidebarEvents, SettingsEvents, AiEvents, WelcomeEvents,
} from "@enjoys/monaco-vanced/core/events";
import type { PluginApis } from "./plugins";

export interface CommandsDeps {
  ide: MonacoVancedInstance;
  eventBus: EventBus;
  apis: PluginApis;
}

export function wireCommands(deps: CommandsDeps) {
  const { ide, eventBus, apis } = deps;
  const { command: commandApi, notification: notificationApi } = apis;

  const actions: monaco.editor.IActionDescriptor[] = [
    {
      id: "monacoVanced.toggleSidebar",
      label: "Toggle Sidebar",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 2,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
      run: () => { eventBus.emit(SidebarEvents.Toggle, {}); },
    },
    {
      id: "monacoVanced.togglePanel",
      label: "Toggle Panel",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 3,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ],
      run: () => { eventBus.emit(PanelEvents.BottomToggle, {}); },
    },
    {
      id: "monacoVanced.openSettings",
      label: "Open Settings",
      contextMenuGroupId: "z_commands",
      contextMenuOrder: 4,
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
      run: () => { eventBus.emit(SettingsEvents.UIOpen, {}); },
    },
    {
      id: "monacoVanced.find",
      label: "Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: (ed) => { ed.getAction("actions.find")?.run(); },
    },
    {
      id: "monacoVanced.findReplace",
      label: "Find and Replace",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
      run: (ed) => { ed.getAction("editor.action.startFindReplaceAction")?.run(); },
    },
    {
      id: "monacoVanced.selectAll",
      label: "Select All",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
      run: (ed) => { ed.getAction("editor.action.selectAll")?.run(); },
    },
    {
      id: "monacoVanced.expandSelection",
      label: "Expand Selection",
      run: (ed) => { ed.getAction("editor.action.smartSelect.expand")?.run(); },
    },
    {
      id: "monacoVanced.showSourceControl",
      label: "Show Source Control",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "scm" }); },
    },
    {
      id: "monacoVanced.showDebug",
      label: "Show Run and Debug",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "debug" }); },
    },
    {
      id: "monacoVanced.showExtensions",
      label: "Show Extensions",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX],
      run: () => { eventBus.emit(SidebarEvents.ViewActivate, { viewId: "extensions" }); },
    },
    {
      id: "monacoVanced.saveFile",
      label: "Save File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => { notificationApi.show({ type: "success", message: "File saved.", duration: 2000 }); },
    },
    {
      id: "monacoVanced.newFile",
      label: "New File",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
      run: () => { notificationApi.show({ type: "info", message: "Use Explorer > New File toolbar button.", duration: 3000 }); },
    },
    {
      id: "monacoVanced.welcome",
      label: "Welcome",
      run: () => { eventBus.emit(WelcomeEvents.Show, {}); },
    },
    {
      id: "monacoVanced.about",
      label: "About",
      run: () => { notificationApi.show({ type: "info", message: "Monaco Vanced v0.2.0 — Plugin-based IDE Architecture", duration: 4000 }); },
    },
    {
      id: "monacoVanced.changeLanguageMode",
      label: "Change Language Mode",
      run: () => { notificationApi.show({ type: "info", message: "Language mode selection coming soon.", duration: 3000 }); },
    },
  ];

  for (const action of actions) ide.editor.addAction(action);
  for (const action of actions) {
    commandApi.register({
      id: action.id,
      label: action.label,
      handler: () => action.run(ide.editor, undefined as never),
    });
  }

  // ── AI commands (palette-only) ───────────────────────────
  commandApi.register({ id: "monacoVanced.aiExplain", label: "AI: Explain Selected Code", handler: () => eventBus.emit(AiEvents.Explain, {}) });
  commandApi.register({ id: "monacoVanced.aiGenerate", label: "AI: Generate Code at Cursor", handler: () => eventBus.emit(AiEvents.Generate, {}) });
  commandApi.register({ id: "monacoVanced.aiFix", label: "AI: Fix Selected Code", handler: () => eventBus.emit(AiEvents.Fix, {}) });
  commandApi.register({
    id: "monacoVanced.aiChat",
    label: "AI: Ask a Question",
    handler: async () => {
      const question = prompt("Ask AI a question:");
      if (!question) return;
      apis.statusbar.register({ id: "ai-thinking", label: "$(loading~spin) AI: Thinking…", alignment: "left", priority: 60, tooltip: "AI is thinking" });
      try {
        const res = await apis.ai.chat([
          { role: "system", content: "You are a helpful coding assistant." },
          { role: "user", content: question },
        ]);
        apis.statusbar.remove("ai-thinking");
        notificationApi.show({ type: "info", message: `AI: ${res.content.slice(0, 400)}`, duration: 10000 });
      } catch {
        apis.statusbar.remove("ai-thinking");
        notificationApi.show({ type: "error", message: "AI request failed.", duration: 3000 });
      }
    },
  });
  commandApi.register({ id: "monacoVanced.aiStatus", label: "AI: Show Status", handler: () => { notificationApi.show({ type: "info", message: `AI Module Status: ${apis.ai.getStatus()}`, duration: 3000 }); } });
  commandApi.register({ id: "monacoVanced.toggleCopilot", label: "Copilot: Toggle Chat Panel", handler: () => eventBus.emit("copilot:toggle", {}) });
}
