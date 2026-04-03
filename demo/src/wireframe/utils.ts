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
    json: "#a9a9a9", css: "#563d7c", scss: "#bf4080", less: "#1d365d",
    html: "#e44d26", md: "#ffffff", py: "#3572a5", rs: "#dea584",
    go: "#00add8", yml: "#cb171e", yaml: "#cb171e", toml: "#9c4121",
    sql: "#e38c00", sh: "#89e051", bash: "#89e051", vue: "#41b883",
    svelte: "#ff3e00", java: "#b07219", kt: "#a97bff", swift: "#f05138",
    rb: "#cc342d", php: "#4f5d95", c: "#555555", cpp: "#f34b7d", h: "#555555",
    hpp: "#f34b7d", cc: "#f34b7d", cxx: "#f34b7d",
    lua: "#000080", r: "#198ce7", dart: "#00b4ab", zig: "#f7a41d",
    xml: "#0060ac", svg: "#ffb13b", txt: C.fgDim, lock: "#6c6c6c",
    gitignore: "#f05032", env: "#ecd53f", dockerfile: "#384d54", makefile: "#427819",
    png: "#a074c4", jpg: "#a074c4", gif: "#a074c4", webp: "#a074c4",
    wasm: "#654ff0",
  };
  return map[ext] ?? C.fgDim;
}

/** Get file extension from a filename; returns special key for known extensionless files */
export function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot >= 0) return name.slice(dot + 1).toLowerCase();
  // Handle extensionless special files
  const lower = name.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  if (lower === "makefile" || lower === "gnumakefile") return "makefile";
  return "";
}

/** Language-specific icon glyph for common extensions */
function langGlyph(ext: string): string | null {
  const glyphs: Record<string, string> = {
    ts: "TS", tsx: "TX", js: "JS", jsx: "JX", json: "{ }", css: "#", scss: "S#",
    html: "<>", md: "M↓", py: "Py", rs: "Rs", go: "Go", yml: "Y", yaml: "Y",
    sql: "SQ", sh: "$_", vue: "V", svelte: "S", java: "Jv", swift: "Sw",
    rb: "Rb", php: "<?", c: "C", cpp: "C+", h: ".h", hpp: "C+", cc: "C+",
    lua: "Lu", r: "R", dart: "Dt", zig: "Zg", kt: "Kt",
    xml: "<>", toml: "⚙",
    svg: "◇", lock: "🔒", txt: "Tx", env: ".e",
    dockerfile: "Dk", makefile: "Mk",
  };
  return glyphs[ext] ?? null;
}

/** Simple file icon SVG based on extension — color-coded with language glyph (memoized) */
const _iconSvgCache = new Map<string, string>();
export function fileIconSvg(ext: string): string {
  const cached = _iconSvgCache.get(ext);
  if (cached) return cached;
  const color = langColor(ext);
  const glyph = langGlyph(ext) ?? (ext.slice(0, 3) || "…");
  const svg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 1h6.5L13 4.5V14a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="${color}" stroke-width="1" fill="none"/><path d="M9.5 1v3.5H13" stroke="${color}" stroke-width="1" fill="none"/><text x="4" y="12" font-size="5" fill="${color}" font-family="monospace" font-weight="600">${glyph.slice(0, 3)}</text></svg>`;
  _iconSvgCache.set(ext, svg);
  return svg;
}

// ── CSS keyframes & global wireframe styles (injected once) ──
if (typeof document !== "undefined" && !document.getElementById("wireframe-anims")) {
  const style = document.createElement("style");
  style.id = "wireframe-anims";
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .5 } }

    /* Global transitions for interactivity */
    .vsc-activity-btn, .vsc-file-item, .vsc-menu-item, .vsc-status-item, .vsc-panel-tab, .vsc-breadcrumb {
      transition: background .1s, color .1s, border-color .1s;
    }

    /* Tab bar scrollbar */
    .vsc-tab-bar::-webkit-scrollbar { height: 3px; }
    .vsc-tab-bar::-webkit-scrollbar-thumb { background: color-mix(in srgb, ${C.fgDim} 40%, transparent); border-radius: 3px; }
    .vsc-tab-bar::-webkit-scrollbar-track { background: transparent; }

    /* Sidebar scrollbar */
    .vsc-sidebar-content::-webkit-scrollbar { width: 5px; }
    .vsc-sidebar-content::-webkit-scrollbar-thumb { background: color-mix(in srgb, ${C.fgDim} 30%, transparent); border-radius: 5px; }
    .vsc-sidebar-content::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, ${C.fgDim} 50%, transparent); }
    .vsc-sidebar-content::-webkit-scrollbar-track { background: transparent; }

    /* Activity bar button hover */
    .vsc-activity-btn:hover { background: ${C.hover} !important; }

    /* Menu bar hover */
    .vsc-menu-item:hover { background: ${C.hover}; border-radius: 4px; }

    /* Status bar hover */
    .vsc-status-item:hover { background: color-mix(in srgb, ${C.statusFg} 18%, transparent) !important; border-radius: 2px; }

    /* Bottom panel tabs */
    .vsc-panel-tab { position: relative; }
    .vsc-panel-tab:hover { color: ${C.fg} !important; }
    .vsc-panel-tab[data-active="true"] { color: ${C.fgBright} !important; border-bottom: 1px solid ${C.fgBright} !important; }

    /* Explorer / list items */
    .vsc-file-item { border-radius: 3px; }
    .vsc-file-item:hover { background: ${C.listHover}; }
    .vsc-file-item[data-active="true"] { background: ${C.listActive}; }

    /* Breadcrumb hover */
    .vsc-breadcrumb:hover { color: ${C.fg} !important; }

    /* Focus styles */
    *:focus-visible { outline: 1px solid ${C.accent}; outline-offset: -1px; }

    /* Modern inputs */
    .vsc-input {
      width: 100%; box-sizing: border-box;
      background: ${C.inputBg}; color: ${C.fg};
      border: 1px solid ${C.inputBorder}; border-radius: 4px;
      padding: 5px 10px; font-size: 13px; outline: none;
      transition: border-color .15s, box-shadow .15s;
      font-family: inherit;
    }
    .vsc-input:focus { border-color: ${C.focusBorder}; box-shadow: 0 0 0 1px color-mix(in srgb, ${C.focusBorder} 20%, transparent); }
    .vsc-input::placeholder { color: ${C.fgDim}; }

    /* Modern buttons */
    .vsc-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      padding: 5px 14px; border-radius: 4px; border: none;
      font-size: 13px; font-family: inherit; cursor: pointer;
      transition: background .15s, box-shadow .15s;
    }
    .vsc-btn-primary { background: ${C.buttonBg}; color: ${C.fgBright}; }
    .vsc-btn-primary:hover { background: ${C.buttonHoverBg}; }
    .vsc-btn-secondary { background: transparent; color: ${C.fg}; border: 1px solid ${C.borderLight}; }
    .vsc-btn-secondary:hover { background: ${C.hover}; }

    /* Cards / panels */
    .vsc-card {
      background: ${C.cardBg}; border: 1px solid ${C.cardBorder};
      border-radius: 6px; overflow: hidden;
    }

    /* Section headers */
    .vsc-section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 4px; font-size: 11px; text-transform: uppercase;
      letter-spacing: .5px; color: ${C.fgDim}; cursor: pointer;
      user-select: none; border-radius: 3px;
    }
    .vsc-section-header:hover { background: ${C.hover}; }

    /* Badge */
    .vsc-badge {
      font-size: 10px; padding: 1px 6px; border-radius: 10px;
      background: ${C.badgeBg}; color: ${C.badgeFg}; font-weight: 600;
      line-height: 16px; min-width: 16px; text-align: center;
    }

    /* Tags */
    .vsc-tag {
      font-size: 10px; padding: 2px 6px; border-radius: 3px;
      background: color-mix(in srgb, ${C.fgDim} 15%, transparent); color: ${C.fgDim};
      display: inline-flex; align-items: center;
    }

    /* Tabs in settings/sidebar */
    .vsc-tab-pill {
      padding: 4px 12px; font-size: 12px; border-radius: 4px;
      cursor: pointer; color: ${C.fgDim}; transition: all .15s;
      user-select: none;
    }
    .vsc-tab-pill:hover { color: ${C.fg}; background: ${C.hover}; }
    .vsc-tab-pill[data-active="true"] { color: ${C.fgBright}; background: ${C.listActive}; }

    /* Separator line */
    .vsc-separator { height: 1px; background: ${C.separator}; margin: 8px 0; }

    /* Terminal cursor blink */
    @keyframes blink { 50% { opacity: 0 } }

    /* Smooth scrollbar for all sidebar views */
    .vsc-sidebar-content * { scrollbar-width: thin; scrollbar-color: color-mix(in srgb, ${C.fgDim} 30%, transparent) transparent; }
  `;
  document.head.appendChild(style);
}
