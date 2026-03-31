// ── Crash Recovery Module — Plugin Entry ──────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { RecoveryConfig, CrashRecoveryModuleAPI, CrashReport } from "./types";
import { BufferSaver } from "./buffer-saver";
import { StateSnapshot } from "./state-snapshot";
import { SafeModeManager } from "./safe-mode";
import { CrashReportBuilder } from "./crash-report";
import { CrashEvents } from "@core/events";

export type { RecoveryConfig, CrashRecoveryModuleAPI, CrashReport, EditorState } from "./types";
export { BufferSaver } from "./buffer-saver";
export { StateSnapshot } from "./state-snapshot";
export { SafeModeManager } from "./safe-mode";
export { CrashReportBuilder } from "./crash-report";

export function createCrashRecoveryPlugin(config: RecoveryConfig = {}): {
  plugin: MonacoPlugin;
  api: CrashRecoveryModuleAPI;
} {
  const persistKey = config.persistKey ?? "monaco-unsaved";
  const bufferSaver = new BufferSaver(persistKey, config.bufferIntervalMs);
  const stateSnapshot = new StateSnapshot();
  const safeModeManager = new SafeModeManager(
    config.maxCrashCount,
    config.crashWindowMs,
  );
  const crashReportBuilder = new CrashReportBuilder();
  const recoveryHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let lastCrashReport: CrashReport | null = null;

  function handleUnhandledError(event: ErrorEvent | PromiseRejectionEvent): void {
    const reason = event instanceof ErrorEvent
      ? event.message
      : String((event as PromiseRejectionEvent).reason);

    const error = event instanceof ErrorEvent ? event.error : (event as PromiseRejectionEvent).reason;

    safeModeManager.recordCrash();
    lastCrashReport = crashReportBuilder.capture(reason, error);
    ctx?.emit(CrashEvents.Detected, lastCrashReport);
  }

  const api: CrashRecoveryModuleAPI = {
    saveBuffer(file: string, content: string): void {
      bufferSaver.save(file, content);
    },

    getUnsavedFiles(): Map<string, string> {
      return bufferSaver.getAll();
    },

    clearRecovery(): void {
      bufferSaver.clear();
      stateSnapshot.clear();
      lastCrashReport = null;
    },

    getCrashReport(): CrashReport | null {
      return lastCrashReport;
    },

    isSafeMode(): boolean {
      return safeModeManager.isSafeMode();
    },

    enableSafeMode(): void {
      safeModeManager.enableSafeMode();
    },

    onRecovery(handler: (data?: unknown) => void): IDisposable {
      recoveryHandlers.push(handler);
      return {
        dispose() {
          const idx = recoveryHandlers.indexOf(handler);
          if (idx !== -1) recoveryHandlers.splice(idx, 1);
        },
      };
    },
  };

  const onError = (e: ErrorEvent) => handleUnhandledError(e);
  const onRejection = (e: PromiseRejectionEvent) => handleUnhandledError(e);

  const plugin: MonacoPlugin = {
    id: "platform.crash-recovery",
    name: "Crash Recovery Module",
    version: "1.0.0",
    description: "Buffer saving, state snapshots, safe mode, and crash reporting",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;

      window.addEventListener("error", onError);
      window.addEventListener("unhandledrejection", onRejection);

      // Check for unsaved recovery data
      const unsaved = bufferSaver.getAll();
      if (unsaved.size > 0) {
        ctx.emit(CrashEvents.RecoveryStart, { fileCount: unsaved.size });
        recoveryHandlers.forEach((h) => {
          try { h({ fileCount: unsaved.size, files: Array.from(unsaved.keys()) }); } catch {}
        });
      }
    },

    onDispose() {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      bufferSaver.dispose();
      disposables.forEach((d) => d.dispose());
      recoveryHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
