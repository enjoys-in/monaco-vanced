// ── Store ──────────────────────────────────────────────────
// Persistent snapshot storage via localStorage.

import type { Snapshot } from "./types";

export class SnapshotStore {
  private snapshots = new Map<string, Snapshot[]>();
  private idMap = new Map<string, Snapshot>();
  private maxSnapshots: number;
  private persistKey: string;

  constructor(maxSnapshots = 100, persistKey = "monaco-vanced:snapshots") {
    this.maxSnapshots = maxSnapshots;
    this.persistKey = persistKey;
    this.restore();
  }

  add(snapshot: Snapshot): void {
    if (!this.snapshots.has(snapshot.file)) this.snapshots.set(snapshot.file, []);
    const list = this.snapshots.get(snapshot.file)!;
    list.push(snapshot);
    if (list.length > this.maxSnapshots) list.shift();
    this.idMap.set(snapshot.id, snapshot);
    this.persist();
  }

  getByFile(file: string): Snapshot[] {
    return this.snapshots.get(file) ?? [];
  }

  getById(id: string): Snapshot | undefined {
    return this.idMap.get(id);
  }

  clear(): void {
    this.snapshots.clear();
    this.idMap.clear();
    this.persist();
  }

  private persist(): void {
    try {
      const all: Snapshot[] = [];
      for (const list of this.snapshots.values()) all.push(...list);
      localStorage.setItem(this.persistKey, JSON.stringify(all));
    } catch { /* ignore */ }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(this.persistKey);
      if (!raw) return;
      const data = JSON.parse(raw) as Snapshot[];
      for (const s of data) {
        this.add(s);
      }
    } catch { /* ignore */ }
  }
}
