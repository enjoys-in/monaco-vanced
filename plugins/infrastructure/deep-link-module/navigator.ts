// ── Deep Link Module — Navigator ───────────────────────────────

import type { DeepLinkTarget } from "./types";

export type InterceptHandler = (target: DeepLinkTarget) => boolean | Promise<boolean>;

export class DeepLinkNavigator {
  private interceptors: InterceptHandler[] = [];
  private navigationHandler: ((target: DeepLinkTarget) => Promise<void>) | null = null;

  setNavigationHandler(handler: (target: DeepLinkTarget) => Promise<void>): void {
    this.navigationHandler = handler;
  }

  addInterceptor(handler: InterceptHandler): () => void {
    this.interceptors.push(handler);
    return () => {
      const idx = this.interceptors.indexOf(handler);
      if (idx >= 0) this.interceptors.splice(idx, 1);
    };
  }

  async navigate(target: DeepLinkTarget): Promise<void> {
    // Run interceptors — if any returns true, navigation is handled
    for (const intercept of this.interceptors) {
      const handled = await intercept(target);
      if (handled) return;
    }

    if (this.navigationHandler) {
      await this.navigationHandler(target);
      return;
    }

    // Default navigation behavior
    switch (target.type) {
      case "file":
        console.log(`[deep-link] Navigate to file: ${target.path}${target.line ? `:${target.line}` : ""}${target.column ? `:${target.column}` : ""}`);
        break;
      case "panel":
        console.log(`[deep-link] Navigate to panel: ${target.path}`);
        break;
      case "command":
        console.log(`[deep-link] Execute command: ${target.commandId}`, target.args);
        break;
    }
  }

  dispose(): void {
    this.interceptors.length = 0;
    this.navigationHandler = null;
  }
}
