// ── ESLint lint worker — runs regex-based linting off the main thread ──
// This worker receives lint requests via postMessage and responds with results.

import type { ESLintConfig, LintResult } from "./types";
import { runLint } from "./runner";

export interface LintRequest {
  type: "lint";
  id: number;
  filePath: string;
  content: string;
  config: ESLintConfig;
}

export interface LintResponse {
  type: "result";
  id: number;
  result: LintResult;
}

declare const self: Worker;

self.addEventListener("message", (event: MessageEvent<LintRequest>) => {
  const { type, id, filePath, content, config } = event.data;
  if (type !== "lint") return;

  const result = runLint(filePath, content, config);

  self.postMessage({ type: "result", id, result } satisfies LintResponse);
});
