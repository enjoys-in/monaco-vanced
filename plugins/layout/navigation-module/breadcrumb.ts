// ── Breadcrumb Builder ─────────────────────────────────────
// Builds symbol-aware breadcrumb segments from a file path.

import type { BreadcrumbSegment } from "./types";

export function buildBreadcrumbs(filePath: string): BreadcrumbSegment[] {
  if (!filePath) return [];

  const parts = filePath.split("/").filter(Boolean);
  const segments: BreadcrumbSegment[] = [];
  let currentPath = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    currentPath += (currentPath ? "/" : "") + part;
    const isLast = i === parts.length - 1;
    segments.push({
      label: part,
      path: currentPath,
      kind: isLast ? "file" : "folder",
    });
  }

  return segments;
}

export function appendSymbolBreadcrumb(
  segments: BreadcrumbSegment[],
  symbolName: string,
  symbolKind: string,
  filePath: string,
): BreadcrumbSegment[] {
  return [
    ...segments,
    {
      label: symbolName,
      path: filePath,
      kind: "symbol",
      symbolKind,
    },
  ];
}
