// ── VS Code–style toast notifications ───────────────────────

import type { Notification } from "@enjoys/monaco-vanced/infrastructure/notification-module";
import { NotificationEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "./types";
import { el } from "./utils";

const activeToasts = new Map<string, HTMLElement>();

// ── SVG icon paths per notification type (codicon-style) ────
const ICONS: Record<string, string> = {
  info:    `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#3794ff" stroke-width="1.2"/><rect x="7.25" y="4" width="1.5" height="1.5" rx=".5" fill="#3794ff"/><rect x="7.25" y="6.5" width="1.5" height="4.5" rx=".5" fill="#3794ff"/></svg>`,
  success: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#89d185" stroke-width="1.2"/><path d="M5 8.5l2 2 4-4.5" stroke="#89d185" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  warning: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7.56 2.45a.5.5 0 01.88 0l5.5 10.5A.5.5 0 0113.5 14h-11a.5.5 0 01-.44-.75l5.5-10.5z" stroke="#cca700" stroke-width="1.1" fill="none"/><rect x="7.25" y="6" width="1.5" height="3.5" rx=".5" fill="#cca700"/><rect x="7.25" y="10.5" width="1.5" height="1.5" rx=".5" fill="#cca700"/></svg>`,
  error:   `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#f14c4c" stroke-width="1.2"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#f14c4c" stroke-width="1.3" stroke-linecap="round"/></svg>`,
};

const CHEVRON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ── Inject VS Code notification styles once ─────────────────
if (typeof document !== "undefined" && !document.getElementById("vsc-notif-css")) {
  const css = document.createElement("style");
  css.id = "vsc-notif-css";
  css.textContent = `
    @keyframes vsc-notif-in  { from { transform:translateX(30px); opacity:0 } to { transform:translateX(0); opacity:1 } }
    @keyframes vsc-notif-out { from { transform:translateX(0); opacity:1 } to { transform:translateX(30px); opacity:0 } }
    .vsc-toast { animation: vsc-notif-in .2s ease-out; pointer-events:auto }
    .vsc-toast-dismiss { animation: vsc-notif-out .15s ease-in forwards }
    .vsc-toast:hover .vsc-toast-close { opacity:1 }
    .vsc-toast-close { opacity:0; transition:opacity .12s }
    .vsc-toast-action {
      background:none; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:2px 8px;
      border-radius:2px; cursor:pointer; font-size:12px; font-family:inherit; line-height:18px;
      white-space:nowrap;
    }
    .vsc-toast-action:hover { background:rgba(255,255,255,0.1) }
    .vsc-toast-expand-btn { background:none; border:none; color:#858585; cursor:pointer; padding:0; display:flex; align-items:center; transition:transform .15s }
    .vsc-toast-expand-btn[data-expanded="true"] { transform:rotate(90deg) }
    .vsc-toast-progress { height:2px; background:#3794ff; border-radius:0 0 3px 3px; transition:width .3s linear }
  `;
  document.head.appendChild(css);
}

const TRUNCATE_LEN = 100;

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
  // ── Container ──────────────────────────────────────────────
  const toast = el("div", {
    "data-toast-id": n.id,
    class: "vsc-toast",
    style: [
      "display:flex", "flex-direction:column",
      "background:#252526", "border:1px solid #3c3c3c", "border-radius:3px",
      "box-shadow:0 4px 16px rgba(0,0,0,.45)", "width:350px", "max-width:350px",
      "overflow:hidden", "font-size:13px", "line-height:1.4",
    ].join(";"),
  });

  // ── Header row: icon + message + toolbar ───────────────────
  const header = el("div", {
    style: "display:flex;align-items:flex-start;padding:8px 8px 0 10px;gap:8px;",
  });

  // Icon
  const iconWrap = el("span", {
    style: "flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;width:16px;height:16px;",
  });
  iconWrap.innerHTML = ICONS[n.type ?? "info"] ?? ICONS.info;

  // Message (with optional source label + expandable text)
  const msgCol = el("div", { style: "flex:1;min-width:0;" });
  const isLong = n.message.length > TRUNCATE_LEN;

  const msgText = el("span", {
    style: "color:#cccccc;word-wrap:break-word;display:inline;",
  });
  if (n.category) {
    const src = el("span", { style: "font-weight:600;color:#cccccc;" }, n.category);
    msgText.appendChild(src);
    msgText.appendChild(document.createTextNode(": "));
  }
  const textNode = document.createTextNode(
    isLong ? n.message.slice(0, TRUNCATE_LEN) + "…" : n.message,
  );
  msgText.appendChild(textNode);
  msgCol.appendChild(msgText);

  // Toolbar: expand + close
  const toolbar = el("div", {
    style: "display:flex;align-items:center;gap:2px;flex-shrink:0;margin-left:auto;",
  });

  if (isLong) {
    const expandBtn = el("button", {
      class: "vsc-toast-expand-btn",
      "data-expanded": "false",
      title: "Toggle Details",
    });
    expandBtn.innerHTML = CHEVRON;
    expandBtn.addEventListener("click", () => {
      const expanded = expandBtn.getAttribute("data-expanded") === "true";
      expandBtn.setAttribute("data-expanded", String(!expanded));
      textNode.textContent = expanded
        ? n.message.slice(0, TRUNCATE_LEN) + "…"
        : n.message;
    });
    toolbar.appendChild(expandBtn);
  }

  const closeBtn = el("button", {
    class: "vsc-toast-close",
    style: "background:none;border:none;color:#858585;cursor:pointer;font-size:16px;line-height:1;padding:0 2px;display:flex;align-items:center;",
    title: "Close Notification",
  });
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", () => apis.notification?.dismiss(n.id));
  toolbar.appendChild(closeBtn);

  header.append(iconWrap, msgCol, toolbar);
  toast.appendChild(header);

  // ── Actions row ────────────────────────────────────────────
  if (n.actions?.length) {
    const actionsRow = el("div", {
      style: "display:flex;gap:6px;padding:6px 10px 8px 34px;", // indent past icon
    });
    for (const action of n.actions) {
      const label = typeof action === "string" ? action : action.label;
      const actionCallback = typeof action === "object" && "command" in action ? (action as { command?: string }).command : undefined;
      const btn = el("button", { class: "vsc-toast-action" }, label);
      btn.addEventListener("click", () => {
        // Execute action command if provided
        if (actionCallback && apis.command) {
          apis.command.execute(actionCallback);
        }
        // Emit action-clicked event with action label
        const bus = (apis as any)._eventBus;
        // Notify about the action that was taken
        apis.notification?.dismiss(n.id);
      });
      actionsRow.appendChild(btn);
    }
    toast.appendChild(actionsRow);
  } else {
    // Small bottom padding when no actions
    toast.style.paddingBottom = "8px";
  }

  // ── Progress bar ───────────────────────────────────────────
  if (n.progress != null) {
    const barBg = el("div", {
      style: "height:2px;background:#2d2d2d;border-radius:0 0 3px 3px;overflow:hidden;",
    });
    const bar = el("div", {
      class: "vsc-toast-progress",
      style: `width:${Math.min(100, Math.max(0, n.progress))}%;`,
    });
    barBg.appendChild(bar);
    toast.appendChild(barBg);
  }

  dom.toastContainer.appendChild(toast);
  activeToasts.set(n.id, toast);

  // Auto-dismiss
  if (n.autoHide !== false) {
    setTimeout(() => apis.notification?.dismiss(n.id), n.duration ?? 5000);
  }
}

function dismissToast(id: string) {
  const toast = activeToasts.get(id);
  if (!toast) return;
  toast.classList.add("vsc-toast-dismiss");
  setTimeout(() => { toast.remove(); activeToasts.delete(id); }, 150);
}
