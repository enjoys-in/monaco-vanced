// ── Breadcrumb Builder ─────────────────────────────────────
// Builds breadcrumb segments from file paths.

import type { BreadcrumbSegment } from "./types";

export function buildBreadcrumbs(filePath: string | null): BreadcrumbSegment[] {
  if (!filePath) return [];
  const parts = filePath.split("/").filter(Boolean);
  let currentPath = "";
  return parts.map((part, i) => {
    currentPath += (currentPath ? "/" : "") + part;
    return {
      label: part,
      path: currentPath,
      isFile: i === parts.length - 1,
    };
  });
}

export function getDisplayTitle(
  fileName: string | null,
  isDirty: boolean,
): string {
  if (!fileName) return "Untitled";
  return isDirty ? `● ${fileName}` : fileName;
}
