// ── VSIX Module — Manifest Parser ────────────────────────────

import type { VSIXManifest, VSIXContributes } from "./types";

/** Parse a VS Code extension package.json into a VSIXManifest */
export function parseVSIXManifest(packageJson: string): VSIXManifest {
  const raw = JSON.parse(packageJson) as Record<string, unknown>;

  const contributes = parseContributes(raw.contributes as Record<string, unknown> | undefined);

  return {
    name: String(raw.name ?? ""),
    publisher: String(raw.publisher ?? ""),
    version: String(raw.version ?? "0.0.0"),
    engines: {
      vscode: (raw.engines as Record<string, string>)?.vscode ?? "*",
    },
    contributes,
    activationEvents: Array.isArray(raw.activationEvents)
      ? (raw.activationEvents as string[])
      : [],
    description: raw.description ? String(raw.description) : undefined,
    displayName: raw.displayName ? String(raw.displayName) : undefined,
  };
}

function parseContributes(raw: Record<string, unknown> | undefined): VSIXContributes {
  if (!raw) return {};

  return {
    themes: Array.isArray(raw.themes)
      ? (raw.themes as Array<Record<string, string>>).map((t) => ({
          label: t.label ?? "",
          uiTheme: t.uiTheme ?? "vs-dark",
          path: t.path ?? "",
        }))
      : undefined,
    grammars: Array.isArray(raw.grammars)
      ? (raw.grammars as Array<Record<string, string>>).map((g) => ({
          language: g.language ?? "",
          scopeName: g.scopeName ?? "",
          path: g.path ?? "",
        }))
      : undefined,
    icons: Array.isArray(raw.iconThemes)
      ? (raw.iconThemes as Array<Record<string, string>>).map((i) => ({
          id: i.id ?? "",
          label: i.label,
          path: i.path ?? "",
        }))
      : undefined,
    snippets: Array.isArray(raw.snippets)
      ? (raw.snippets as Array<Record<string, string>>).map((s) => ({
          language: s.language ?? "",
          path: s.path ?? "",
        }))
      : undefined,
    commands: Array.isArray(raw.commands)
      ? (raw.commands as Array<Record<string, string>>).map((c) => ({
          command: c.command ?? "",
          title: c.title ?? "",
          category: c.category,
        }))
      : undefined,
    keybindings: Array.isArray(raw.keybindings)
      ? (raw.keybindings as Array<Record<string, string>>).map((k) => ({
          command: k.command ?? "",
          key: k.key ?? "",
          when: k.when,
          mac: k.mac,
          linux: k.linux,
          win: k.win,
        }))
      : undefined,
    languages: Array.isArray(raw.languages)
      ? (raw.languages as Array<Record<string, unknown>>).map((l) => ({
          id: String(l.id ?? ""),
          aliases: Array.isArray(l.aliases) ? (l.aliases as string[]) : undefined,
          extensions: Array.isArray(l.extensions) ? (l.extensions as string[]) : undefined,
          configuration: l.configuration ? String(l.configuration) : undefined,
          mimetypes: Array.isArray(l.mimetypes) ? (l.mimetypes as string[]) : undefined,
        }))
      : undefined,
  };
}
