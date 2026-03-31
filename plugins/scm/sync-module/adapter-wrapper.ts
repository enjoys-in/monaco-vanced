// ── Adapter Wrapper ────────────────────────────────────────
// Wraps FS adapter writes to intercept and queue when offline.

import type { QueueEntry } from "./types";
import { OfflineQueue } from "./queue";

export class AdapterWrapper {
  constructor(
    private queue: OfflineQueue,
    private isOnline: () => boolean,
  ) {}

  async interceptWrite(
    uri: string,
    data: unknown,
    doWrite: () => Promise<void>,
  ): Promise<void> {
    if (this.isOnline()) {
      try {
        await doWrite();
      } catch {
        this.queue.enqueue(uri, "write", data);
      }
    } else {
      this.queue.enqueue(uri, "write", data);
    }
  }

  async interceptDelete(
    uri: string,
    doDelete: () => Promise<void>,
  ): Promise<void> {
    if (this.isOnline()) {
      try {
        await doDelete();
      } catch {
        this.queue.enqueue(uri, "delete");
      }
    } else {
      this.queue.enqueue(uri, "delete");
    }
  }

  getPending(): QueueEntry[] {
    return this.queue.getAll();
  }
}
