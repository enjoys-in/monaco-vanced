// ── VSIX Module — Command Loader ─────────────────────────────

import type { VSIXPackage, VSIXManifest } from "../types";

/**
 * Load commands from a VSIX manifest and register them.
 * Returns the list of registered command IDs.
 */
export function loadCommands(
  _pkg: VSIXPackage,
  manifest: VSIXManifest,
  onCommand: (commandId: string, title: string, category?: string) => void,
): string[] {
  const registered: string[] = [];
  const commands = manifest.contributes.commands;
  if (!commands) return registered;

  for (const cmd of commands) {
    try {
      onCommand(cmd.command, cmd.title, cmd.category);
      registered.push(cmd.command);
    } catch (err) {
      console.warn(`[vsix-command-loader] failed to register command "${cmd.command}":`, err);
    }
  }

  return registered;
}
