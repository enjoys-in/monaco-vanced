// ── Command Module — Command Palette ──────────────────────────

import type { Command } from "./types";
import { CommandRegistry } from "./registry";

export class CommandPalette {
  private readonly registry: CommandRegistry;
  private readonly recentCommands: string[] = [];
  private readonly maxRecent: number;
  private isOpen = false;

  constructor(registry: CommandRegistry, maxRecent = 20) {
    this.registry = registry;
    this.maxRecent = maxRecent;
  }

  open(): Command[] {
    this.isOpen = true;
    return this.getOrderedCommands();
  }

  close(): void {
    this.isOpen = false;
  }

  get visible(): boolean {
    return this.isOpen;
  }

  filter(query: string): Command[] {
    if (!query.trim()) return this.getOrderedCommands();
    const lower = query.toLowerCase();
    const all = this.registry.getAll();

    return all
      .map((cmd) => ({
        cmd,
        score: this.fuzzyScore(cmd, lower),
      }))
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((e) => e.cmd);
  }

  execute(id: string): void {
    this.trackRecent(id);
  }

  getRecent(): string[] {
    return [...this.recentCommands];
  }

  private trackRecent(id: string): void {
    const idx = this.recentCommands.indexOf(id);
    if (idx >= 0) this.recentCommands.splice(idx, 1);
    this.recentCommands.unshift(id);
    if (this.recentCommands.length > this.maxRecent) {
      this.recentCommands.pop();
    }
  }

  private getOrderedCommands(): Command[] {
    const all = this.registry.getAll();
    const recentSet = new Set(this.recentCommands);
    const recent = this.recentCommands
      .map((id) => all.find((c) => c.id === id))
      .filter((c): c is Command => c !== undefined);
    const rest = all.filter((c) => !recentSet.has(c.id));
    return [...recent, ...rest];
  }

  private fuzzyScore(cmd: Command, query: string): number {
    let score = 0;
    const label = cmd.label.toLowerCase();
    const id = cmd.id.toLowerCase();
    const cat = (cmd.category ?? "").toLowerCase();

    if (label === query) return 100;
    if (label.startsWith(query)) score += 50;
    if (label.includes(query)) score += 30;
    if (id.includes(query)) score += 20;
    if (cat.includes(query)) score += 10;

    // Character-by-character fuzzy
    if (score === 0) {
      let qi = 0;
      for (let ci = 0; ci < label.length && qi < query.length; ci++) {
        if (label[ci] === query[qi]) qi++;
      }
      if (qi === query.length) score += 5;
    }

    // Boost recent commands
    if (this.recentCommands.includes(cmd.id)) score += 15;

    return score;
  }
}
