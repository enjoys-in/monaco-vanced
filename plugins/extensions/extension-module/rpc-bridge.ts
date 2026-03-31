// ── Extension Module — RPC Bridge ────────────────────────────

type RPCHandler = (...args: unknown[]) => unknown | Promise<unknown>;

interface RPCRequest {
  __rpc: true;
  id: string;
  method: string;
  args: unknown[];
}

interface RPCResponse {
  __rpc_response: true;
  id: string;
  result?: unknown;
  error?: string;
}

function isRPCRequest(data: unknown): data is RPCRequest {
  return typeof data === "object" && data !== null && (data as RPCRequest).__rpc === true;
}

function isRPCResponse(data: unknown): data is RPCResponse {
  return typeof data === "object" && data !== null && (data as RPCResponse).__rpc_response === true;
}

let rpcIdCounter = 0;

export class RPCBridge {
  private methods = new Map<string, RPCHandler>();
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private sendFn: (data: unknown) => void;

  constructor(sendFn: (data: unknown) => void) {
    this.sendFn = sendFn;
  }

  /** Call a remote method */
  call(method: string, ...args: unknown[]): Promise<unknown> {
    const id = `rpc_${++rpcIdCounter}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const request: RPCRequest = { __rpc: true, id, method, args };
      this.sendFn(request);

      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC call "${method}" timed out`));
        }
      }, 30_000);
    });
  }

  /** Expose methods callable by the remote side */
  expose(methods: Record<string, RPCHandler>): void {
    for (const [name, fn] of Object.entries(methods)) {
      this.methods.set(name, fn);
    }
  }

  /** Handle an incoming message — call from your message listener */
  async handleMessage(data: unknown): Promise<void> {
    if (isRPCRequest(data)) {
      const handler = this.methods.get(data.method);
      const response: RPCResponse = { __rpc_response: true, id: data.id };

      if (!handler) {
        response.error = `Unknown RPC method: "${data.method}"`;
      } else {
        try {
          response.result = await handler(...data.args);
        } catch (e) {
          response.error = e instanceof Error ? e.message : String(e);
        }
      }
      this.sendFn(response);
    } else if (isRPCResponse(data)) {
      const pending = this.pending.get(data.id);
      if (pending) {
        this.pending.delete(data.id);
        if (data.error) {
          pending.reject(new Error(data.error));
        } else {
          pending.resolve(data.result);
        }
      }
    }
  }

  dispose(): void {
    for (const [, { reject }] of this.pending) {
      reject(new Error("RPC bridge disposed"));
    }
    this.pending.clear();
    this.methods.clear();
  }
}
