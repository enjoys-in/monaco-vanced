// ── Command Module — Registry ──────────────────────────────────

import type { Command } from "./types";

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();
  private readonly _disabled = new Set<string>();

  register(cmd: Command): void {
    if (this.commands.has(cmd.id)) {
      console.warn(`[command-registry] Overwriting command: ${cmd.id}`);
    }
    // Normalize: if `run` provided but not `handler`, use `run` as handler
    if (!cmd.handler && cmd.run) {
      cmd.handler = cmd.run;
    }
    if (cmd.enabled === false) {
      this._disabled.add(cmd.id);
    }
    this.commands.set(cmd.id, cmd);
  }

  unregister(id: string): boolean {
    this._disabled.delete(id);
    return this.commands.delete(id);
  }

  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getEnabled(): Command[] {
    return this.getAll().filter((c) => !this._disabled.has(c.id));
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

  enable(id: string): void {
    this._disabled.delete(id);
    const cmd = this.commands.get(id);
    if (cmd) cmd.enabled = true;
  }

  disable(id: string): void {
    this._disabled.add(id);
    const cmd = this.commands.get(id);
    if (cmd) cmd.enabled = false;
  }

  isEnabled(id: string): boolean {
    return !this._disabled.has(id);
  }

  clear(): void {
    this.commands.clear();
    this._disabled.clear();
  }

  get size(): number {
    return this.commands.size;
  }
}
