// ── Language detection plugin — maps file URI/content to Monaco language ID ──
import type { MonacoPlugin, PluginContext } from "@core/types";
import type { DetectionResult } from "./types";
import { detectionRules } from "./rules";
import { EditorEvents } from "@core/events";

/**
 * Detects the Monaco language ID for a given file URI and optional content.
 *
 * Detection order (first match wins):
 *   1. Exact filename match (Dockerfile, Makefile, .gitignore, etc.)
 *   2. File extension match (.ts, .py, .prisma, etc.)
 *   3. Shebang match (#!/usr/bin/env node, #!/bin/bash, etc.)
 *   4. Content heuristic match (first 512 chars)
 *   5. Monaco's built-in language registry (fallback)
 *   6. "plaintext" (final fallback)
 */
export function detectLanguage(
  uri: string,
  content?: string,
  monacoLanguages?: { getLanguages(): Array<{ id: string; extensions?: string[] }> },
): DetectionResult {
  const filename = getFilename(uri);
  const ext = getExtension(uri);

  // 1. Exact filename match (case-insensitive for special files)
  for (const [langId, rule] of Object.entries(detectionRules)) {
    if (rule.filenames?.some((f) => f.toLowerCase() === filename.toLowerCase())) {
      return { languageId: langId, source: "filename" };
    }
  }

  // 2. Extension match
  if (ext) {
    for (const [langId, rule] of Object.entries(detectionRules)) {
      if (rule.extensions?.includes(ext)) {
        return { languageId: langId, source: "extension" };
      }
    }
  }

  // 3. Shebang match (first line starting with #!)
  if (content) {
    const firstLine = content.slice(0, 256).split("\n")[0];
    if (firstLine.startsWith("#!")) {
      for (const [langId, rule] of Object.entries(detectionRules)) {
        if (rule.shebangs?.some((pat) => pat.test(firstLine))) {
          return { languageId: langId, source: "shebang" };
        }
      }
    }

    // 4. Content heuristic (first 512 chars)
    const head = content.slice(0, 512);
    for (const [langId, rule] of Object.entries(detectionRules)) {
      if (rule.contentPatterns?.some((pat) => pat.test(head))) {
        return { languageId: langId, source: "content" };
      }
    }
  }

  // 5. Monaco built-in language registry (extension-based)
  if (ext && monacoLanguages) {
    const monacoLang = monacoLanguages
      .getLanguages()
      .find((l) => l.extensions?.includes(ext));
    if (monacoLang) {
      return { languageId: monacoLang.id, source: "extension" };
    }
  }

  // 6. Final fallback
  return { languageId: "plaintext", source: "fallback" };
}

export function createLanguageDetectionPlugin(): MonacoPlugin {
  return {
    id: "language-detection",
    name: "Language Detection",
    version: "1.0.0",
    description: "Detects file language from extension, filename, shebang, and content heuristics",
    priority: 95,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      // Listen for file:read to auto-detect language and set on model
      ctx.on("file:read", (payload) => {
        const { path, data } = payload as { path: string; data: string };
        const result = detectLanguage(path, data, ctx.monaco.languages);
        if (result.source !== "fallback") {
          ctx.emit(EditorEvents.LanguageChange, {
            language: result.languageId,
            uri: path,
            detectedBy: result.source,
          });
        }
      });
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────

function getFilename(uri: string): string {
  const parts = uri.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? "";
}

function getExtension(uri: string): string {
  const filename = getFilename(uri);
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

export type { DetectionResult, DetectionSource, DetectionRule } from "./types";
