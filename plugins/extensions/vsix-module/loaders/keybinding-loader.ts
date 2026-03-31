// ── VSIX Module — Keybinding Loader ──────────────────────────

import type { VSIXPackage, VSIXManifest, VSIXKeybindingContribution } from "../types";

/**
 * Load keybindings from a VSIX manifest and register them.
 * Returns the list of registered command IDs.
 */
export function loadKeybindings(
  _pkg: VSIXPackage,
  manifest: VSIXManifest,
  onKeybinding: (binding: VSIXKeybindingContribution) => void,
): string[] {
  const registered: string[] = [];
  const keybindings = manifest.contributes.keybindings;
  if (!keybindings) return registered;

  for (const binding of keybindings) {
    try {
      // Resolve platform-specific key
      const resolvedBinding = resolvePlatformKey(binding);
      onKeybinding(resolvedBinding);
      registered.push(binding.command);
    } catch (err) {
      console.warn(`[vsix-keybinding-loader] failed to register keybinding for "${binding.command}":`, err);
    }
  }

  return registered;
}

function resolvePlatformKey(binding: VSIXKeybindingContribution): VSIXKeybindingContribution {
  const platform = detectPlatform();
  let key = binding.key;
  if (platform === "mac" && binding.mac) key = binding.mac;
  else if (platform === "linux" && binding.linux) key = binding.linux;
  else if (platform === "win" && binding.win) key = binding.win;

  return { ...binding, key };
}

function detectPlatform(): "mac" | "linux" | "win" {
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac")) return "mac";
    if (ua.includes("linux")) return "linux";
  }
  return "win";
}
