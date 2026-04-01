// ── Debug View ───────────────────────────────────────────────

import { C } from "../../types";
import { el } from "../../utils";
import type { ViewContext } from "./types";

export function buildDebugView(ctx: ViewContext): HTMLElement {
  const { apis } = ctx;

  const container = el("div", { style: "padding:10px 12px;overflow-y:auto;height:100%;" });
  const runBtn = el("button", { class: "vsc-btn vsc-btn-primary", style: "width:100%;margin-bottom:14px;" });
  runBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>`;
  runBtn.appendChild(el("span", {}, "Run and Debug"));
  runBtn.addEventListener("click", () => {
    apis.notification?.show({ type: "info", message: "Debug session started — Launch Program (Node.js)", duration: 4000 });
  });
  const configSel = el("div", { class: "vsc-card", style: "margin-bottom:14px;" });
  for (const { name, desc } of [{ name: "Launch Program", desc: "Node.js" }, { name: "Attach to Process", desc: "Node.js" }, { name: "Launch Chrome", desc: "Chrome" }]) {
    const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-size:13px;` });
    const icon = el("span", { style: `color:${C.successGreen};display:flex;` });
    icon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>`;
    row.append(icon, el("span", { style: `color:${C.fg};flex:1;` }, name), el("span", { class: "vsc-tag" }, desc));
    configSel.appendChild(row);
  }
  const sections = el("div");
  for (const name of ["Variables", "Watch", "Call Stack", "Breakpoints"]) {
    const header = el("div", { class: "vsc-section-header" });
    const chevron = el("span", { style: `display:inline-flex;transition:transform .12s;margin-right:4px;` });
    chevron.innerHTML = `<svg width="10" height="10" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
    const headerInner = el("span", { style: "display:flex;align-items:center;gap:2px;" });
    headerInner.append(chevron, el("span", {}, name));
    header.appendChild(headerInner);
    const body = el("div", { style: `display:none;padding:4px 8px;color:${C.fgDim};font-size:12px;` }, `No ${name.toLowerCase()} available.`);
    let expanded = false;
    header.addEventListener("click", () => { expanded = !expanded; chevron.style.transform = `rotate(${expanded ? "90deg" : "0"})`; body.style.display = expanded ? "" : "none"; });
    sections.append(header, body);
  }
  container.append(runBtn, configSel, sections);
  return container;
}
