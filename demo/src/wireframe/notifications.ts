// ── Toast notifications ─────────────────────────────────────

import type { Notification } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import type { NotificationModuleAPI } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import { NotificationEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { C } from "./types";
import { el } from "./utils";

const activeToasts = new Map<string, HTMLElement>();

export function wireNotifications(dom: DOMRefs, apis: WireframeAPIs, on: OnHandler) {
  on(NotificationEvents.Show, (p) => {
    const n = p as Notification & { id: string };
    showToast(dom, apis, n);
  });

  on(NotificationEvents.Dismiss, (p) => {
    const { id } = p as { id: string };
    dismissToast(id);
  });
}

function showToast(dom: DOMRefs, apis: WireframeAPIs, n: Notification & { id: string }) {
  const bgColor = C.notification[n.type ?? "info"] ?? C.notification.info;

  const toast = el("div", {
    "data-toast-id": n.id,
    style: `pointer-events:auto;display:flex;align-items:flex-start;gap:8px;padding:10px 14px;background:${C.sidebarBg};border-left:3px solid ${bgColor};border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.4);min-width:300px;max-width:380px;animation:slideIn 0.2s ease-out;`,
  });

  const msg = el("span", { style: "flex:1;font-size:13px;line-height:1.4;" }, n.message);
  const closeBtn = el("span", { style: "cursor:pointer;font-size:16px;line-height:1;opacity:0.7;" }, "×");
  closeBtn.addEventListener("click", () => apis.notification?.dismiss(n.id));

  toast.append(msg, closeBtn);

  if (n.actions?.length) {
    const actionsRow = el("div", { style: "display:flex;gap:6px;margin-top:6px;" });
    n.actions.forEach((action) => {
      const btn = el("button", {
        style: `background:${bgColor};color:#fff;border:none;padding:3px 10px;border-radius:3px;cursor:pointer;font-size:12px;`,
      }, typeof action === "string" ? action : action.label);
      btn.addEventListener("click", () => {
        const label = typeof action === "string" ? action : action.label;
        apis.notification?.dismiss(n.id);
        (apis as { notification?: NotificationModuleAPI }).notification?.onAction?.(n.id, label);
      });
      actionsRow.appendChild(btn);
    });
    toast.appendChild(actionsRow);
  }

  dom.toastContainer.appendChild(toast);
  activeToasts.set(n.id, toast);

  if (n.autoHide !== false) {
    setTimeout(() => apis.notification?.dismiss(n.id), n.duration ?? 5000);
  }
}

function dismissToast(id: string) {
  const toast = activeToasts.get(id);
  if (!toast) return;
  toast.style.animation = "slideOut 0.2s ease-in forwards";
  setTimeout(() => { toast.remove(); activeToasts.delete(id); }, 200);
}
