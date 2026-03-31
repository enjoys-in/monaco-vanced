// ── Extension Module — IFrame Sandbox ────────────────────────

export interface IframeSandboxConfig {
  containerId?: string;
  permissions?: string[];
  csp?: string;
}

const DEFAULT_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';";

export class IframeSandbox {
  private iframe: HTMLIFrameElement | null = null;
  private handlers: Array<(data: unknown) => void> = [];
  private listener: ((e: MessageEvent) => void) | null = null;

  /** Create and inject an iframe sandbox */
  create(config: IframeSandboxConfig = {}): void {
    this.iframe = document.createElement("iframe");
    this.iframe.style.display = "none";
    this.iframe.setAttribute("sandbox", this.buildSandboxAttr(config.permissions));

    // Inject CSP via srcdoc
    const csp = config.csp ?? DEFAULT_CSP;
    this.iframe.srcdoc = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="${csp}"></head><body></body></html>`;

    const container = config.containerId
      ? document.getElementById(config.containerId)
      : document.body;
    (container ?? document.body).appendChild(this.iframe);

    // Listen for messages from iframe
    this.listener = (e: MessageEvent) => {
      if (e.source !== this.iframe?.contentWindow) return;
      for (const handler of this.handlers) {
        try {
          handler(e.data);
        } catch (err) {
          console.warn("[iframe-sandbox] handler error:", err);
        }
      }
    };
    window.addEventListener("message", this.listener);
  }

  /** Destroy the iframe */
  destroy(): void {
    if (this.listener) {
      window.removeEventListener("message", this.listener);
      this.listener = null;
    }
    this.iframe?.remove();
    this.iframe = null;
    this.handlers = [];
  }

  /** Post a message to the iframe content */
  postMessage(data: unknown): void {
    this.iframe?.contentWindow?.postMessage(data, "*");
  }

  /** Register a message handler */
  onMessage(handler: (data: unknown) => void): void {
    this.handlers.push(handler);
  }

  private buildSandboxAttr(permissions?: string[]): string {
    const base = ["allow-scripts"];
    if (permissions) {
      for (const p of permissions) {
        if (!base.includes(p)) base.push(p);
      }
    }
    return base.join(" ");
  }

  get isActive(): boolean {
    return this.iframe !== null;
  }
}
