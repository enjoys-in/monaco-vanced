// ── Source Control View ──────────────────────────────────────

import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import { C } from "../../types";
import { el, fileIconSvg, getExt } from "../../utils";
import type { ViewContext } from "./types";

export function buildScmView(ctx: ViewContext): HTMLElement {
  const { files, apis, eventBus } = ctx;

  const container = el("div", { style: "padding:10px 12px;overflow-y:auto;height:100%;" });
  const commitInput = el("input", { type: "text", placeholder: "Message (Ctrl+Enter to commit)", class: "vsc-input", style: "margin-bottom:8px;" }) as HTMLInputElement;
  const commitBtn = el("button", { class: "vsc-btn vsc-btn-primary", style: "width:100%;margin-bottom:12px;" });
  commitBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z"/></svg>`;
  commitBtn.appendChild(el("span", {}, "Commit"));
  commitBtn.addEventListener("click", () => {
    const msg = commitInput.value.trim();
    if (!msg) {
      apis.notification?.show({ type: "warning", message: "Please enter a commit message.", duration: 3000 });
      commitInput.focus();
      return;
    }
    apis.notification?.show({ type: "success", message: `Committed: "${msg}"`, duration: 4000 });
    commitInput.value = "";
  });
  const sections = [
    { title: "Staged Changes", files: files.slice(0, 3), badge: "A" as const, badgeColor: C.successGreen },
    { title: "Changes", files: files.slice(3), badge: "M" as const, badgeColor: "#e2c08d" },
  ];
  const list = el("div");
  for (const sec of sections) {
    const header = el("div", { class: "vsc-section-header" });
    const chevron = el("span", { style: `display:inline-flex;transition:transform .12s;transform:rotate(90deg);margin-right:4px;` });
    chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    const headerInner = el("span", { style: "display:flex;align-items:center;gap:2px;" });
    headerInner.append(chevron, el("span", {}, `${sec.title} (${sec.files.length})`));
    header.appendChild(headerInner);
    const body = el("div");
    let expanded = true;
    header.addEventListener("click", () => { expanded = !expanded; chevron.style.transform = `rotate(${expanded ? "90deg" : "0"})`; body.style.display = expanded ? "" : "none"; });
    for (const f of sec.files) {
      const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;height:24px;padding:0 8px;cursor:pointer;user-select:none;` });
      const iSpan = el("span", { style: "margin-right:6px;display:inline-flex;align-items:center;" });
      iSpan.innerHTML = fileIconSvg(getExt(f.name));
      row.append(iSpan, el("span", { style: `flex:1;color:${C.fg};font-size:13px;` }, f.name), el("span", { style: `font-size:11px;font-weight:600;padding:0 6px;color:${sec.badgeColor};` }, sec.badge));
      row.addEventListener("click", () => eventBus.emit(FileEvents.Open, { uri: f.uri, label: f.name }));
      body.appendChild(row);
    }
    list.append(header, body);
  }
  container.append(commitInput, commitBtn, list);
  return container;
}
