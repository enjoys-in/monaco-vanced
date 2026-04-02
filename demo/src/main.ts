// ══════════════════════════════════════════════════════════════
// Monaco Vanced — Demo Entry Point
// Slim orchestrator that delegates to bootstrap modules.
// ══════════════════════════════════════════════════════════════

import "./style.css";
import * as monaco from "monaco-editor";

// ── Core ─────────────────────────────────────────────────────
import { createMonacoIDE } from "@enjoys/monaco-vanced/core/facade";
import { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MonacoVancedInstance } from "@enjoys/monaco-vanced/core/facade";
import { FileEvents, WelcomeEvents, SettingsEvents, PluginEvents, ExtensionEvents } from "@enjoys/monaco-vanced/core/events";

// ── Theme ────────────────────────────────────────────────────
import { initThemeVars, switchTheme, registerThemes } from "./components/theme";
import type { ThemeDefinition } from "../../plugins/theming/theme-module/types";
import draculaTheme from "../../plugins/theming/theme-module/builtin/dracula.json";
import githubDarkTheme from "../../plugins/theming/theme-module/builtin/github-dark.json";
import githubLightTheme from "../../plugins/theming/theme-module/builtin/github-light.json";
import monokaiTheme from "../../plugins/theming/theme-module/builtin/monokai.json";
import oneDarkTheme from "../../plugins/theming/theme-module/builtin/one-dark.json";

// ── Zustand settings store ───────────────────────────────────
import { useSettingsStore } from "./stores/settings-store";

// ── Mock file system ─────────────────────────────────────────
import { createMockFs, seedDemoProject } from "./mock-fs";
import { detectLanguage } from "@enjoys/monaco-vanced/language/language-detection";

// ── Wireframe + React ────────────────────────────────────────
import { mountWireframe, type VirtualFile } from "./wireframe";
import { mountReactComponents } from "./components/mount";

// ── Bootstrap modules ────────────────────────────────────────
import { allPlugins, wireframeApis, pluginApis, memoryStore, encoder } from "./bootstrap/plugins";
import { configureWorkers, defaultEditorOptions } from "./bootstrap/workers";
import { wireEditor } from "./bootstrap/editor-wiring";
import { wireStatusBar } from "./bootstrap/statusbar";
import { wireCommands } from "./bootstrap/commands";
import { wirePlugins } from "./bootstrap/plugin-wiring";

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

let ide: MonacoVancedInstance;
const models = new Map<string, monaco.editor.ITextModel>();

function buildVirtualFiles(fs: ReturnType<typeof createMockFs>): VirtualFile[] {
  const result: VirtualFile[] = [];
  for (const [path, content] of fs.getAllFiles()) {
    const name = path.split("/").pop() ?? path;
    const detected = detectLanguage(path, content, monaco.languages);
    result.push({ uri: path, name, language: detected.languageId, content });
  }
  return result;
}

function getOrCreateModel(file: VirtualFile): monaco.editor.ITextModel {
  let model = models.get(file.uri);
  if (!model || model.isDisposed()) {
    const monacoUri = monaco.Uri.parse(`file:///${file.uri}`);
    model = monaco.editor.getModel(monacoUri) ?? monaco.editor.createModel(file.content, file.language, monacoUri);
    models.set(file.uri, model);
  }
  return model;
}

// ══════════════════════════════════════════════════════════════
// Bootstrap
// ══════════════════════════════════════════════════════════════

async function bootstrap() {
  const appRoot = document.getElementById("app");
  if (!appRoot) throw new Error("Missing #app element");

  // ── 1. Configure workers + compiler options ──────────────
  configureWorkers();

  // ── 2. Theme CSS vars (before wireframe) ─────────────────
  initThemeVars();

  // ── 3. Event bus ─────────────────────────────────────────
  const eventBus = new EventBus();

  // ── 4. Zustand hydrate ───────────────────────────────────
  await useSettingsStore.getState().hydrate();

  // ── 5. Mock filesystem + virtual files ───────────────────
  const mockFs = createMockFs(eventBus);
  seedDemoProject(mockFs);
  const DEMO_FILES = buildVirtualFiles(mockFs);

  // Seed the in-memory FS adapter from mock files
  for (const [path, content] of mockFs.getAllFiles()) {
    memoryStore.set(path, encoder.encode(content));
  }

  // ── 6. Mount wireframe ───────────────────────────────────
  const {
    editorContainer, settingsEl, welcomeEl, tabListEl, breadcrumbEl,
    titleCenterEl, activityBarEl, statusBarEl, sidebarEl,
  } = mountWireframe(appRoot, wireframeApis, eventBus, DEMO_FILES, mockFs, {
    iconApi: pluginApis.icon,
    extensionApi: pluginApis.extension,
    vsixApi: pluginApis.vsix,
    authApi: pluginApis.auth,
    marketplaceApi: pluginApis.marketplace,
    aiApi: pluginApis.ai,
    indexerApi: pluginApis.indexer,
  });

  // ── 7. Register builtin themes ───────────────────────────
  const builtinThemes = [draculaTheme, githubDarkTheme, githubLightTheme, monokaiTheme, oneDarkTheme] as unknown as ThemeDefinition[];
  for (const t of builtinThemes) pluginApis.theme.register(t);

  // ── 8. Determine default file ────────────────────────────
  const defaultFile = DEMO_FILES.find((f) => f.uri === "src/app.tsx")
    ?? DEMO_FILES.find((f) => f.uri === "src/main.tsx")
    ?? DEMO_FILES[0];

  // ── 9. Create IDE ────────────────────────────────────────
  ide = await createMonacoIDE({
    container: editorContainer,
    monaco,
    plugins: allPlugins,
    language: defaultFile.language,
    editorOptions: { ...defaultEditorOptions as Record<string, unknown>, model: null },
    eventBus,
  });

  console.log("[monaco-vanced] IDE ready:", ide.engine.getRegisteredIds());

  // ── 10. Init plugin states in Zustand ────────────────────
  for (const p of allPlugins) {
    useSettingsStore.getState().initPlugin(p.id, true);
  }

  // ── 11. Bridge: Zustand → settings plugin ────────────────
  useSettingsStore.subscribe(
    (s) => s.settings,
    (settings, prevSettings) => {
      for (const [key, value] of Object.entries(settings)) {
        if (prevSettings[key] !== value) {
          pluginApis.settings.set(key, value, "user");
        }
      }
    },
  );

  // ── 11b. Bridge: plugin enable/disable → PluginEngine ────
  useSettingsStore.subscribe(
    (s) => s.plugins,
    (plugins, prevPlugins) => {
      for (const [id, state] of Object.entries(plugins)) {
        const prev = prevPlugins[id];
        if (prev && prev.enabled !== state.enabled) {
          if (state.enabled) {
            ide.engine.enablePlugin(id, monaco, ide.editor);
          } else {
            ide.engine.disablePlugin(id);
          }
        }
      }
    },
  );

  // Also listen for extension events emitted by the Settings UI
  eventBus.on(ExtensionEvents.Enabled, (p: unknown) => {
    const { id } = p as { id: string };
    if (!ide.engine.isPluginEnabled(id)) {
      ide.engine.enablePlugin(id, monaco, ide.editor);
    }
  });
  eventBus.on(ExtensionEvents.Disabled, (p: unknown) => {
    const { id } = p as { id: string };
    if (ide.engine.isPluginEnabled(id)) {
      ide.engine.disablePlugin(id);
    }
  });

  // ── 12. Register runtime themes ──────────────────────────
  registerThemes(pluginApis.theme.getThemes());
  const currentThemeId = pluginApis.theme.getCurrent();
  if (currentThemeId) switchTheme(currentThemeId);

  // ── 13. Mount React components ───────────────────────────
  mountReactComponents({
    settingsEl,
    welcomeEl,
    eventBus,
    recentFiles: DEMO_FILES.slice(0, 6).map((f) => ({ uri: f.uri, name: f.name })),
    tabListEl,
    breadcrumbEl,
    titleCenterEl,
    iconApi: pluginApis.icon,
    fsApi: mockFs,
    themeApi: pluginApis.theme,
    extensionApi: pluginApis.extension,
  });

  // ── 14. Pre-create all models ────────────────────────────
  for (const file of DEMO_FILES) getOrCreateModel(file);

  // ── 15. Wire all bootstrap modules ───────────────────────
  wireEditor({
    ide, eventBus, mockFs, models, DEMO_FILES,
    apis: pluginApis,
    elements: { activityBarEl, statusBarEl, sidebarEl, breadcrumbEl },
  });

  wireStatusBar({ ide, eventBus, mockFs, models, apis: pluginApis });

  wireCommands({ ide, eventBus, apis: pluginApis });

  wirePlugins({ ide, eventBus, models, DEMO_FILES, apis: pluginApis });

  // ── 16. Startup editor behavior ──────────────────────────
  const startupEditor: string = "welcomePage";
  switch (startupEditor) {
    case "none":
      break;
    case "newUntitledFile":
      ide.editor.setModel(monaco.editor.createModel("", "plaintext", monaco.Uri.parse("file:///untitled-1")));
      break;
    case "readme": {
      const readmeFile = DEMO_FILES.find((f) => f.uri.toLowerCase() === "readme.md");
      if (readmeFile) eventBus.emit(FileEvents.Open, { uri: readmeFile.uri, label: readmeFile.name });
      break;
    }
    case "welcomePage":
    default:
      eventBus.emit(WelcomeEvents.Show, {});
      break;
  }

  eventBus.on(SettingsEvents.Change, (payload: unknown) => {
    const p = payload as { id?: string; key?: string; value: unknown };
    const settingId = p.id ?? p.key ?? "";
    if (settingId === "workbench.startupEditor") {
      try { localStorage.setItem("monaco-vanced:startupEditor", String(p.value)); } catch { /* ignore */ }
    }
  });

  // ── 17. Dev console exposure ─────────────────────────────
  (window as Record<string, unknown>).__apis = pluginApis;

  pluginApis.notification.show({
    type: "info",
    message: "Welcome to Monaco Vanced — Right-click for context menu. Ctrl+Shift+P for command palette.",
    duration: 6000,
  });

  window.monaco = monaco;
  window.editor = ide.editor;
  window.engine = ide.engine;
  window.eventBus = ide.eventBus;
}

bootstrap().catch(console.error);
