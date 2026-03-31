/**
 * monaco-vanced — Plugin-based IDE built on Monaco Editor
 *
 * This is the main entry point for the npm package.
 * Users import plugins and the core engine from here.
 */

// ── Core Engine ──────────────────────────────────────────────
export { PluginEngine } from "@core/plugin-engine";
export { EventBus } from "@core/event-bus";
export { PluginContext } from "@core/plugin-context";
export { createMonacoIDE } from "@core/facade";
export type { CreateIDEOptions, MonacoVancedInstance } from "@core/facade";

// ── Core Types ───────────────────────────────────────────────
export type {
  MonacoPlugin,
  PluginContext as PluginContextType,
  Monaco,
  MonacoEditor,
  IDisposable,
  BootConfig,
} from "@core/types";
