// ── Memory Injector ────────────────────────────────────────
// Builds a memory context string for injection into AI prompts.

import type { MemoryEntry } from "./types";

/**
 * Format memory entries into a prompt-friendly string.
 */
export function injectMemory(entries: MemoryEntry[]): string {
  if (entries.length === 0) return "";

  const sections = new Map<string, string[]>();

  for (const entry of entries) {
    const cat = entry.category;
    if (!sections.has(cat)) sections.set(cat, []);
    sections.get(cat)!.push(`- ${entry.key}: ${entry.value}`);
  }

  const parts: string[] = ["## Project Memory"];

  for (const [category, items] of sections) {
    parts.push(`\n### ${capitalize(category)}`);
    parts.push(...items);
  }

  return parts.join("\n");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
