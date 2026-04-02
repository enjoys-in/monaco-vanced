// ── Search View — Modern VS Code-style with theme-aware design ──

import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import { C } from "../../types";
import { el, fileIconSvg, getExt } from "../../utils";
import type { ViewContext } from "./types";

/** Render a file icon element — uses icon API if available, else fallback SVG */
function renderFileIcon(ctx: ViewContext, filename: string): HTMLElement {
  const icon = el("span", {
    style: "display:inline-flex;align-items:center;flex-shrink:0;width:16;height:16;",
  });
  if (ctx.iconApi) {
    const url = ctx.iconApi.getFileIcon(filename);
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.width = 16;
      img.height = 16;
      img.style.cssText = "display:block;flex-shrink:0;";
      img.onerror = () => { img.replaceWith(fallbackIconNode(filename)); };
      icon.appendChild(img);
      return icon;
    }
  }
  icon.appendChild(fallbackIconNode(filename));
  return icon;
}

function fallbackIconNode(filename: string): HTMLElement {
  const span = el("span", { style: "display:inline-flex;align-items:center;" });
  span.innerHTML = fileIconSvg(getExt(filename));
  return span;
}

/** Render a folder icon element */
function renderFolderIcon(ctx: ViewContext, folderName: string, isOpen = false): HTMLElement {
  const icon = el("span", {
    style: "display:inline-flex;align-items:center;flex-shrink:0;width:16;height:16;",
  });
  if (ctx.iconApi) {
    const url = ctx.iconApi.getFileIcon(folderName, true, isOpen);
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.width = 16;
      img.height = 16;
      img.style.cssText = "display:block;flex-shrink:0;";
      img.onerror = () => {
        icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="${C.fgDim}"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`;
      };
      icon.appendChild(img);
      return icon;
    }
  }
  icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="${C.fgDim}"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13H2V3h4.29l.85.85.36.15h6.49v7.49z"/></svg>`;
  return icon;
}

export function buildSearchView(ctx: ViewContext): HTMLElement {
  const { files, apis, eventBus } = ctx;

  const container = el("div", {
    style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;",
  });

  // ══════════════════════════════════════════════════════════
  // Input area — search + replace + options in a unified card
  // ══════════════════════════════════════════════════════════

  const inputArea = el("div", {
    style: `padding:12px 14px 10px;display:flex;flex-direction:column;gap:6px;`,
  });

  // ── Search row ─────────────────────────────────────────
  const searchRow = el("div", { style: "display:flex;align-items:center;gap:6px;" });

  // Chevron toggle for replace
  const replaceChevron = el("div", {
    title: "Toggle Replace",
    style: `display:flex;align-items:center;justify-content:center;width:18px;height:18px;cursor:pointer;border-radius:3px;color:${C.fgDim};flex-shrink:0;transition:all .15s;`,
  });
  replaceChevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const searchInputWrap = el("div", {
    style: `flex:1;position:relative;display:flex;align-items:center;background:${C.inputBg};border:1px solid ${C.inputBorder};border-radius:4px;transition:border-color .15s, box-shadow .15s;overflow:hidden;`,
  });
  const searchIcon = el("span", {
    style: `display:flex;align-items:center;padding:0 0 0 8px;color:${C.fgDim};flex-shrink:0;transition:color .15s;pointer-events:none;`,
  });
  searchIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z"/></svg>`;
  const searchInput = el("input", {
    type: "text",
    placeholder: "Search",
    style: `flex:1;background:transparent;color:${C.fg};border:none;padding:5px 8px;font-size:12px;outline:none;font-family:inherit;min-width:0;`,
  }) as HTMLInputElement;
  // Inline option toggles inside input
  const inlineOpts = el("div", {
    style: "display:flex;align-items:center;gap:1px;padding-right:4px;flex-shrink:0;",
  });

  let matchCase = false, wholeWord = false, useRegex = false;
  const optToggles: HTMLElement[] = [];
  for (const { label, abbr, key } of [
    { label: "Match Case", abbr: "Aa", key: "matchCase" },
    { label: "Match Whole Word", abbr: "Ab", key: "wholeWord" },
    { label: "Use Regular Expression", abbr: ".*", key: "useRegex" },
  ]) {
    const btn = el("div", {
      title: label,
      style: `width:22px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;font-size:10px;font-family:monospace;font-weight:600;color:${C.fgDim};transition:all .12s;user-select:none;`,
    }, abbr);
    let active = false;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      active = !active;
      if (key === "matchCase") matchCase = active;
      else if (key === "wholeWord") wholeWord = active;
      else if (key === "useRegex") useRegex = active;
      btn.style.background = active ? `color-mix(in srgb, ${C.accent} 25%, transparent)` : "transparent";
      btn.style.color = active ? C.accent : C.fgDim;
      searchInput.dispatchEvent(new Event("input"));
    });
    btn.addEventListener("mouseenter", () => { if (!active) btn.style.background = "rgba(255,255,255,0.06)"; });
    btn.addEventListener("mouseleave", () => { if (!active) btn.style.background = "transparent"; });
    optToggles.push(btn);
    inlineOpts.appendChild(btn);
  }

  searchInputWrap.append(searchIcon, searchInput, inlineOpts);

  // Focus ring on input wrapper
  searchInput.addEventListener("focus", () => {
    searchInputWrap.style.borderColor = C.focusBorder;
    searchInputWrap.style.boxShadow = `0 0 0 1px color-mix(in srgb, ${C.focusBorder} 20%, transparent)`;
    searchIcon.style.color = C.accent;
  });
  searchInput.addEventListener("blur", () => {
    searchInputWrap.style.borderColor = C.inputBorder;
    searchInputWrap.style.boxShadow = "none";
    searchIcon.style.color = C.fgDim;
  });

  searchRow.append(replaceChevron, searchInputWrap);

  // ── Replace row (collapsible) ──────────────────────────
  let replaceVisible = false;
  const replaceRow = el("div", {
    style: `display:flex;align-items:center;gap:6px;overflow:hidden;max-height:0;opacity:0;transition:max-height .2s ease, opacity .15s ease, margin .15s ease;margin-top:0;`,
  });
  const replaceSpacer = el("div", { style: "width:18px;flex-shrink:0;" });

  const replaceInputWrap = el("div", {
    style: `flex:1;display:flex;align-items:center;background:${C.inputBg};border:1px solid ${C.inputBorder};border-radius:4px;transition:border-color .15s, box-shadow .15s;overflow:hidden;`,
  });
  const replaceIcon = el("span", {
    style: `display:flex;align-items:center;padding:0 0 0 8px;color:${C.fgDim};flex-shrink:0;`,
  });
  replaceIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.3 1.3l1.4 1.4-9 9H2v-1.7l9.3-8.7zm-1.4 3.3L4 10.5V11h.5l5.9-5.9-.5-.5zM3 13h10v1H3v-1z"/></svg>`;
  const replaceInput = el("input", {
    type: "text",
    placeholder: "Replace",
    style: `flex:1;background:transparent;color:${C.fg};border:none;padding:5px 8px;font-size:12px;outline:none;font-family:inherit;min-width:0;`,
  }) as HTMLInputElement;

  // Replace action buttons inside the wrap
  const replaceActions = el("div", {
    style: "display:flex;align-items:center;gap:1px;padding-right:4px;flex-shrink:0;",
  });
  const replaceOneBtn = el("div", {
    title: "Replace",
    style: `width:22px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;color:${C.fgDim};transition:all .12s;`,
  });
  replaceOneBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.22 3.22a.75.75 0 011.06 0L8 6.94l3.72-3.72a.75.75 0 111.06 1.06L9.06 8l3.72 3.72a.75.75 0 11-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 01-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 010-1.06z"/></svg>`;
  const replaceAllBtn = el("div", {
    title: "Replace All",
    style: `width:22px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:3px;color:${C.fgDim};transition:all .12s;`,
  });
  replaceAllBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4h8v1H2V4zm0 3h10v1H2V7zm0 3h6v1H2v-1zm10.5.5l2 2-2 2m2-2h-5"/></svg>`;
  for (const b of [replaceOneBtn, replaceAllBtn]) {
    b.addEventListener("mouseenter", () => { b.style.background = "rgba(255,255,255,0.08)"; b.style.color = C.fg; });
    b.addEventListener("mouseleave", () => { b.style.background = "transparent"; b.style.color = C.fgDim; });
  }
  replaceActions.append(replaceOneBtn, replaceAllBtn);

  replaceInputWrap.append(replaceIcon, replaceInput, replaceActions);

  replaceInput.addEventListener("focus", () => {
    replaceInputWrap.style.borderColor = C.focusBorder;
    replaceInputWrap.style.boxShadow = `0 0 0 1px color-mix(in srgb, ${C.focusBorder} 20%, transparent)`;
  });
  replaceInput.addEventListener("blur", () => {
    replaceInputWrap.style.borderColor = C.inputBorder;
    replaceInputWrap.style.boxShadow = "none";
  });

  replaceRow.append(replaceSpacer, replaceInputWrap);

  // ── Chevron toggle logic ───────────────────────────────
  replaceChevron.addEventListener("mouseenter", () => { replaceChevron.style.background = "rgba(255,255,255,0.08)"; });
  replaceChevron.addEventListener("mouseleave", () => { replaceChevron.style.background = "transparent"; });
  replaceChevron.addEventListener("click", () => {
    replaceVisible = !replaceVisible;
    const svg = replaceChevron.querySelector("svg")!;
    svg.style.transition = "transform .2s ease";
    svg.style.transform = replaceVisible ? "rotate(90deg)" : "";
    if (replaceVisible) {
      replaceRow.style.maxHeight = "40px";
      replaceRow.style.opacity = "1";
      replaceRow.style.marginTop = "0px";
    } else {
      replaceRow.style.maxHeight = "0";
      replaceRow.style.opacity = "0";
      replaceRow.style.marginTop = "0";
    }
  });

  inputArea.append(searchRow, replaceRow);

  // ══════════════════════════════════════════════════════════
  // Mode tabs — Text search vs Symbol search
  // ══════════════════════════════════════════════════════════

  let searchMode: "text" | "symbols" = "text";
  const modeTabs = el("div", {
    style: `display:flex;gap:0;padding:0 14px;border-bottom:1px solid ${C.separator};`,
  });
  const textTab = el("div", {
    style: `padding:6px 12px;font-size:11px;cursor:pointer;border-bottom:2px solid ${C.accent};color:${C.fg};font-weight:500;transition:all .15s;user-select:none;`,
  }, "Text");
  const symbolTab = el("div", {
    style: `padding:6px 12px;font-size:11px;cursor:pointer;border-bottom:2px solid transparent;color:${C.fgDim};transition:all .15s;user-select:none;`,
  }, "Symbols");

  function setMode(mode: "text" | "symbols") {
    searchMode = mode;
    textTab.style.borderBottomColor = mode === "text" ? C.accent : "transparent";
    textTab.style.color = mode === "text" ? C.fg : C.fgDim;
    textTab.style.fontWeight = mode === "text" ? "500" : "normal";
    symbolTab.style.borderBottomColor = mode === "symbols" ? C.accent : "transparent";
    symbolTab.style.color = mode === "symbols" ? C.fg : C.fgDim;
    symbolTab.style.fontWeight = mode === "symbols" ? "500" : "normal";
    // Re-trigger search
    if (searchInput.value.trim()) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 50);
    }
  }
  textTab.addEventListener("click", () => setMode("text"));
  symbolTab.addEventListener("click", () => setMode("symbols"));

  modeTabs.append(textTab, symbolTab);

  // ══════════════════════════════════════════════════════════
  // Separator + summary bar
  // ══════════════════════════════════════════════════════════

  const summaryBar = el("div", {
    style: `padding:4px 14px;font-size:11px;color:${C.fgDim};background:color-mix(in srgb, ${C.sidebarBg} 80%, ${C.bg});border-top:1px solid ${C.separator};border-bottom:1px solid ${C.separator};display:none;align-items:center;gap:8px;min-height:24px;transition:opacity .15s;`,
  });

  // ══════════════════════════════════════════════════════════
  // Results area
  // ══════════════════════════════════════════════════════════

  const resultsArea = el("div", {
    style: "flex:1;overflow-y:auto;",
  });

  // ── Empty state ────────────────────────────────────────
  const emptyState = el("div", {
    style: `display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:${C.fgDim};gap:10px;transition:opacity .2s;`,
  });
  const emptyIcon = el("div", {
    style: `color:color-mix(in srgb, ${C.fgDim} 50%, transparent);`,
  });
  emptyIcon.innerHTML = `<svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z"/></svg>`;
  const emptyText = el("div", { style: "font-size:12px;text-align:center;line-height:1.6;" }, "Search to find in files");
  const emptyHint = el("div", { style: "font-size:11px;opacity:0.6;text-align:center;" });
  emptyHint.innerHTML = `<kbd style="padding:1px 5px;border:1px solid ${C.borderLight};border-radius:3px;font-size:10px;font-family:inherit;">Ctrl+Shift+F</kbd> to focus`;
  emptyState.append(emptyIcon, emptyText, emptyHint);

  const resultsList = el("div", {
    style: `padding:4px 8px 16px;transition:opacity .2s ease;`,
  });
  resultsArea.append(emptyState, resultsList);

  // ══════════════════════════════════════════════════════════
  // Search logic
  // ══════════════════════════════════════════════════════════

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, 120);
  });

  function runSearch() {
    const q = searchInput.value.trim();
    resultsList.innerHTML = "";

    if (!q) {
      emptyState.style.display = "flex";
      emptyText.textContent = searchMode === "symbols" ? "Search to find symbols" : "Search to find in files";
      summaryBar.style.display = "none";
      return;
    }

    // ── Symbol search mode ───────────────────────────────
    if (searchMode === "symbols") {
      emptyState.style.display = "none";
      resultsList.style.opacity = "0";

      if (!ctx.indexerApi || !ctx.indexerApi.isReady()) {
        emptyState.style.display = "flex";
        emptyText.textContent = "Symbol index is not available.";
        summaryBar.style.display = "none";
        requestAnimationFrame(() => { resultsList.style.opacity = "1"; });
        return;
      }

      const symbols = ctx.indexerApi.query({ name: q });
      if (!symbols.length) {
        emptyState.style.display = "flex";
        emptyText.textContent = `No symbols found for "${q}"`;
        summaryBar.style.display = "none";
      } else {
        summaryBar.style.display = "flex";
        summaryBar.innerHTML = `<span style="color:${C.fg};font-weight:500;">${symbols.length}</span> symbol${symbols.length !== 1 ? "s" : ""} found`;

        // Group by file
        const byFile = new Map<string, typeof symbols>();
        for (const sym of symbols) {
          const arr = byFile.get(sym.path) ?? [];
          arr.push(sym);
          byFile.set(sym.path, arr);
        }

        for (const [filePath, fileSymbols] of byFile) {
          const fileName = filePath.split("/").pop() ?? filePath;
          const fileGroup = el("div", { style: "margin-bottom:2px;border-radius:4px;overflow:hidden;" });

          const fileHeader = el("div", {
            style: `display:flex;align-items:center;gap:6px;padding:3px 8px;cursor:pointer;border-radius:4px;transition:background .1s;user-select:none;`,
          });
          fileHeader.addEventListener("mouseenter", () => { fileHeader.style.background = C.listHover; });
          fileHeader.addEventListener("mouseleave", () => { fileHeader.style.background = "transparent"; });

          const fIcon = renderFileIcon(ctx, fileName);
          const fName = el("span", { style: `font-size:12px;color:${C.fg};font-weight:500;flex-shrink:0;` }, fileName);
          const fPath = el("span", { style: `font-size:11px;color:${C.fgDim};opacity:0.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;` }, filePath);
          const badge = el("span", {
            style: `font-size:10px;padding:0 5px;border-radius:8px;background:color-mix(in srgb, ${C.accent} 18%, transparent);color:${C.accent};font-weight:600;line-height:16px;min-width:16px;text-align:center;flex-shrink:0;`,
          }, String(fileSymbols.length));

          fileHeader.append(fIcon, fName, fPath, badge);
          fileHeader.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: filePath, label: fileName }));

          const symbolLines = el("div", { style: "overflow:hidden;" });
          for (const sym of fileSymbols.slice(0, 20)) {
            const kindColors: Record<string, string> = {
              function: "#dcdcaa", class: "#4ec9b0", interface: "#4ec9b0",
              variable: "#9cdcfe", method: "#dcdcaa", property: "#9cdcfe",
              enum: "#b5cea8", type: "#4ec9b0", constant: "#569cd6",
            };
            const kindColor = kindColors[sym.kind.toLowerCase()] ?? C.fg;
            const sRow = el("div", {
              style: `display:flex;align-items:center;padding:2px 8px 2px 28px;cursor:pointer;border-radius:3px;transition:background .1s;min-height:22px;gap:6px;`,
            });
            sRow.addEventListener("mouseenter", () => { sRow.style.background = C.listHover; });
            sRow.addEventListener("mouseleave", () => { sRow.style.background = "transparent"; });

            const kindBadge = el("span", {
              style: `font-size:10px;padding:0 4px;border-radius:3px;background:${kindColor}18;color:${kindColor};font-weight:600;font-family:monospace;flex-shrink:0;min-width:20px;text-align:center;`,
            }, sym.kind.slice(0, 3).toUpperCase());
            const symName = el("span", {
              style: `font-size:12px;color:${C.fg};font-family:'JetBrains Mono',monospace;`,
            }, sym.name);
            const lineRef = el("span", {
              style: `font-size:10px;color:${C.fgDim};font-family:monospace;margin-left:auto;`,
            }, `L${sym.line}`);

            sRow.append(kindBadge, symName, lineRef);
            sRow.addEventListener("click", (e) => {
              e.stopPropagation();
              eventBus.emit(FileEvents.Open, { uri: filePath, label: fileName });
            });
            symbolLines.appendChild(sRow);
          }

          fileGroup.append(fileHeader, symbolLines);
          resultsList.appendChild(fileGroup);
        }
      }

      requestAnimationFrame(() => { resultsList.style.opacity = "1"; });
      return;
    }

    // ── Text search mode (original) ──────────────────────
    emptyState.style.display = "none";
    resultsList.style.opacity = "0";
    let matchCount = 0;
    let fileCount = 0;

    for (const f of files) {
      const lines = f.content.split("\n");
      const matches: { line: number; text: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let isMatch = false;
        if (useRegex) {
          try { isMatch = new RegExp(q, matchCase ? "" : "i").test(line); } catch { isMatch = false; }
        } else {
          const haystack = matchCase ? line : line.toLowerCase();
          const needle = matchCase ? q : q.toLowerCase();
          if (wholeWord) {
            const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, matchCase ? "" : "i");
            isMatch = re.test(line);
          } else {
            isMatch = haystack.includes(needle);
          }
        }
        if (isMatch) matches.push({ line: i + 1, text: line.trim() });
      }
      if (!matches.length) continue;

      matchCount += matches.length;
      fileCount++;

      // ── File group ─────────────────────────────────
      const fileGroup = el("div", {
        style: `margin-bottom:2px;border-radius:4px;overflow:hidden;`,
      });

      // File header row
      let expanded = true;
      const fileHeader = el("div", {
        style: `display:flex;align-items:center;gap:6px;padding:3px 8px;cursor:pointer;border-radius:4px;transition:background .1s;user-select:none;`,
      });
      fileHeader.addEventListener("mouseenter", () => { fileHeader.style.background = C.listHover; });
      fileHeader.addEventListener("mouseleave", () => { fileHeader.style.background = "transparent"; });

      const chevron = el("span", {
        style: `display:flex;align-items:center;color:${C.fgDim};transition:transform .15s;flex-shrink:0;`,
      });
      chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      chevron.style.transform = "rotate(90deg)";

      const fIcon = renderFileIcon(ctx, f.name);

      const fName = el("span", { style: `font-size:12px;color:${C.fg};font-weight:500;flex-shrink:0;` }, f.name);

      // Path hint (directory)
      const pathParts = f.uri.split("/");
      const dir = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";
      const fPath = el("span", {
        style: `font-size:11px;color:${C.fgDim};opacity:0.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;`,
      }, dir);

      const badge = el("span", {
        style: `font-size:10px;padding:0 5px;border-radius:8px;background:color-mix(in srgb, ${C.accent} 18%, transparent);color:${C.accent};font-weight:600;line-height:16px;min-width:16px;text-align:center;flex-shrink:0;`,
      }, String(matches.length));

      fileHeader.append(chevron, fIcon, fName, fPath, badge);
      fileHeader.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));

      // ── Match lines container ──────────────────────
      const matchLines = el("div", {
        style: "overflow:hidden;transition:max-height .2s ease;",
      });

      for (const m of matches.slice(0, 10)) {
        const mRow = el("div", {
          style: `display:flex;align-items:center;padding:2px 8px 2px 36px;cursor:pointer;border-radius:3px;transition:background .1s;min-height:22px;`,
        });
        mRow.addEventListener("mouseenter", () => { mRow.style.background = C.listHover; });
        mRow.addEventListener("mouseleave", () => { mRow.style.background = "transparent"; });

        const lineNum = el("span", {
          style: `color:${C.fgDim};margin-right:10px;min-width:28px;text-align:right;font-size:11px;font-family:'JetBrains Mono',monospace;opacity:0.7;flex-shrink:0;`,
        }, String(m.line));

        const textSpan = el("span", {
          style: `font-size:12px;color:${C.fg};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'JetBrains Mono',monospace;`,
        });
        const lowerText = m.text.toLowerCase();
        const lowerQ = q.toLowerCase();
        const idx = matchCase ? m.text.indexOf(q) : lowerText.indexOf(lowerQ);
        if (idx >= 0) {
          textSpan.innerHTML =
            `<span style="opacity:0.6">${esc(m.text.slice(0, idx))}</span>` +
            `<span style="background:color-mix(in srgb, ${C.accent} 30%, transparent);color:${C.fg};border-radius:2px;padding:0 1px;outline:1px solid color-mix(in srgb, ${C.accent} 40%, transparent);">${esc(m.text.slice(idx, idx + q.length))}</span>` +
            `<span style="opacity:0.6">${esc(m.text.slice(idx + q.length))}</span>`;
        } else {
          textSpan.textContent = m.text;
        }

        mRow.append(lineNum, textSpan);
        mRow.addEventListener("click", (e) => {
          e.stopPropagation();
          eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name });
        });
        matchLines.appendChild(mRow);
      }

      if (matches.length > 10) {
        const moreRow = el("div", {
          style: `padding:3px 8px 3px 36px;font-size:11px;color:${C.fgDim};opacity:0.7;cursor:pointer;border-radius:3px;transition:background .1s;`,
        }, `${matches.length - 10} more results…`);
        moreRow.addEventListener("mouseenter", () => { moreRow.style.background = C.listHover; moreRow.style.opacity = "1"; });
        moreRow.addEventListener("mouseleave", () => { moreRow.style.background = "transparent"; moreRow.style.opacity = "0.7"; });
        moreRow.addEventListener("click", (e) => {
          e.stopPropagation();
          eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name });
        });
        matchLines.appendChild(moreRow);
      }

      // ── Collapse/expand per file ───────────────────
      const toggleChevron = () => {
        expanded = !expanded;
        chevron.style.transform = expanded ? "rotate(90deg)" : "rotate(0)";
        matchLines.style.maxHeight = expanded ? `${matchLines.scrollHeight + 40}px` : "0";
      };
      chevron.addEventListener("click", (e) => { e.stopPropagation(); toggleChevron(); });

      fileGroup.append(fileHeader, matchLines);
      resultsList.appendChild(fileGroup);

      // Set initial max-height after DOM attachment
      requestAnimationFrame(() => { matchLines.style.maxHeight = `${matchLines.scrollHeight + 40}px`; });
    }

    // ── Summary bar ──────────────────────────────────────
    if (matchCount === 0) {
      emptyState.style.display = "flex";
      emptyText.textContent = `No results found for "${q}"`;
      summaryBar.style.display = "none";
    } else {
      summaryBar.style.display = "flex";
      summaryBar.innerHTML = `<span style="color:${C.fg};font-weight:500;">${matchCount}</span> result${matchCount !== 1 ? "s" : ""} in <span style="color:${C.fg};font-weight:500;">${fileCount}</span> file${fileCount !== 1 ? "s" : ""}`;
    }

    requestAnimationFrame(() => { resultsList.style.opacity = "1"; });
  }

  // ══════════════════════════════════════════════════════════
  // Replace All
  // ══════════════════════════════════════════════════════════

  replaceAllBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    const replaceVal = replaceInput.value;
    if (!q) return;
    let count = 0;
    for (const f of files) {
      const before = f.content;
      if (useRegex) {
        try { f.content = f.content.replace(new RegExp(q, matchCase ? "g" : "gi"), replaceVal); } catch { /* skip invalid regex */ }
      } else {
        const flags = matchCase ? "g" : "gi";
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
        f.content = f.content.replace(new RegExp(pattern, flags), replaceVal);
      }
      if (f.content !== before) count++;
    }
    runSearch();
    apis.notification?.show({ type: "success", message: `Replaced in ${count} file(s)`, duration: 3000 });
  });

  container.append(inputArea, modeTabs, summaryBar, resultsArea);
  return container;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
