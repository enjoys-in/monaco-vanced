// ── WebSocket Transport ────────────────────────────────────

export class CollabTransport {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<(data: unknown) => void>>();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error("Collab connection failed"));
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(String(e.data)) as { type: string; data: unknown };
          this.handlers.get(msg.type)?.forEach((h) => h(msg.data));
        } catch { /* ignore malformed */ }
      };
      this.ws.onclose = () => {
        this.handlers.get("disconnect")?.forEach((h) => h(undefined));
      };
    });
  }

  send(type: string, data: unknown): void {
    this.ws?.send(JSON.stringify({ type, data }));
  }

  on(type: string, handler: (data: unknown) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
