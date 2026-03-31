// ── Indexer Module — Web Worker ────────────────────────────────
// Runs symbol parsing off the main thread.
// Receives ParseRequest messages, returns ParseResponse.

import { parseSymbols } from "./parser";
import type { WorkerMessage, WorkerResponse } from "./types";

const ctx = globalThis as unknown as { onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null; postMessage: (msg: WorkerResponse) => void };

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const msg = event.data;

  if (msg.type === "parse") {
    try {
      const symbols = parseSymbols(msg.path, msg.content, msg.languageId);
      const response: WorkerResponse = {
        type: "parsed",
        id: msg.id,
        path: msg.path,
        symbols,
      };
      ctx.postMessage(response);
    } catch (e) {
      const response: WorkerResponse = {
        type: "error",
        id: msg.id,
        message: e instanceof Error ? e.message : String(e),
      };
      ctx.postMessage(response);
    }
  }

  // "remove" messages are handled by the main thread's SymbolTable directly
};
