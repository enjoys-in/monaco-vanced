// ── Loading Indicator Renderers ─────────────────────────────
// Generates HTML for skeleton, spinner, progress, and custom
// loading states shown while webview lifecycle hooks run.

import type { WebviewLoadingConfig } from "./types";

/** Returns the inner HTML for a loading indicator */
export function renderLoadingHTML(config: WebviewLoadingConfig = {}): string {
  const type = config.type ?? "spinner";

  switch (type) {
    case "skeleton":
      return renderSkeleton(config.skeleton ?? {});
    case "progress":
      return renderProgress(config.progress ?? {});
    case "custom":
      return config.html ?? renderSpinner(config.spinner ?? {});
    case "spinner":
    default:
      return renderSpinner(config.spinner ?? {});
  }
}

// ── Spinner ──────────────────────────────────────────────────

function renderSpinner(opts: NonNullable<WebviewLoadingConfig["spinner"]>): string {
  const size = opts.size === "sm" ? 24 : opts.size === "lg" ? 64 : 40;
  const color = opts.color ?? "var(--vscode-focusBorder, #007acc)";
  const label = opts.label ?? "Loading…";

  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;" role="status" aria-label="${label}">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" style="animation:webview-spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
      <span style="color:var(--vscode-descriptionForeground,#888);font-size:13px;">${label}</span>
      <style>@keyframes webview-spin { to { transform: rotate(360deg); } }</style>
    </div>
  `;
}

// ── Skeleton ─────────────────────────────────────────────────

function renderSkeleton(opts: NonNullable<WebviewLoadingConfig["skeleton"]>): string {
  const rows = opts.rows ?? 4;
  const animation = opts.animation ?? "wave";
  const animCSS = animation === "pulse"
    ? "@keyframes webview-skel { 0%,100% { opacity:0.4; } 50% { opacity:1; } }"
    : animation === "wave"
    ? "@keyframes webview-skel { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }"
    : "";

  const shimmerBg = animation === "wave"
    ? "background:linear-gradient(90deg, var(--vscode-editor-background,#2d2d2d) 25%, var(--vscode-editorWidget-background,#3c3c3c) 50%, var(--vscode-editor-background,#2d2d2d) 75%); background-size:200% 100%; animation: webview-skel 1.5s ease-in-out infinite;"
    : animation === "pulse"
    ? "background:var(--vscode-editorWidget-background,#3c3c3c); animation: webview-skel 1.5s ease-in-out infinite;"
    : "background:var(--vscode-editorWidget-background,#3c3c3c);";

  const lines: string[] = [];

  if (opts.custom) return `<div>${opts.custom}</div><style>${animCSS}</style>`;

  if (opts.avatar) {
    lines.push(`<div style="width:40px;height:40px;border-radius:50%;${shimmerBg}"></div>`);
  }
  if (opts.title !== false) {
    lines.push(`<div style="width:60%;height:20px;border-radius:4px;${shimmerBg}"></div>`);
  }
  if (opts.paragraph !== false) {
    for (let i = 0; i < rows; i++) {
      const w = i === rows - 1 ? "45%" : `${80 + Math.floor(Math.random() * 20)}%`;
      lines.push(`<div style="width:${w};height:14px;border-radius:4px;${shimmerBg}"></div>`);
    }
  }
  if (opts.image) {
    lines.push(`<div style="width:100%;height:120px;border-radius:8px;${shimmerBg}"></div>`);
  }

  return `
    <div style="display:flex;flex-direction:column;gap:12px;padding:16px;width:100%;">
      ${lines.join("\n      ")}
    </div>
    <style>${animCSS}</style>
  `;
}

// ── Progress bar ─────────────────────────────────────────────

function renderProgress(opts: NonNullable<WebviewLoadingConfig["progress"]>): string {
  const color = opts.color ?? "var(--vscode-focusBorder, #007acc)";
  const indeterminate = opts.indeterminate !== false;

  if (indeterminate) {
    return `
      <div style="position:absolute;top:0;left:0;right:0;height:3px;overflow:hidden;">
        <div style="width:40%;height:100%;background:${color};animation:webview-progress 1.5s ease-in-out infinite;"></div>
      </div>
      <style>@keyframes webview-progress { 0% { transform:translateX(-100%); } 100% { transform:translateX(350%); } }</style>
    `;
  }

  return `
    <div style="position:absolute;top:0;left:0;right:0;height:3px;overflow:hidden;background:var(--vscode-editorWidget-background,#3c3c3c);">
      <div id="webview-progress-bar" style="width:0%;height:100%;background:${color};transition:width 0.3s ease;"></div>
    </div>
  `;
}
