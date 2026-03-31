// ── Security Module — CSPBuilder ──────────────────────────────

export interface CSPOptions {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  frameSrc?: string[];
  workerSrc?: string[];
  sandbox?: string[];
}

const DEFAULT_WEBVIEW_CSP: CSPOptions = {
  defaultSrc: ["'none'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", "data:"],
  frameSrc: ["'none'"],
  workerSrc: ["'self'"],
};

export class CSPBuilder {
  private readonly overrides = new Map<string, CSPOptions>();

  registerView(viewId: string, options: CSPOptions): void {
    this.overrides.set(viewId, options);
  }

  build(viewId?: string): string {
    const opts = viewId ? { ...DEFAULT_WEBVIEW_CSP, ...this.overrides.get(viewId) } : DEFAULT_WEBVIEW_CSP;
    const directives: string[] = [];

    if (opts.defaultSrc) directives.push(`default-src ${opts.defaultSrc.join(" ")}`);
    if (opts.scriptSrc) directives.push(`script-src ${opts.scriptSrc.join(" ")}`);
    if (opts.styleSrc) directives.push(`style-src ${opts.styleSrc.join(" ")}`);
    if (opts.imgSrc) directives.push(`img-src ${opts.imgSrc.join(" ")}`);
    if (opts.connectSrc) directives.push(`connect-src ${opts.connectSrc.join(" ")}`);
    if (opts.fontSrc) directives.push(`font-src ${opts.fontSrc.join(" ")}`);
    if (opts.frameSrc) directives.push(`frame-src ${opts.frameSrc.join(" ")}`);
    if (opts.workerSrc) directives.push(`worker-src ${opts.workerSrc.join(" ")}`);
    if (opts.sandbox) directives.push(`sandbox ${opts.sandbox.join(" ")}`);

    return directives.join("; ");
  }
}
