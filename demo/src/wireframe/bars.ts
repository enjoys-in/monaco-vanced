// ── Title bar + Status bar wiring ────────────────────────────

import type { StatusbarItem } from "@enjoys/monaco-vanced/layout/statusbar-module";
import { StatusbarEvents, HeaderEvents, TitlebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { el } from "./utils";

export function wireTitleBar(dom: DOMRefs, _apis: WireframeAPIs, on: OnHandler) {
  on(TitlebarEvents.Update, (p) => {
    const state = p as { fileName?: string; filePath?: string; isDirty?: boolean };
    const parts: string[] = [];
    if (state.fileName) parts.push(state.isDirty ? `● ${state.fileName}` : state.fileName);
    if (state.filePath) parts.push(`— ${state.filePath}`);
    parts.push("— Monaco Vanced");
    dom.titleCenter.textContent = parts.join(" ");
    document.title = parts.join(" ");
  });

  on(HeaderEvents.TitleChange, (p) => {
    const { title } = p as { title: string };
    dom.titleText.textContent = title;
  });
}

export function wireStatusBar(dom: DOMRefs, apis: WireframeAPIs, on: OnHandler) {
  const itemEls = new Map<string, HTMLElement>();

  function renderItem(item: StatusbarItem): HTMLElement {
    const itemEl = el("span", {
      "data-id": item.id,
      title: item.tooltip ?? "",
      style: `cursor:${item.command ? "pointer" : "default"};padding:0 4px;display:${item.visible !== false ? "inline-flex" : "none"};align-items:center;gap:4px;border-radius:2px;`,
    });
    itemEl.addEventListener("mouseenter", () => { itemEl.style.background = "rgba(255,255,255,0.12)"; });
    itemEl.addEventListener("mouseleave", () => { itemEl.style.background = "transparent"; });
    if (item.command) {
      itemEl.addEventListener("click", () => apis.command?.execute(item.command!));
    }
    itemEl.textContent = item.label;
    return itemEl;
  }

  function addItem(item: StatusbarItem) {
    const itemEl = renderItem(item);
    itemEls.set(item.id, itemEl);
    (item.alignment === "right" ? dom.statusRight : dom.statusLeft).appendChild(itemEl);
  }

  on(StatusbarEvents.ItemRegister, (p) => addItem(p as StatusbarItem));

  on(StatusbarEvents.ItemUpdate, (p) => {
    const item = p as StatusbarItem;
    const existing = itemEls.get(item.id);
    if (!existing) return;
    existing.textContent = item.label;
    existing.title = item.tooltip ?? "";
    existing.style.display = item.visible !== false ? "inline-flex" : "none";
  });

  on(StatusbarEvents.ItemRemove, (p) => {
    const { id } = p as { id: string };
    itemEls.get(id)?.remove();
    itemEls.delete(id);
  });

  // Bootstrap from existing items
  if (apis.statusbar) {
    apis.statusbar.getItems("left").forEach(addItem);
    apis.statusbar.getItems("right").forEach(addItem);
  }
}
