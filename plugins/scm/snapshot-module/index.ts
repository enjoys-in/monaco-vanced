// ── Snapshot Module ────────────────────────────────────────
// File-level snapshots, time-travel, session persistence.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { SnapshotConfig, SnapshotModuleAPI } from "./types";
import { SnapshotStore } from "./store";
import { Capturer } from "./capturer";
import { getVersions, findByVersion, getLatest } from "./versioning";
import { TimeTraveler } from "./time-travel";
import { saveSessionState, restoreSessionState } from "./session-undo";

export function createSnapshotPlugin(
  config: SnapshotConfig = {},
): { plugin: MonacoPlugin; api: SnapshotModuleAPI } {
  const store = new SnapshotStore(config.maxSnapshots, config.persistKey);
  const capturer = new Capturer(store);
  const traveler = new TimeTraveler();
  let ctx: PluginContext | null = null;

  const api: SnapshotModuleAPI = {
    capture(file, content, cursor) {
      const snap = capturer.capture(file, content, cursor);
      ctx?.emit("snapshot:captured", { id: snap.id, file, version: snap.version });
      return snap;
    },

    getSnapshots: (file) => store.getByFile(file),
    getSnapshot: (id) => store.getById(id),

    restore(id) {
      const snap = store.getById(id);
      if (snap) ctx?.emit("snapshot:restored", { id, file: snap.file });
      return snap;
    },

    getVersions: (file) => getVersions(store.getByFile(file)),

    timeTravelTo(file, version) {
      const snaps = store.getByFile(file);
      const snap = findByVersion(snaps, version);
      if (snap) {
        traveler.setPosition(file, version);
        ctx?.emit("snapshot:time-travel", { file, version });
      }
      return snap;
    },

    saveSession: (state) => saveSessionState(state),
    restoreSession: () => restoreSessionState(),

    undo(file) {
      const snaps = store.getByFile(file);
      const latest = getLatest(snaps);
      if (!latest || snaps.length < 2) return undefined;
      const prev = snaps[snaps.length - 2];
      ctx?.emit("snapshot:undo", { file, version: prev.version });
      return prev;
    },

    clear: () => store.clear(),
  };

  const plugin: MonacoPlugin = {
    id: "snapshot-module",
    name: "Snapshot Module",
    version: "1.0.0",
    description: "File snapshots, time-travel, session persistence",
    onMount(pluginCtx: PluginContext): void { ctx = pluginCtx; },
    onDispose(): void { ctx = null; },
  };

  return { plugin, api };
}

export type { Snapshot, SessionState, SnapshotConfig, SnapshotModuleAPI } from "./types";
export { SnapshotStore } from "./store";
export { Capturer } from "./capturer";
export { prepareRestore } from "./restorer";
export { getVersions, findByVersion, getLatest } from "./versioning";
export { TimeTraveler } from "./time-travel";
export { saveSessionState, restoreSessionState, clearSessionState } from "./session-undo";
