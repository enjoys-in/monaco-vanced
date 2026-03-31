// ── Command Module — Command Palette ──────────────────────────

import type { Command, ExecutionContext } from "./types";
import type { IDisposable } from "@core/types";
import { CommandRegistry } from "./registry";

export class CommandPalette {
  private readonly registry: CommandRegistry;
  private readonly recentCommands: string[] = [];
  private readonly maxRecent: number;
  private readonly editorDisposables = new Map<unknown, IDisposable[]>();
  private isOpen = false;

  constructor(registry: CommandRegistry, maxRecent = 20) {
    this.registry = registry;
    this.maxRecent = maxRecent;
  }

  /**
   * Registers ALL commands in the registry with a Monaco editor instance
   * via editor.addAction(). Called for every editor instance (tabs, splits).
   * Returns an IDisposable that removes all actions from this editor.
   */
  bindToEditor(editorInstance: unknown): IDisposable {
    const editor = editorInstance as {
      addAction(desc: {
        id: string;
        label: string;
        keybindings?: number[];
        precondition?: string;
        contextMenuGroupId?: string;
        contextMenuOrder?: number;
        run: (ed: unknown) => void;
      }): IDisposable;
      getModel(): unknown;
      getSelection(): unknown;
    };

    const actionDisposables: IDisposable[] = [];

    for (const cmd of this.registry.getEnabled()) {
      const actionDisposable = editor.addAction({
        id: cmd.id,
        label: cmd.label,
        keybindings: cmd.keybinding ? [parseKeybinding(cmd.keybinding)] : undefined,
        precondition: cmd.when,
        contextMenuGroupId: cmd.contextMenuGroup,
        contextMenuOrder: cmd.contextMenuOrder,
        run: (ed) => {
          const execCtx = buildExecutionContext(ed);
          const handler = cmd.handler ?? cmd.run;
          handler?.(execCtx);
        },
      });
      actionDisposables.push(actionDisposable);
    }

    this.editorDisposables.set(editorInstance, actionDisposables);

    return {
      dispose: () => {
        const disposables = this.editorDisposables.get(editorInstance);
        if (disposables) {
          disposables.forEach((d) => d.dispose());
          this.editorDisposables.delete(editorInstance);
        }
      },
    };
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
    const all = this.registry.getEnabled();

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
    const all = this.registry.getEnabled();
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

  dispose(): void {
    for (const disposables of this.editorDisposables.values()) {
      disposables.forEach((d) => d.dispose());
    }
    this.editorDisposables.clear();
  }
}

// ── Helpers ──────────────────────────────────────────────────

function parseKeybinding(binding: string): number {
  // Simple keybinding string → numeric value via bit shifts
  // In real usage, monaco.KeyMod / KeyCode would be used
  let result = 0;
  const parts = binding.toLowerCase().split("+").map((s) => s.trim());
  for (const part of parts) {
    if (part === "ctrl" || part === "cmd") result |= 1 << 11; // CtrlCmd
    else if (part === "shift") result |= 1 << 10;
    else if (part === "alt") result |= 1 << 9;
    else result |= part.charCodeAt(0); // simplified keycode
  }
  return result;
}

function buildExecutionContext(editorInstance: unknown): ExecutionContext {
  const ed = editorInstance as {
    getModel(): { uri?: { toString(): string; scheme?: string }; getLanguageId?(): string } | null;
    getSelection(): { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } | null;
    getValue?(): string;
  };
  const model = ed.getModel?.();
  const selection = ed.getSelection?.();
  const selectedText =
    model && selection
      ? (model as { getValueInRange?(sel: unknown): string }).getValueInRange?.(selection) ?? ""
      : "";

  return {
    editor: editorInstance,
    model,
    selection,
    selectedText,
    filePath: model?.uri?.toString() ?? "",
    language: model?.getLanguageId?.() ?? "",
    scheme: model?.uri?.scheme ?? "file",
  };
}
