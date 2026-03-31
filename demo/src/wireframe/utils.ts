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

export function svgIcon(path: string, vb = "0 0 24 24"): string {
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── CSS keyframes (injected once) ───────────────────────────
if (typeof document !== "undefined" && !document.getElementById("wireframe-anims")) {
  const style = document.createElement("style");
  style.id = "wireframe-anims";
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    .tab-bar::-webkit-scrollbar { height: 3px; }
    .tab-bar::-webkit-scrollbar-thumb { background: ${C.fgDim}; border-radius: 3px; }
    .tab-bar::-webkit-scrollbar-track { background: transparent; }
  `;
  document.head.appendChild(style);
}
