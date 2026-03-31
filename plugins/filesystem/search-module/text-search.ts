// ── Search Module — Text Search Engine ────────────────────────
// Regex-based full-text search across file content.

import type { SearchQuery, SearchMatch, SearchFileResult, SearchResults } from "./types";
import { matchGlob } from "../fs-module/adapter";

/**
 * Search a single file's content for matches.
 */
export function searchFile(
  path: string,
  content: string,
  query: SearchQuery,
  contextLines: number = 2,
): SearchFileResult | null {
  const lines = content.split("\n");
  const matches: SearchMatch[] = [];
  const maxResults = query.maxResults ?? 1000;

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
    return null; // Invalid regex
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      matches.push({
        line: i + 1,
        column: match.index + 1,
        length: match[0].length,
        lineContent: line,
        contextBefore: lines.slice(Math.max(0, i - contextLines), i),
        contextAfter: lines.slice(i + 1, i + 1 + contextLines),
      });

      if (matches.length >= maxResults) break;
      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) regex.lastIndex++;
    }

    if (matches.length >= maxResults) break;
  }

  return matches.length > 0 ? { path, matches } : null;
}

/**
 * Search across multiple files.
 * Takes a Map of path → content (already filtered by glob).
 */
export function searchFiles(
  files: Map<string, string>,
  query: SearchQuery,
  contextLines: number = 2,
): SearchResults {
  const start = performance.now();
  const results: SearchFileResult[] = [];
  let totalMatches = 0;
  const maxResults = query.maxResults ?? 1000;
  let truncated = false;

  for (const [path, content] of files) {
    // Apply include/exclude filters
    if (query.include?.length) {
      if (!query.include.some((glob) => matchGlob(glob, path))) continue;
    }
    if (query.exclude?.length) {
      if (query.exclude.some((glob) => matchGlob(glob, path))) continue;
    }

    const result = searchFile(path, content, query, contextLines);
    if (result) {
      results.push(result);
      totalMatches += result.matches.length;
      if (totalMatches >= maxResults) {
        truncated = true;
        break;
      }
    }
  }

  return {
    query,
    files: results,
    totalMatches,
    duration: performance.now() - start,
    truncated,
  };
}
