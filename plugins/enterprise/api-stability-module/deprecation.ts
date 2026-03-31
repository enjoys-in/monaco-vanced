// ── Deprecation Registry ───────────────────────────────────

import type { DeprecationEntry } from "./types";

export class DeprecationRegistry {
  private readonly entries = new Map<string, DeprecationEntry>();

  register(entry: DeprecationEntry): void {
    this.entries.set(entry.api, entry);
  }

  check(api: string): DeprecationEntry | null {
    const entry = this.entries.get(api) ?? null;
    if (entry) {
      console.warn(
        `[Deprecated] "${api}" has been deprecated since ${entry.since}.` +
          (entry.replacement ? ` Use "${entry.replacement}" instead.` : "") +
          (entry.message ? ` ${entry.message}` : ""),
      );
    }
    return entry;
  }

  getAll(): DeprecationEntry[] {
    return [...this.entries.values()];
  }
}
