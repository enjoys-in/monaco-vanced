// ── Predictive Module ──────────────────────────────────────
// File/command prediction from usage patterns.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { PredictEvents } from "@core/events";
import type { PredictiveConfig, PredictiveModuleAPI } from "./types";
import { FilePredictor } from "./file-predictor";
import { CommandPredictor } from "./command-predictor";
import { Preloader } from "./preloader";

export function createPredictivePlugin(
  config: PredictiveConfig = {},
): { plugin: MonacoPlugin; api: PredictiveModuleAPI } {
  const max = config.maxPredictions ?? 500;
  const decay = config.decayFactor ?? 0.95;
  const key = config.persistKey ?? "monaco-vanced:predictive";

  const filePredictor = new FilePredictor(max, decay, key);
  const commandPredictor = new CommandPredictor(max, decay, key);
  let ctx: PluginContext | null = null;

  const preloader = new Preloader((filePath) => {
    ctx?.emit(PredictEvents.PreloadStart, { filePath });
  });

  const api: PredictiveModuleAPI = {
    recordFile(filePath) {
      filePredictor.record(filePath);
      // Auto-preload top predictions
      const predictions = filePredictor.predict(3);
      preloader.preload(predictions.map((p) => p.value));
    },

    recordCommand(command) {
      commandPredictor.record(command);
      ctx?.emit(PredictEvents.CommandSuggested, {
        predictions: commandPredictor.predict(3),
      });
    },

    predictFiles: (limit) => filePredictor.predict(limit),
    predictCommands: (limit) => commandPredictor.predict(limit),

    preload(filePaths) {
      preloader.preload(filePaths);
    },

    getStats: () => ({
      files: filePredictor.getCount(),
      commands: commandPredictor.getCount(),
    }),

    clear() {
      filePredictor.clear();
      commandPredictor.clear();
      preloader.clear();
    },
  };

  const plugin: MonacoPlugin = {
    id: "predictive-module",
    name: "Predictive Module",
    version: "1.0.0",
    description: "File and command prediction from usage patterns",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      ctx = null;
    },
  };

  return { plugin, api };
}

export type { PredictionRecord, PredictiveConfig, PredictiveModuleAPI } from "./types";
export { FilePredictor } from "./file-predictor";
export { CommandPredictor } from "./command-predictor";
export { Preloader } from "./preloader";
export { FrequencyModel } from "./model";
