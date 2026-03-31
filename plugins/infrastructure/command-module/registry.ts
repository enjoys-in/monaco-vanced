// ── Command Module — Registry ──────────────────────────────────

import type { Command } from "./types";

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  register(cmd: Command): void {
    if (this.commands.has(cmd.id)) {
      console.warn(`[command-registry] Overwriting command: ${cmd.id}`);
    }
    this.commands.set(cmd.id, cmd);
  }

  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getByCategory(category: string): Command[] {
    return this.getAll().filter((c) => c.category === category);
  }

  getCategories(): string[] {
    const cats = new Set<string>();
    for (const cmd of this.commands.values()) {
      if (cmd.category) cats.add(cmd.category);
    }
    return Array.from(cats);
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  clear(): void {
    this.commands.clear();
  }

  get size(): number {
    return this.commands.size;
  }
}
