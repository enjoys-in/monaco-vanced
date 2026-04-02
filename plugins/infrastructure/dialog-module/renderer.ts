// ── Dialog Module — Renderer ──────────────────────────────────
// Renders modal dialogs with focus trap, escape-to-close, action buttons.

import type { DialogConfig, DialogResult, DialogField, DialogSeverity } from "./types";

// ── Built-in severity icons (inline SVG) ─────────────────────

const SEVERITY_ICONS: Record<DialogSeverity, string> = {
  error: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="13" r="12" fill="#d32f2f"/><path d="M9 9l8 8M17 9l-8 8" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`,
  warning: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L1 24h24L13 2z" fill="#f5a623"/><text x="13" y="20" text-anchor="middle" fill="#000" font-weight="bold" font-size="14">!</text></svg>`,
  info: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="13" r="12" fill="#0078d4"/><text x="13" y="19" text-anchor="middle" fill="#fff" font-weight="bold" font-size="16">i</text></svg>`,
  success: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="13" r="12" fill="#388e3c"/><path d="M8 13l3 3 7-7" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

export class DialogRenderer {
  private activeDialogs = new Map<string, { element: HTMLElement; resolve: (result: DialogResult) => void }>();
  private nextId = 1;

  renderModal(config: DialogConfig): { element: HTMLElement; promise: Promise<DialogResult> } {
    const id = config.id ?? `dialog-${this.nextId++}`;
    let resolveDialog: (result: DialogResult) => void;

    const promise = new Promise<DialogResult>((resolve) => {
      resolveDialog = resolve;
    });

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "mv-dialog-overlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;";

    // Create dialog
    const dialog = document.createElement("div");
    dialog.className = "mv-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", `${id}-title`);
    dialog.style.cssText = `background:var(--mv-dialog-bg,#1e1e1e);color:var(--mv-dialog-fg,#ccc);border-radius:8px;padding:20px;min-width:${config.width ?? 400}px;max-width:90vw;max-height:90vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.3);`;

    // ── Header: icon (optional) + title ─────────────────────
    const hasSeverityIcon = config.severity || config.icon;

    if (hasSeverityIcon) {
      // Rich mode: icon on the left, title + body on the right (like OS-native dialogs)
      const headerRow = document.createElement("div");
      headerRow.style.cssText = "display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;";

      // Icon
      const iconEl = document.createElement("div");
      iconEl.style.cssText = "flex-shrink:0;margin-top:2px;";
      if (config.icon && config.icon.startsWith("<")) {
        // Raw SVG string
        iconEl.innerHTML = config.icon;
      } else if (config.icon) {
        // Codicon name — render as text placeholder
        iconEl.innerHTML = `<span style="font-size:24px;">${config.icon}</span>`;
      } else if (config.severity) {
        iconEl.innerHTML = SEVERITY_ICONS[config.severity];
      }
      headerRow.appendChild(iconEl);

      // Content column: title + body paragraphs
      const contentCol = document.createElement("div");
      contentCol.style.cssText = "flex:1;min-width:0;";

      const title = document.createElement("h2");
      title.id = `${id}-title`;
      title.textContent = config.title;
      title.style.cssText = "margin:0 0 8px 0;font-size:16px;font-weight:600;";
      contentCol.appendChild(title);

      // Body — string or string[]
      if (config.body) {
        const paragraphs = Array.isArray(config.body) ? config.body : [config.body];
        for (const text of paragraphs) {
          const p = document.createElement("p");
          p.textContent = text;
          p.style.cssText = "margin:0 0 8px 0;font-size:13px;opacity:0.85;line-height:1.5;";
          contentCol.appendChild(p);
        }
      }

      headerRow.appendChild(contentCol);
      dialog.appendChild(headerRow);
    } else {
      // Simple mode: plain title + body (backwards compatible, current behavior)
      const title = document.createElement("h2");
      title.id = `${id}-title`;
      title.textContent = config.title;
      title.style.cssText = "margin:0 0 12px 0;font-size:16px;";
      dialog.appendChild(title);

      if (config.body) {
        const paragraphs = Array.isArray(config.body) ? config.body : [config.body];
        for (const text of paragraphs) {
          const p = document.createElement("p");
          p.textContent = text;
          p.style.cssText = "margin:0 0 10px 0;font-size:14px;opacity:0.8;";
          dialog.appendChild(p);
        }
      }
    }

    // Fields
    const fieldValues: Record<string, unknown> = {};
    if (config.fields?.length) {
      const form = document.createElement("div");
      form.className = "mv-dialog-fields";
      form.style.cssText = "display:flex;flex-direction:column;gap:10px;margin-bottom:16px;";
      for (const field of config.fields) {
        const fieldEl = this.renderField(field, fieldValues);
        form.appendChild(fieldEl);
      }
      dialog.appendChild(form);
    }

    // Actions
    const actions = config.actions ?? [{ id: "ok", label: "OK", primary: true }];
    const actionBar = document.createElement("div");
    actionBar.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";
    for (const action of actions) {
      const btn = document.createElement("button");
      btn.textContent = action.label;
      btn.style.cssText = `padding:6px 16px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-size:13px;${
        action.primary ? "background:#0078d4;color:#fff;" : "background:transparent;color:#ccc;"
      }${action.destructive ? "background:#d32f2f;color:#fff;" : ""}`;
      btn.addEventListener("click", () => {
        this.close(id);
        resolveDialog!({ action: action.id, values: { ...fieldValues } });
      });
      actionBar.appendChild(btn);
    }
    dialog.appendChild(actionBar);

    overlay.appendChild(dialog);

    // Escape to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (config.closable !== false)) {
        this.close(id);
        resolveDialog!({ action: "cancel" });
      }
    };
    document.addEventListener("keydown", escHandler);

    // Click overlay to close
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay && config.closable !== false) {
        this.close(id);
        resolveDialog!({ action: "cancel" });
      }
    });

    // Focus trap
    dialog.tabIndex = -1;
    requestAnimationFrame(() => {
      const firstFocusable = dialog.querySelector<HTMLElement>("input, button, select, textarea");
      (firstFocusable ?? dialog).focus();
    });

    document.body.appendChild(overlay);
    this.activeDialogs.set(id, {
      element: overlay,
      resolve: resolveDialog!,
    });

    return { element: overlay, promise };
  }

  close(id: string): void {
    const entry = this.activeDialogs.get(id);
    if (entry) {
      entry.element.remove();
      this.activeDialogs.delete(id);
    }
  }

  closeAll(): void {
    for (const [id] of this.activeDialogs) {
      this.close(id);
    }
  }

  getActiveIds(): string[] {
    return Array.from(this.activeDialogs.keys());
  }

  private renderField(field: DialogField, values: Record<string, unknown>): HTMLElement {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = field.label;
    label.style.cssText = "font-size:13px;margin-bottom:4px;display:block;";
    wrapper.appendChild(label);

    if (field.type === "select" && field.options) {
      const select = document.createElement("select");
      select.style.cssText = "width:100%;padding:6px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:#2d2d2d;color:#ccc;";
      for (const opt of field.options) {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      }
      select.value = String(field.default ?? "");
      values[field.id] = select.value;
      select.addEventListener("change", () => { values[field.id] = select.value; });
      wrapper.appendChild(select);
    } else if (field.type === "checkbox") {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(field.default);
      values[field.id] = input.checked;
      input.addEventListener("change", () => { values[field.id] = input.checked; });
      wrapper.appendChild(input);
    } else if (field.type === "textarea") {
      const textarea = document.createElement("textarea");
      textarea.style.cssText = "width:100%;padding:6px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:#2d2d2d;color:#ccc;min-height:80px;resize:vertical;";
      textarea.placeholder = field.placeholder ?? "";
      textarea.value = String(field.default ?? "");
      values[field.id] = textarea.value;
      textarea.addEventListener("input", () => { values[field.id] = textarea.value; });
      wrapper.appendChild(textarea);
    } else {
      const input = document.createElement("input");
      input.type = field.type === "password" ? "password" : "text";
      input.style.cssText = "width:100%;padding:6px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);background:#2d2d2d;color:#ccc;";
      input.placeholder = field.placeholder ?? "";
      input.value = String(field.default ?? "");
      values[field.id] = input.value;
      input.addEventListener("input", () => { values[field.id] = input.value; });
      wrapper.appendChild(input);
    }

    return wrapper;
  }
}
