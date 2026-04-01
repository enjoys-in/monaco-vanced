// ── Search View — polished with smooth transitions & section borders ──

import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import { C } from "../../types";
import { el, fileIconSvg, getExt } from "../../utils";
import type { ViewContext } from "./types";

export function buildSearchView(ctx: ViewContext): HTMLElement {
  const { files, apis, eventBus } = ctx;

  const container = el("div", { style: "overflow-y:auto;height:100%;display:flex;flex-direction:column;" });

  // ── Search input section ───────────────────────────────
  const searchSection = el("div", {
    style: `padding:10px 12px 8px;border-bottom:1px solid ${C.separator};transition:border-color .2s;`,
  });
  const searchWrap = el("div", { style: "position:relative;margin-bottom:6px;" });
  const searchIcon = el("span", {
    style: `position:absolute;left:8px;top:50%;transform:translateY(-50%);color:${C.fgDim};display:flex;transition:color .15s;`,
  });
  searchIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85 1.06-1.06-3.85-3.85zm-5.242.156a5 5 0 110-10 5 5 0 010 10z"/></svg>`;
  const searchInput = el("input", {
    type: "text",
    placeholder: "Search",
    class: "vsc-input",
    style: "padding-left:28px;",
  }) as HTMLInputElement;
  searchInput.addEventListener("focus", () => { searchIcon.style.color = C.accent; });
  searchInput.addEventListener("blur", () => { searchIcon.style.color = C.fgDim; });
  searchWrap.append(searchIcon, searchInput);

  // ── Replace section (collapsible) ──────────────────────
  const replaceToggle = el("div", {
    title: "Toggle Replace",
    style: `display:flex;align-items:center;justify-content:center;width:20px;height:20px;cursor:pointer;border-radius:3px;color:${C.fgDim};transition:all .15s;margin-bottom:4px;`,
  });
  replaceToggle.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  let replaceVisible = false;
  const replaceWrap = el("div", {
    style: `overflow:hidden;max-height:0;opacity:0;transition:max-height .25s ease, opacity .2s ease, margin .2s ease;margin-bottom:0;`,
  });
  replaceWrap.appendChild(el("input", { type: "text", placeholder: "Replace", class: "vsc-input" }));
  replaceToggle.addEventListener("mouseenter", () => { replaceToggle.style.background = "rgba(255,255,255,0.08)"; });
  replaceToggle.addEventListener("mouseleave", () => { replaceToggle.style.background = "transparent"; });
  replaceToggle.addEventListener("click", () => {
    replaceVisible = !replaceVisible;
    replaceToggle.querySelector("svg")!.style.transform = replaceVisible ? "rotate(90deg)" : "";
    replaceToggle.querySelector("svg")!.style.transition = "transform .2s ease";
    if (replaceVisible) {
      replaceWrap.style.maxHeight = "40px";
      replaceWrap.style.opacity = "1";
      replaceWrap.style.marginBottom = "6px";
    } else {
      replaceWrap.style.maxHeight = "0";
      replaceWrap.style.opacity = "0";
      replaceWrap.style.marginBottom = "0";
    }
  });

  const inputRow = el("div", { style: "display:flex;align-items:start;gap:4px;" });
  const inputCol = el("div", { style: "flex:1;min-width:0;" });
  inputCol.append(searchWrap, replaceWrap);
  inputRow.append(replaceToggle, inputCol);

  searchSection.appendChild(inputRow);

  // ── Options section ────────────────────────────────────
  const optionsSection = el("div", {
    style: `padding:6px 12px 8px;border-bottom:1px solid ${C.separator};display:flex;align-items:center;gap:6px;transition:border-color .2s;`,
  });
  let matchCase = false, wholeWord = false, useRegex = false;
  for (const { label, abbr, key } of [
    { label: "Match Case", abbr: "Aa", key: "matchCase" },
    { label: "Whole Word", abbr: "Ab|", key: "wholeWord" },
    { label: "Use Regex", abbr: ".*", key: "useRegex" },
  ]) {
    const toggle = el("div", {
      title: label,
      style: `padding:3px 7px;border:1px solid ${C.borderLight};border-radius:4px;cursor:pointer;font-size:11px;color:${C.fgDim};font-family:monospace;transition:all .15s ease;`,
    }, abbr);
    let active = false;
    toggle.addEventListener("click", () => {
      active = !active;
      if (key === "matchCase") matchCase = active;
      else if (key === "wholeWord") wholeWord = active;
      else if (key === "useRegex") useRegex = active;
      toggle.style.background = active ? C.buttonBg : "transparent";
      toggle.style.color = active ? "#fff" : C.fgDim;
      toggle.style.borderColor = active ? C.accent : C.borderLight;
      toggle.style.boxShadow = active ? `0 0 0 1px ${C.accent}44` : "none";
      searchInput.dispatchEvent(new Event("input"));
    });
    toggle.addEventListener("mouseenter", () => { if (!active) toggle.style.borderColor = C.fgDim; });
    toggle.addEventListener("mouseleave", () => { if (!active) toggle.style.borderColor = C.borderLight; });
    optionsSection.appendChild(toggle);
  }

  const replaceAllBtn = el("button", {
    class: "vsc-btn vsc-btn-secondary",
    style: "font-size:11px;padding:2px 8px;margin-left:auto;display:none;transition:opacity .15s;",
  }, "Replace All");
  optionsSection.appendChild(replaceAllBtn);

  // ── Results section ────────────────────────────────────
  const resultsSection = el("div", {
    style: `flex:1;overflow-y:auto;padding:8px 12px;`,
  });
  const results = el("div", {
    style: `color:${C.fgDim};font-size:12px;padding:4px 0;transition:opacity .2s ease;`,
  }, "Type to search across files.");

  resultsSection.appendChild(results);

  // ── Search logic ───────────────────────────────────────
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim();
    results.innerHTML = "";
    replaceAllBtn.style.display = q ? "inline-flex" : "none";
    if (!q) {
      results.style.opacity = "1";
      results.textContent = "Type to search across files.";
      return;
    }

    results.style.opacity = "0";
    let matchCount = 0;
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
      if (matches.length) {
        matchCount += matches.length;
        const fileRow = el("div", {
          style: `margin-top:6px;border-left:2px solid ${C.accent}44;border-radius:0 4px 4px 0;overflow:hidden;transition:border-color .2s;`,
        });
        fileRow.addEventListener("mouseenter", () => { fileRow.style.borderLeftColor = C.accent; });
        fileRow.addEventListener("mouseleave", () => { fileRow.style.borderLeftColor = `${C.accent}44`; });

        const fileLabel = el("div", {
          class: "vsc-file-item",
          style: `display:flex;align-items:center;height:26px;cursor:pointer;font-size:13px;color:${C.fg};padding:0 8px;gap:6px;`,
        });
        const fIcon = el("span", { style: "display:inline-flex;align-items:center;flex-shrink:0;" });
        fIcon.innerHTML = fileIconSvg(getExt(f.name));
        fileLabel.append(
          fIcon,
          el("span", { style: "flex:1;" }, f.name),
          el("span", { class: "vsc-badge" }, String(matches.length)),
        );
        fileLabel.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));
        fileRow.appendChild(fileLabel);

        for (const m of matches.slice(0, 8)) {
          const mRow = el("div", {
            class: "vsc-file-item",
            style: `padding-left:32px;height:22px;display:flex;align-items:center;cursor:pointer;font-size:12px;color:${C.fgDim};overflow:hidden;white-space:nowrap;text-overflow:ellipsis;`,
          });
          const lineNum = el("span", {
            style: "color:#858585;margin-right:8px;min-width:24px;text-align:right;font-size:11px;font-family:monospace;",
          }, String(m.line));
          const textSpan = el("span", { style: `color:${C.fg};` });
          const lowerText = m.text.toLowerCase();
          const lowerQ = q.toLowerCase();
          const idx = matchCase ? m.text.indexOf(q) : lowerText.indexOf(lowerQ);
          if (idx >= 0) {
            textSpan.innerHTML =
              esc(m.text.slice(0, idx)) +
              `<span style="background:#613214;color:#e8912d;border-radius:2px;padding:0 2px;">${esc(m.text.slice(idx, idx + q.length))}</span>` +
              esc(m.text.slice(idx + q.length));
          } else {
            textSpan.textContent = m.text;
          }
          mRow.append(lineNum, textSpan);
          mRow.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));
          fileRow.appendChild(mRow);
        }
        if (matches.length > 8) {
          fileRow.appendChild(el("div", {
            style: `padding-left:32px;height:20px;font-size:11px;color:${C.fgDim};font-style:italic;display:flex;align-items:center;`,
          }, `… ${matches.length - 8} more`));
        }
        results.appendChild(fileRow);
      }
    }
    if (matchCount === 0) {
      results.textContent = "No results found.";
    } else {
      const summary = el("div", {
        style: `font-size:12px;color:${C.fgDim};padding:2px 0 6px;border-bottom:1px solid ${C.separator};margin-bottom:4px;`,
      }, `${matchCount} result${matchCount > 1 ? "s" : ""} in ${results.children.length} file${results.children.length > 1 ? "s" : ""}`);
      results.insertBefore(summary, results.firstChild);
    }
    // Fade-in results
    requestAnimationFrame(() => { results.style.opacity = "1"; });
  });

  // ── Replace All ────────────────────────────────────────
  replaceAllBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    const replaceVal = (replaceWrap.querySelector("input") as HTMLInputElement)?.value ?? "";
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
    searchInput.dispatchEvent(new Event("input"));
    apis.notification?.show({ type: "success", message: `Replaced in ${count} file(s)`, duration: 3000 });
  });

  container.append(searchSection, optionsSection, resultsSection);
  return container;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
