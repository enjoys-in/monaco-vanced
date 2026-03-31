// ── Extension Module — Web Worker Sandbox ────────────────────

import type { ExtensionManifest } from "./types";

export class ExtensionSandbox {
  private worker: Worker | null = null;
  private handlers: Array<(data: unknown) => void> = [];
  private extensionId: string | null = null;

  /** Load extension code into a dedicated Web Worker */
  load(manifest: ExtensionManifest, code: string): void {
    this.extensionId = manifest.id;

    const blob = new Blob(
      [
        `// Extension: ${manifest.id}@${manifest.version}\n`,
        `const __manifest = ${JSON.stringify(manifest)};\n`,
        `const __api = { postMessage: self.postMessage.bind(self) };\n`,
        code,
      ],
      { type: "application/javascript" },
    );

    const url = URL.createObjectURL(blob);
    this.worker = new Worker(url, { name: `ext-${manifest.id}` });
    URL.revokeObjectURL(url);

    this.worker.onmessage = (e: MessageEvent) => {
      for (const handler of this.handlers) {
        try {
          handler(e.data);
        } catch (err) {
          console.warn(`[extension-sandbox] handler error (${this.extensionId}):`, err);
        }
      }
    };

    this.worker.onerror = (e) => {
      console.error(`[extension-sandbox] worker error (${this.extensionId}):`, e.message);
    };
  }

  /** Terminate the worker */
  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.handlers = [];
  }

  /** Send a message to the worker */
  postMessage(data: unknown): void {
    this.worker?.postMessage(data);
  }

  /** Register a message handler */
  onMessage(handler: (data: unknown) => void): void {
    this.handlers.push(handler);
  }

  get isRunning(): boolean {
    return this.worker !== null;
  }
}
