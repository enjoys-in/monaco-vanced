// ── Extension Module — Lifecycle Manager ─────────────────────

import type { Extension, ExtensionManifest } from "./types";
import { ExtensionSandbox } from "./sandbox";

export class ExtensionLifecycle {
  private activated = new Set<string>();

  /** Activate an extension — loads its code into a sandbox */
  async activate(extension: Extension, code?: string): Promise<void> {
    if (this.activated.has(extension.manifest.id)) return;

    if (code && !extension.sandbox) {
      const sandbox = new ExtensionSandbox();
      sandbox.load(extension.manifest, code);
      extension.sandbox = { type: "worker", instance: sandbox };
    }

    extension.state = "enabled";
    this.activated.add(extension.manifest.id);
  }

  /** Deactivate an extension — terminates its sandbox */
  async deactivate(extension: Extension): Promise<void> {
    if (!this.activated.has(extension.manifest.id)) return;

    if (extension.sandbox) {
      const instance = extension.sandbox.instance;
      if (instance instanceof ExtensionSandbox) {
        instance.terminate();
      }
      extension.sandbox = undefined;
    }

    extension.state = "disabled";
    this.activated.delete(extension.manifest.id);
  }

  /** Check if an activation event matches */
  matchesActivationEvent(manifest: ExtensionManifest, event: string): boolean {
    for (const pattern of manifest.activationEvents) {
      if (pattern === "*") return true;
      if (pattern === event) return true;
      // Wildcard matching: "onLanguage:*" matches "onLanguage:typescript"
      if (pattern.endsWith("*") && event.startsWith(pattern.slice(0, -1))) return true;
    }
    return false;
  }

  isActivated(extensionId: string): boolean {
    return this.activated.has(extensionId);
  }

  dispose(): void {
    this.activated.clear();
  }
}
