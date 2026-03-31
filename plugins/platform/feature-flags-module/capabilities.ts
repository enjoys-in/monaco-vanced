// ── Feature Flags Module — CapabilityDetector ─────────────────

export interface CapabilityReport {
  webWorker: boolean;
  sharedArrayBuffer: boolean;
  indexedDB: boolean;
  opfs: boolean;
  webSocket: boolean;
  readableStream: boolean;
}

export class CapabilityDetector {
  detect(): CapabilityReport {
    return {
      webWorker: typeof Worker !== "undefined",
      sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      indexedDB: typeof indexedDB !== "undefined",
      opfs: typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in (navigator.storage ?? {}),
      webSocket: typeof WebSocket !== "undefined",
      readableStream: typeof ReadableStream !== "undefined",
    };
  }

  toFlags(): Map<string, boolean> {
    const report = this.detect();
    const flags = new Map<string, boolean>();
    for (const [key, value] of Object.entries(report)) {
      flags.set(`capability.${key}`, value);
    }
    return flags;
  }
}
