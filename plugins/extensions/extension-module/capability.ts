// ── Extension Module — Capability Checker ────────────────────

import type { Extension } from "./types";

const CAPABILITY_PERMISSION_MAP: Record<string, string> = {
  readFiles: "fs:read",
  writeFiles: "fs:write",
  network: "network",
  clipboard: "clipboard",
  terminal: "terminal",
  editor: "editor",
  themes: "themes",
  languages: "languages",
  commands: "commands",
  keybindings: "keybindings",
  snippets: "snippets",
};

export class CapabilityChecker {
  /** Check if an extension has a specific capability */
  check(extension: Extension, capability: string): boolean {
    const requiredPermission = CAPABILITY_PERMISSION_MAP[capability];
    if (!requiredPermission) {
      // Unknown capability — deny by default
      return false;
    }
    const permissions = extension.manifest.permissions ?? [];
    return permissions.includes(requiredPermission);
  }

  /** Get all capabilities for an extension */
  getCapabilities(extension: Extension): string[] {
    const permissions = extension.manifest.permissions ?? [];
    const caps: string[] = [];
    for (const [cap, perm] of Object.entries(CAPABILITY_PERMISSION_MAP)) {
      if (permissions.includes(perm)) {
        caps.push(cap);
      }
    }
    return caps;
  }

  /** Enforce a capability — throws if not permitted */
  enforce(extension: Extension, capability: string): void {
    if (!this.check(extension, capability)) {
      throw new Error(
        `Extension "${extension.manifest.id}" lacks permission for capability "${capability}"`,
      );
    }
  }
}
