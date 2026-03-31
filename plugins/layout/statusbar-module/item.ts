// ── Statusbar Item State ───────────────────────────────────
// Individual item rendering state helpers.

import type { StatusbarItem } from "./types";

export function formatItemLabel(item: StatusbarItem): string {
  const icon = item.icon ? `${item.icon} ` : "";
  return `${icon}${item.label}`;
}

export function createCursorItem(line: number, column: number): StatusbarItem {
  return {
    id: "statusbar.cursor",
    label: `Ln ${line}, Col ${column}`,
    alignment: "right",
    priority: 100,
  };
}

export function createLanguageItem(language: string): StatusbarItem {
  return {
    id: "statusbar.language",
    label: language,
    alignment: "right",
    priority: 90,
    command: "editor.changeLanguage",
  };
}

export function createEncodingItem(encoding: string): StatusbarItem {
  return {
    id: "statusbar.encoding",
    label: encoding,
    alignment: "right",
    priority: 80,
    command: "editor.changeEncoding",
  };
}

export function createIndentItem(useTabs: boolean, size: number): StatusbarItem {
  return {
    id: "statusbar.indent",
    label: useTabs ? `Tab Size: ${size}` : `Spaces: ${size}`,
    alignment: "right",
    priority: 70,
    command: "editor.changeIndent",
  };
}

export function createBranchItem(branch: string): StatusbarItem {
  return {
    id: "statusbar.branch",
    label: `⎇ ${branch}`,
    alignment: "left",
    priority: 100,
    command: "git.checkout",
  };
}

export function createErrorItem(errorCount: number, warningCount: number): StatusbarItem {
  return {
    id: "statusbar.problems",
    label: `✖ ${errorCount}  ⚠ ${warningCount}`,
    alignment: "left",
    priority: 90,
    command: "problems.toggle",
  };
}
