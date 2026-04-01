// ── Accounts View ────────────────────────────────────────────

import { C } from "../../types";
import { el } from "../../utils";
import type { ViewContext } from "./types";

export function buildAccountsView(ctx: ViewContext): HTMLElement {
  const { apis } = ctx;

  const container = el("div", { style: "padding:20px 16px;overflow-y:auto;height:100%;display:flex;flex-direction:column;align-items:center;" });
  const avatar = el("div", { style: `width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg, ${C.accent}, ${C.buttonHoverBg});display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:600;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,122,204,0.3);` }, "U");
  const name = el("div", { style: `font-size:15px;color:${C.fg};font-weight:500;margin-bottom:2px;` }, "User");
  const email = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:20px;` }, "user@example.com");
  const card = el("div", { class: "vsc-card", style: "width:100%;max-width:280px;" });
  for (const { label, icon } of [
    { label: "Sign in with GitHub", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>` },
    { label: "Sign in with Microsoft", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6.5" height="6.5" fill="#f25022"/><rect x="8.5" y="1" width="6.5" height="6.5" fill="#7fba00"/><rect x="1" y="8.5" width="6.5" height="6.5" fill="#00a4ef"/><rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#ffb900"/></svg>` },
    { label: "Turn on Settings Sync", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 1H7l.5.5v5l-.5.5H2.5l-.5-.5v-5l.5-.5zM3 6h4V2H3v4zm6.5-5H14l.5.5v5l-.5.5H9.5l-.5-.5v-5l.5-.5zm.5 5h4V2h-4v4zm-7 3H7l.5.5v5l-.5.5H2.5l-.5-.5v-5l.5-.5zM3 14h4v-4H3v4zm6.5-5H14l.5.5v5l-.5.5H9.5l-.5-.5v-5l.5-.5zm.5 5h4v-4h-4v4z"/></svg>` },
  ]) {
    const row = el("div", { class: "vsc-file-item", style: `display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;cursor:pointer;font-size:13px;color:${C.fg};` });
    const iconEl = el("span", { style: `display:flex;align-items:center;flex-shrink:0;color:${C.fgDim};` });
    iconEl.innerHTML = icon;
    row.append(iconEl, el("span", {}, label));
    row.addEventListener("click", () => {
      if (label.includes("GitHub")) apis.notification?.show({ type: "info", message: "GitHub OAuth: Redirecting to GitHub for authentication...", duration: 4000 });
      else if (label.includes("Microsoft")) apis.notification?.show({ type: "info", message: "Microsoft OAuth: Redirecting to Microsoft for authentication...", duration: 4000 });
      else apis.notification?.show({ type: "info", message: "Settings Sync: Enable sync to keep your settings across devices.", duration: 4000 });
    });
    card.appendChild(row);
  }
  container.append(avatar, name, email, card);
  return container;
}
