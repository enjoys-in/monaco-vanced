// ── Editor Wiring ─────────────────────────────────────────────
// file:open, content changes, save, settings→editor, theme, language detection

import * as monaco from "monaco-editor";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";
import {
  FileEvents, SettingsEvents, ThemeEvents, TabEvents, EditorEvents,
} from "@enjoys/monaco-vanced/core/events";
import { BUILTIN_THEME_NAMES, THEME_DEFS, registerThemes, switchTheme } from "../components/theme";
import type { VirtualFile } from "../wireframe";
import type { MockFsAPI } from "../mock-fs";
import type { PluginApis } from "./plugins";

export interface EditorWiringDeps {
  ide: MonacoVancedInstance;
  eventBus: EventBus;
  mockFs: MockFsAPI;
  models: Map<string, monaco.editor.ITextModel>;
  DEMO_FILES: VirtualFile[];
  apis: PluginApis;
  elements: {
    activityBarEl: HTMLElement;
    statusBarEl: HTMLElement;
    sidebarEl: HTMLElement;
    breadcrumbEl: HTMLElement;
  };
}

export function wireEditor(deps: EditorWiringDeps) {
  const { ide, eventBus, mockFs, models, DEMO_FILES, apis, elements } = deps;
  const { activityBarEl, statusBarEl, sidebarEl, breadcrumbEl } = elements;

  // ── Wire file:open → switch Monaco model ─────────────────
  eventBus.on(FileEvents.Open, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    console.log("[monaco-vanced] file:open →", uri);
    const file = DEMO_FILES.find((f) => f.uri === uri);
    if (!file) return;
    let model = models.get(file.uri);
    if (!model || model.isDisposed()) {
      const monacoUri = monaco.Uri.parse(`file:///${file.uri}`);
      model = monaco.editor.getModel(monacoUri) ?? monaco.editor.createModel(file.content, file.language, monacoUri);
      models.set(file.uri, model);
    }
    if (ide.editor.getModel() !== model) ide.editor.setModel(model);
  });

  // ── Wire editor content changes → mock FS + dirty tracking ──
  const originalContents = new Map<string, string>();
  for (const file of DEMO_FILES) originalContents.set(file.uri, file.content);

  ide.editor.onDidChangeModelContent(() => {
    const model = ide.editor.getModel();
    if (!model) return;
    const uri = model.uri.path.replace(/^\//, "");
    const currentValue = model.getValue();
    mockFs.writeFile(uri, currentValue);
    eventBus.emit(FileEvents.Modified, { uri });
    const original = originalContents.get(uri);
    const dirty = original !== undefined && original !== currentValue;
    eventBus.emit(TabEvents.Dirty, { uri, dirty });
  });

  // ── On file save → mark clean ──────────────────────────────
  eventBus.on(FileEvents.Save, (payload: unknown) => {
    const { uri } = payload as { uri: string };
    const model = models.get(uri);
    if (model) {
      originalContents.set(uri, model.getValue());
      eventBus.emit(TabEvents.Dirty, { uri, dirty: false });
    }
  });

  // ── Wire settings changes → Monaco editor options ────────
  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown; _src?: string };
    if (p._src === "main") return;
    const settingId = p.id ?? p.key ?? "";
    if (!settingId) return;

    if (p.id && !p.key) {
      eventBus.emit(SettingsEvents.Change, { id: settingId, key: settingId, value: p.value, _src: "main" });
      return;
    }

    const optMap: Record<string, string> = {
      "editor.fontSize": "fontSize", "editor.fontFamily": "fontFamily",
      "editor.fontWeight": "fontWeight", "editor.fontLigatures": "fontLigatures",
      "editor.lineHeight": "lineHeight", "editor.letterSpacing": "letterSpacing",
      "editor.tabSize": "tabSize", "editor.insertSpaces": "insertSpaces",
      "editor.wordWrap": "wordWrap", "editor.lineNumbers": "lineNumbers",
      "editor.folding": "folding", "editor.glyphMargin": "glyphMargin",
      "editor.minimap.enabled": "minimap.enabled", "editor.minimap.side": "minimap.side",
      "editor.smoothScrolling": "smoothScrolling", "editor.scrollBeyondLastLine": "scrollBeyondLastLine",
      "editor.cursorBlinking": "cursorBlinking", "editor.cursorStyle": "cursorStyle",
      "editor.cursorSmoothCaretAnimation": "cursorSmoothCaretAnimation",
      "editor.bracketPairColorization.enabled": "bracketPairColorization.enabled",
      "editor.renderWhitespace": "renderWhitespace", "editor.renderLineHighlight": "renderLineHighlight",
      "editor.suggestOnTriggerCharacters": "suggestOnTriggerCharacters",
      "editor.quickSuggestions": "quickSuggestions", "editor.snippetSuggestions": "snippetSuggestions",
      "editor.formatOnPaste": "formatOnPaste", "editor.formatOnType": "formatOnType",
      "diffEditor.renderSideBySide": "renderSideBySide",
    };
    const opt = optMap[settingId];
    if (opt) {
      if (opt.includes(".")) {
        const [parent, child] = opt.split(".");
        ide.editor.updateOptions({ [parent]: { [child]: p.value } });
      } else {
        ide.editor.updateOptions({ [opt]: p.value });
      }
      return;
    }

    switch (settingId) {
      case "workbench.colorTheme": {
        const themeName = String(p.value);
        apis.theme.apply(themeName).catch((err) => {
          const match = BUILTIN_THEME_NAMES.find((n) => n.toLowerCase() === themeName.toLowerCase());
          if (match) apis.theme.apply(match).catch(() => console.warn("[theme] failed to apply:", themeName, err));
        });
        break;
      }
      case "workbench.activityBar.visible":
        activityBarEl.style.display = p.value ? "" : "none"; break;
      case "workbench.statusBar.visible":
        statusBarEl.style.display = p.value ? "" : "none"; break;
      case "workbench.sideBar.location":
        sidebarEl.style.order = p.value === "right" ? "3" : "";
        activityBarEl.style.order = p.value === "right" ? "4" : ""; break;
      case "breadcrumbs.enabled":
        breadcrumbEl.style.display = p.value ? "" : "none"; break;
      case "workbench.editor.showIcons":
        document.documentElement.style.setProperty("--tab-icon-display", p.value ? "inline-flex" : "none"); break;
      case "workbench.editor.highlightModifiedTabs":
        document.documentElement.style.setProperty("--tab-dirty-border", p.value ? "2px" : "0"); break;
    }
  });

  // ── Wire theme changes → Monaco + wireframe CSS vars ──────
  eventBus.on(ThemeEvents.Changed, (payload: unknown) => {
    const p = payload as { name?: string; themeId?: string; monacoTheme?: string };
    const themeKey = p.name ?? p.themeId ?? "";
    registerThemes(apis.theme.getThemes());
    const def = THEME_DEFS[themeKey];
    const monacoTheme = p.monacoTheme ?? (def?.type === "light" ? "vs" : def?.type === "hc" ? "hc-black" : "vs-dark");
    monaco.editor.setTheme(monacoTheme);
    switchTheme(themeKey);
  });

  // ── Wire language detection → Monaco model language ───────
  eventBus.on(EditorEvents.LanguageChange, (payload: unknown) => {
    const { uri, language } = payload as { uri: string; language: string };
    const model = models.get(uri);
    if (model) monaco.editor.setModelLanguage(model, language);
  });
}
