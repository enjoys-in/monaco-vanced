// ── Notebook Module — Kernel Client ──────────────────────────
// WebSocket-based kernel connection for code execution.

import type { CellOutput, KernelConfig } from "./types";

export type KernelStatus = "idle" | "busy" | "disconnected" | "restarting";

export class KernelClient {
  private ws: WebSocket | null = null;
  private _status: KernelStatus = "disconnected";
  private pendingExecutions = new Map<string, {
    resolve: (outputs: CellOutput[]) => void;
    reject: (err: Error) => void;
    outputs: CellOutput[];
  }>();
  private msgCounter = 0;

  get status(): KernelStatus {
    return this._status;
  }

  connect(config: KernelConfig): Promise<void> {
    const baseUrl = config.baseUrl ?? "ws://localhost:8888";
    const lang = config.language ?? "python";

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${baseUrl}/kernel/${lang}`);

        this.ws.onopen = () => {
          this._status = "idle";
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data as string) as {
              parentId?: string;
              type?: string;
              content?: Record<string, unknown>;
            };
            this.handleMessage(msg);
          } catch {
            // Ignore malformed messages
          }
        };

        this.ws.onclose = () => {
          this._status = "disconnected";
          this.rejectAllPending("Kernel disconnected");
          this.ws = null;
        };

        this.ws.onerror = () => {
          this._status = "disconnected";
          this.ws = null;
          reject(new Error("Kernel connection failed"));
        };
      } catch (e) {
        this._status = "disconnected";
        reject(e);
      }
    });
  }

  execute(code: string): Promise<CellOutput[]> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this._status === "disconnected") {
        reject(new Error("Kernel not connected"));
        return;
      }

      const msgId = `exec-${++this.msgCounter}`;
      this._status = "busy";

      this.pendingExecutions.set(msgId, { resolve, reject, outputs: [] });

      this.ws.send(JSON.stringify({
        id: msgId,
        type: "execute",
        code,
      }));
    });
  }

  interrupt(): void {
    if (this.ws && this._status === "busy") {
      this.ws.send(JSON.stringify({ type: "interrupt" }));
    }
  }

  restart(): Promise<void> {
    this._status = "restarting";
    this.rejectAllPending("Kernel restarting");

    if (this.ws) {
      this.ws.send(JSON.stringify({ type: "restart" }));
    }

    return new Promise((resolve) => {
      // Wait for reconnection
      setTimeout(() => {
        this._status = "idle";
        resolve();
      }, 1000);
    });
  }

  getStatus(): KernelStatus {
    return this._status;
  }

  disconnect(): void {
    this.rejectAllPending("Disconnected");
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._status = "disconnected";
  }

  private handleMessage(msg: {
    parentId?: string;
    type?: string;
    content?: Record<string, unknown>;
  }): void {
    const parentId = msg.parentId;
    if (!parentId) return;

    const pending = this.pendingExecutions.get(parentId);
    if (!pending) return;

    if (msg.type === "stream" || msg.type === "execute_result") {
      pending.outputs.push({
        type: "text",
        data: String(msg.content?.text ?? msg.content?.data ?? ""),
        mimeType: "text/plain",
      });
    } else if (msg.type === "display_data") {
      const mimeData = msg.content?.data as Record<string, string> | undefined;
      if (mimeData?.["text/html"]) {
        pending.outputs.push({ type: "html", data: mimeData["text/html"], mimeType: "text/html" });
      } else if (mimeData?.["image/png"]) {
        pending.outputs.push({ type: "image", data: mimeData["image/png"], mimeType: "image/png" });
      } else if (mimeData?.["text/plain"]) {
        pending.outputs.push({ type: "text", data: mimeData["text/plain"], mimeType: "text/plain" });
      }
    } else if (msg.type === "error") {
      pending.outputs.push({
        type: "error",
        data: String(msg.content?.ename ?? "Error") + ": " + String(msg.content?.evalue ?? ""),
      });
    } else if (msg.type === "execute_reply") {
      this._status = "idle";
      this.pendingExecutions.delete(parentId);
      pending.resolve(pending.outputs);
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pendingExecutions) {
      pending.reject(new Error(reason));
    }
    this.pendingExecutions.clear();
  }
}
