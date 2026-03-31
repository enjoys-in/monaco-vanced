// ── Search Module — Replace Engine ────────────────────────────
// Find-and-replace across workspace files.

import type { SearchQuery, ReplaceRequest, ReplaceChange, ReplaceResult } from "./types";

/**
 * Compute replacements for a single file.
 * Returns the list of changes and the modified content.
 */
export function computeReplacements(
  path: string,
  content: string,
  query: SearchQuery,
  replacement: string,
): { changes: ReplaceChange[]; newContent: string } {
  const lines = content.split("\n");
  const changes: ReplaceChange[] = [];
  const newLines = [...lines];

  let regex: RegExp;
  try {
    if (query.isRegex) {
      regex = new RegExp(query.pattern, query.caseSensitive ? "g" : "gi");
    } else {
      const escaped = query.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pat = query.wholeWord ? `\\b${escaped}\\b` : escaped;
      regex = new RegExp(pat, query.caseSensitive ? "g" : "gi");
    }
  } catch {
    return { changes: [], newContent: content };
  }

  for (let i = 0; i < lines.length; i++) {
    const original = lines[i]!;
    const replaced = original.replace(regex, replacement);

    if (replaced !== original) {
      changes.push({
        path,
        line: i + 1,
        original,
        replaced,
      });
      newLines[i] = replaced;
    }
  }

  return { changes, newContent: newLines.join("\n") };
}

/**
 * Compute replacements across multiple files.
 */
export function computeReplaceAll(
  files: Map<string, string>,
  request: ReplaceRequest,
): { result: ReplaceResult; newContents: Map<string, string> } {
  const allChanges: ReplaceChange[] = [];
  const newContents = new Map<string, string>();
  const affectedFiles = new Set<string>();

  for (const [path, content] of files) {
    // If specific paths are given, only process those
    if (request.paths?.length && !request.paths.includes(path)) continue;

    const { changes, newContent } = computeReplacements(path, content, request.query, request.replacement);
    if (changes.length > 0) {
      allChanges.push(...changes);
      affectedFiles.add(path);
      newContents.set(path, newContent);
    }
  }

  return {
    result: {
      changes: allChanges,
      totalReplaced: allChanges.length,
      filesAffected: affectedFiles.size,
    },
    newContents,
  };
}
