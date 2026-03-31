// ── Deep Link Module — Parser ──────────────────────────────────

import type { DeepLinkTarget, DeepLinkTargetType } from "./types";

const DEFAULT_SCHEME = "mvanced";

export function parseDeepLink(uri: string, scheme = DEFAULT_SCHEME): DeepLinkTarget | null {
  try {
    // Expected formats:
    //   mvanced://file/path/to/file:10:5
    //   mvanced://panel/panel-id
    //   mvanced://command/commandId?args=base64
    //   #/file/path:line:col  (hash-based)

    let normalized = uri;

    // Handle hash-based links
    if (normalized.startsWith("#/") || normalized.startsWith("#")) {
      normalized = `${scheme}://${normalized.replace(/^#\/?/, "")}`;
    }

    // Validate scheme
    if (!normalized.startsWith(`${scheme}://`)) {
      return null;
    }

    const withoutScheme = normalized.slice(`${scheme}://`.length);
    const slashIdx = withoutScheme.indexOf("/");
    if (slashIdx < 0) return null;

    const type = withoutScheme.slice(0, slashIdx) as DeepLinkTargetType;
    const rest = withoutScheme.slice(slashIdx + 1);

    if (!["file", "panel", "command"].includes(type)) return null;

    if (type === "file") {
      return parseFileTarget(rest);
    }

    if (type === "panel") {
      return { type: "panel", path: rest };
    }

    if (type === "command") {
      return parseCommandTarget(rest);
    }

    return null;
  } catch {
    return null;
  }
}

function parseFileTarget(rest: string): DeepLinkTarget {
  // path/to/file:line:column
  const parts = rest.split(":");
  const target: DeepLinkTarget = { type: "file" };

  if (parts.length >= 3) {
    target.path = parts.slice(0, -2).join(":");
    target.line = parseInt(parts[parts.length - 2], 10) || undefined;
    target.column = parseInt(parts[parts.length - 1], 10) || undefined;
  } else if (parts.length === 2) {
    target.path = parts[0];
    target.line = parseInt(parts[1], 10) || undefined;
  } else {
    target.path = rest;
  }

  return target;
}

function parseCommandTarget(rest: string): DeepLinkTarget {
  const [commandPart, queryString] = rest.split("?");
  const target: DeepLinkTarget = {
    type: "command",
    commandId: commandPart,
  };

  if (queryString) {
    const params = new URLSearchParams(queryString);
    const argsStr = params.get("args");
    if (argsStr) {
      try {
        target.args = JSON.parse(atob(argsStr));
      } catch {
        // ignore bad args
      }
    }
  }

  return target;
}

export function validateScheme(uri: string, scheme = DEFAULT_SCHEME): boolean {
  return uri.startsWith(`${scheme}://`) || uri.startsWith("#/");
}
