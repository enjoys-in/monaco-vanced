// ── Intent Module ──────────────────────────────────────────
// Detects user intent from typing speed, idle, errors, focus.

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { IntentConfig, IntentModuleAPI, IntentSignal } from "./types";
import { TypingAnalyzer } from "./typing-analyzer";
import { IdleDetector } from "./idle-detector";
import { ErrorResponder } from "./error-responder";
import { FocusTracker } from "./focus-tracker";
import { PatternDetector } from "./patterns";

export function createIntentPlugin(
  config: IntentConfig = {},
): { plugin: MonacoPlugin; api: IntentModuleAPI } {
  const typing = new TypingAnalyzer(config.patternWindow, config.fastWpm, config.slowWpm);
  const errors = new ErrorResponder();
  const focus = new FocusTracker();
  const patterns = new PatternDetector();
  let ctx: PluginContext | null = null;
  let lastSignal: IntentSignal | null = null;
  const allSignals: IntentSignal[] = [];

  function emitSignal(signal: IntentSignal): void {
    lastSignal = signal;
    allSignals.push(signal);
    if (allSignals.length > 500) allSignals.splice(0, allSignals.length - 500);
    patterns.record(signal);
    ctx?.emit(`intent:${signal.type}`, signal);
  }

  const idle = new IdleDetector(config.idleTimeout ?? 5000, () => {
    emitSignal({ type: "idle", confidence: 1, timestamp: Date.now() });
  });

  const api: IntentModuleAPI = {
    onKeystroke() {
      idle.activity();
      const speed = typing.recordKeystroke();
      if (speed === "fast") {
        emitSignal({ type: "typing-fast", confidence: 0.8, timestamp: Date.now() });
      } else if (speed === "slow") {
        emitSignal({ type: "typing-slow", confidence: 0.7, timestamp: Date.now() });
      }
    },

    onIdle() {
      emitSignal({ type: "idle", confidence: 1, timestamp: Date.now() });
    },

    onError(diagnostic) {
      const isNew = errors.report(diagnostic);
      if (isNew) {
        emitSignal({
          type: "error-detected",
          confidence: 0.9,
          timestamp: Date.now(),
          data: diagnostic,
        });
      }
    },

    onFocusChange(panelId) {
      const prev = focus.setFocus(panelId);
      emitSignal({
        type: "focus-change",
        confidence: 1,
        timestamp: Date.now(),
        data: { from: prev, to: panelId },
      });
    },

    getLastSignal: () => lastSignal,

    getSignals(since) {
      if (!since) return [...allSignals];
      return allSignals.filter((s) => s.timestamp >= since);
    },
  };

  const plugin: MonacoPlugin = {
    id: "intent-module",
    name: "Intent Module",
    version: "1.0.0",
    description: "User intent detection from behavioral signals",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      idle.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { IntentType, IntentSignal, IntentConfig, IntentModuleAPI } from "./types";
export { TypingAnalyzer } from "./typing-analyzer";
export { IdleDetector } from "./idle-detector";
export { ErrorResponder } from "./error-responder";
export { FocusTracker } from "./focus-tracker";
export { PatternDetector } from "./patterns";
