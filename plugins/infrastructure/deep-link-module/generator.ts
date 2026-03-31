// ── Deep Link Module — Generator ───────────────────────────────

import type { DeepLinkTarget } from "./types";

const DEFAULT_SCHEME = "mvanced";

export function generateDeepLink(target: DeepLinkTarget, scheme = DEFAULT_SCHEME): string {
  switch (target.type) {
    case "file":
      return generateFileLink(target, scheme);
    case "panel":
      return `${scheme}://panel/${target.path ?? ""}`;
    case "command":
      return generateCommandLink(target, scheme);
    default:
      throw new Error(`Unknown deep link type: ${target.type}`);
  }
}

function generateFileLink(target: DeepLinkTarget, scheme: string): string {
  let uri = `${scheme}://file/${target.path ?? ""}`;
  if (target.line !== undefined) {
    uri += `:${target.line}`;
    if (target.column !== undefined) {
      uri += `:${target.column}`;
    }
  }
  return uri;
}

function generateCommandLink(target: DeepLinkTarget, scheme: string): string {
  let uri = `${scheme}://command/${target.commandId ?? ""}`;
  if (target.args && target.args.length > 0) {
    const encoded = btoa(JSON.stringify(target.args));
    uri += `?args=${encoded}`;
  }
  return uri;
}

export function generateHashLink(target: DeepLinkTarget): string {
  switch (target.type) {
    case "file": {
      let hash = `#/file/${target.path ?? ""}`;
      if (target.line !== undefined) hash += `:${target.line}`;
      if (target.column !== undefined) hash += `:${target.column}`;
      return hash;
    }
    case "panel":
      return `#/panel/${target.path ?? ""}`;
    case "command": {
      let hash = `#/command/${target.commandId ?? ""}`;
      if (target.args && target.args.length > 0) {
        hash += `?args=${btoa(JSON.stringify(target.args))}`;
      }
      return hash;
    }
    default:
      return "#/";
  }
}
