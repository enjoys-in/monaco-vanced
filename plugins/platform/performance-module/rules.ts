// ── Performance Module — Rules ────────────────────────────────

import type { HeuristicContext } from "./heuristics";

export interface Rule {
  condition: (ctx: HeuristicContext) => boolean;
  action: string;
  description: string;
}

export const DEFAULT_RULES: Rule[] = [
  {
    description: "Large file — reduce features",
    condition: (ctx) => (ctx.fileSizeKB ?? 0) > 500,
    action: "disable-minimap,disable-word-wrap",
  },
  {
    description: "Typing — pause indexing",
    condition: (ctx) => ctx.isTyping === true,
    action: "pause-indexing",
  },
  {
    description: "High memory — reduce caches",
    condition: (ctx) => (ctx.memoryPercent ?? 0) > 80,
    action: "reduce-caches,disable-preview",
  },
  {
    description: "Many plugins — defer non-essential",
    condition: (ctx) => (ctx.activePlugins ?? 0) > 20,
    action: "defer-non-essential",
  },
  {
    description: "Very large file — minimal mode",
    condition: (ctx) => (ctx.fileSizeKB ?? 0) > 2000,
    action: "minimal-mode",
  },
];
