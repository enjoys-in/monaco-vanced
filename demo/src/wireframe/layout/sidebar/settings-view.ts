// ── Settings Redirect View ───────────────────────────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { C } from "../../types";
import { el } from "../../utils";
import type { ViewContext } from "./types";

export function buildSettingsRedirect(ctx: ViewContext): HTMLElement {
  const { eventBus } = ctx;

  const container = el("div", { style: "padding:24px 16px;text-align:center;overflow-y:auto;height:100%;" });
  const icon = el("div", { style: `color:${C.fgDim};margin-bottom:16px;` });
  icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.42 3.42-3.52-2.35-.83 4.16H9.58l-.84-4.15-3.52 2.35-3.42-3.43 2.35-3.52L0 12.42V7.58l4.15-.84L1.8 3.22 5.22 1.8l3.52 2.35L9.58 0h4.84l.84 4.15 3.52-2.35 3.42 3.42-2.35 3.53zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/></svg>`;
  container.append(
    icon,
    el("div", { style: `font-size:14px;color:${C.fg};margin-bottom:8px;font-weight:500;` }, "Settings"),
    el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:20px;line-height:1.5;` }, "Configure editor, plugins, themes, keybindings, and all workspace preferences."),
  );
  const openBtn = el("button", { class: "vsc-btn vsc-btn-primary", style: "font-size:13px;padding:6px 20px;" }, "Open Settings");
  openBtn.addEventListener("click", () => {
    eventBus.emit("settings:ui-open", {});
  });
  container.appendChild(openBtn);

  const links = el("div", { style: `margin-top:24px;display:flex;flex-direction:column;gap:8px;` });
  for (const { label, desc, action } of [
    { label: "Text Editor", desc: "Font, cursor, minimap, formatting", action: "text-editor" },
    { label: "Workbench", desc: "Appearance, tabs, breadcrumbs", action: "workbench" },
    { label: "Plugins", desc: "Configure all 81 plugin modules", action: "plugins" },
    { label: "Themes", desc: "Color themes & icon themes", action: "themes" },
    { label: "Keybindings", desc: "Keyboard shortcuts", action: "keybindings" },
  ]) {
    const row = el("div", { class: "vsc-file-item", style: `display:flex;flex-direction:column;align-items:flex-start;padding:8px 12px;cursor:pointer;border-radius:6px;` });
    row.append(
      el("span", { style: `font-size:13px;color:${C.textLink};` }, label),
      el("span", { style: `font-size:11px;color:${C.fgDim};` }, desc),
    );
    row.addEventListener("click", () => {
      eventBus.emit("settings:ui-open", { category: action });
    });
    links.appendChild(row);
  }
  container.appendChild(links);
  return container;
}
