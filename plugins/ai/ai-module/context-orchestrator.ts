// ── Context Orchestrator ───────────────────────────────────
// Coordinates context gathering from multiple modules via events.

import type { PluginContext } from "@core/types";
import type { ContextSource } from "./context-builder";
import { buildContext, estimateTokens, type BuiltContext } from "./context-builder";

export interface OrchestratorConfig {
  readonly tokenBudget?: number;
  readonly enabledSources?: string[];
}

export class ContextOrchestrator {
  private sources = new Map<string, () => ContextSource | null>();
  private tokenBudget: number;

  constructor(config: OrchestratorConfig = {}) {
    this.tokenBudget = config.tokenBudget ?? 8000;
  }

  /**
   * Register a named context source provider.
   */
  registerSource(id: string, provider: () => ContextSource | null): void {
    this.sources.set(id, provider);
  }

  /**
   * Unregister a context source.
   */
  unregisterSource(id: string): void {
    this.sources.delete(id);
  }

  /**
   * Gather all registered context sources and build a token-budgeted context.
   */
  gather(extraSources?: ContextSource[]): BuiltContext {
    const allSources: ContextSource[] = [];

    for (const provider of this.sources.values()) {
      const source = provider();
      if (source) allSources.push(source);
    }

    if (extraSources) {
      allSources.push(...extraSources);
    }

    return buildContext(allSources, this.tokenBudget);
  }

  /**
   * Build a context string from gathered sources (for injection into prompts).
   */
  gatherAsString(extraSources?: ContextSource[]): string {
    const built = this.gather(extraSources);
    return built.sources.map((s) => s.content).join("\n\n");
  }

  /**
   * Wire default sources from PluginContext.
   */
  wireDefaults(ctx: PluginContext): void {
    // Current editor content
    this.registerSource("editor.current", () => {
      const content = ctx.getContent();
      if (!content) return null;
      const lang = ctx.getLanguage();
      const path = ctx.getFilePath() ?? "untitled";
      return {
        id: "editor.current",
        priority: 1,
        content: `// Current file: ${path} (${lang})\n${content}`,
        tokenEstimate: estimateTokens(content) + 10,
      };
    });

    // Current selection
    this.registerSource("editor.selection", () => {
      const sel = ctx.getSelectedText();
      if (!sel) return null;
      return {
        id: "editor.selection",
        priority: 0,
        content: `// Selected text:\n${sel}`,
        tokenEstimate: estimateTokens(sel) + 5,
      };
    });
  }

  setTokenBudget(budget: number): void {
    this.tokenBudget = budget;
  }

  getTokenBudget(): number {
    return this.tokenBudget;
  }

  dispose(): void {
    this.sources.clear();
  }
}
