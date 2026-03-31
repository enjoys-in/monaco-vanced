// ── DOM utility helpers ─────────────────────────────────────

import { C } from "./types";

export function el(tag: string, attrs: Record<string, string> = {}, text?: string): HTMLElement {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "style") e.style.cssText = v;
    else if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  if (text) e.textContent = text;
  return e;
}

export function svgIcon(path: string, size = 16, fill = "currentColor", vb = "0 0 16 16"): string {
  return `<svg width="${size}" height="${size}" viewBox="${vb}" fill="${fill}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Map file extension to a language icon color */
export function langColor(ext: string): string {
  const map: Record<string, string> = {
    ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
    json: "#a9a9a9", css: "#563d7c", html: "#e44d26", md: "#ffffff",
    py: "#3572a5", rs: "#dea584", go: "#00add8", yml: "#cb171e", yaml: "#cb171e",
  };
  return map[ext] ?? C.fgDim;
}

/** Get file extension from a filename */
export function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Simple file icon SVG based on extension */
export function fileIconSvg(ext: string): string {
  const color = langColor(ext);
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1h6.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="${color}" stroke-width="1" fill="none"/><path d="M9.5 1v3.5H13" stroke="${color}" stroke-width="1" fill="none"/><text x="4" y="12" font-size="5" fill="${color}" font-family="monospace">${ext.slice(0, 3)}</text></svg>`;
}

// ── CSS keyframes & global wireframe styles (injected once) ──
if (typeof document !== "undefined" && !document.getElementById("wireframe-anims")) {
  const style = document.createElement("style");
  style.id = "wireframe-anims";
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    /* Tab bar scrollbar */
    .vsc-tab-bar::-webkit-scrollbar { height: 3px; }
    .vsc-tab-bar::-webkit-scrollbar-thumb { background: ${C.fgDim}; border-radius: 3px; }
    .vsc-tab-bar::-webkit-scrollbar-track { background: transparent; }

    /* Sidebar scrollbar */
    .vsc-sidebar-content::-webkit-scrollbar { width: 5px; }
    .vsc-sidebar-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 5px; }
    .vsc-sidebar-content::-webkit-scrollbar-track { background: transparent; }

    /* Activity bar button hover */
    .vsc-activity-btn:hover { background: rgba(255,255,255,0.1) !important; }

    /* Menu bar hover */
    .vsc-menu-item:hover { background: rgba(255,255,255,0.1); border-radius: 3px; }

    /* Status bar hover */
    .vsc-status-item:hover { background: rgba(255,255,255,0.12) !important; border-radius: 2px; }

    /* Bottom panel tabs */
    .vsc-panel-tab:hover { color: ${C.fg} !important; }
    .vsc-panel-tab[data-active="true"] { color: ${C.fgBright} !important; border-bottom: 1px solid ${C.fgBright} !important; }

    /* Explorer file items */
    .vsc-file-item:hover { background: ${C.listHover}; }
    .vsc-file-item[data-active="true"] { background: ${C.listActive}; }

    /* Breadcrumb hover */
    .vsc-breadcrumb:hover { color: ${C.fg} !important; }

    /* Focus styles */
    *:focus-visible { outline: 1px solid ${C.accent}; outline-offset: -1px; }

    /* Terminal cursor blink */
    @keyframes blink { 50% { opacity: 0 } }
  `;
  document.head.appendChild(style);
}
