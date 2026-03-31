// ── Performance Module — HeuristicEngine ──────────────────────

import type { Rule } from "./rules";
import { DEFAULT_RULES } from "./rules";

export interface HeuristicContext {
  fileSizeKB?: number;
  isTyping?: boolean;
  memoryPercent?: number;
  activePlugins?: number;
  language?: string;
}

export class HeuristicEngine {
  private readonly rules: Rule[];

  constructor(customRules?: Rule[]) {
    this.rules = customRules ?? [...DEFAULT_RULES];
  }

  evaluate(context: HeuristicContext): Rule[] {
    return this.rules.filter((rule) => rule.condition(context));
  }

  addRule(rule: Rule): void {
    this.rules.push(rule);
  }

  removeRule(description: string): void {
    const idx = this.rules.findIndex((r) => r.description === description);
    if (idx !== -1) this.rules.splice(idx, 1);
  }
}
