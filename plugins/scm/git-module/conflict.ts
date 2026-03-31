// ── Conflict Resolver ──────────────────────────────────────

import type { GitConflict } from "./types";

const CONFLICT_REGEX = /<<<<<<< [\w/.]+\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> [\w/.]+/g;

export function detectConflicts(path: string, content: string): GitConflict[] {
  const conflicts: GitConflict[] = [];
  let match: RegExpExecArray | null;

  while ((match = CONFLICT_REGEX.exec(content)) !== null) {
    conflicts.push({
      path,
      ours: match[1].trimEnd(),
      theirs: match[2].trimEnd(),
    });
  }

  return conflicts;
}

export function resolveContent(
  content: string,
  resolution: "ours" | "theirs" | "merged",
  mergedContent?: string,
): string {
  return content.replace(CONFLICT_REGEX, (_match, ours: string, theirs: string) => {
    switch (resolution) {
      case "ours": return ours.trimEnd();
      case "theirs": return theirs.trimEnd();
      case "merged": return mergedContent ?? `${ours.trimEnd()}\n${theirs.trimEnd()}`;
    }
  });
}
