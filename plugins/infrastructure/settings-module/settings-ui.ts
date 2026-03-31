// ── Settings Module — Settings UI Panel ────────────────────────
// Pure DOM-based settings panel mirroring VSCode's Settings UI.
// Renders into any container via renderSettingsUI(). Categories on the left,
// form controls on the right, search bar at top, "Open JSON" + layer toggle.

import type { SchemaRegistry } from "./schema-registry";
import type { SettingsStore } from "./store";
import type { SettingsModuleAPI, SettingsCategory, SettingSchema } from "./types";

// ── Public interface ─────────────────────────────────────────

export interface SettingsUIOptions {
  schemaRegistry: SchemaRegistry;
  store: SettingsStore;
  api: SettingsModuleAPI;
  section?: string;
}

const CATEGORIES: SettingsCategory[] = [
  "themes",
  "editor",
  "snippets",
  "keybindings",
  "account",
  "command palette",
  "layout",
  "extensions",
  "language",
  "terminal",
  "linting",
  "formatting",
];

// ── Main render ──────────────────────────────────────────────

export function renderSettingsUI(container: HTMLElement, opts: SettingsUIOptions): void {
  container.innerHTML = "";
  container.className = "mv-settings-panel";

  // Inject scoped styles
  injectStyles(container);

  const activeCategory: { current: SettingsCategory } = { current: (opts.section as SettingsCategory) ?? "editor" };
  const searchQuery: { current: string } = { current: "" };

  // ── Header ─────────────────────────────────────────────
  const header = el("div", "mv-settings-header");

  const title = el("span", "mv-settings-title");
  title.textContent = "Settings";

  const searchInput = el("input", "mv-settings-search") as HTMLInputElement;
  searchInput.type = "text";
  searchInput.placeholder = "Search settings…";
  searchInput.addEventListener("input", () => {
    searchQuery.current = searchInput.value.toLowerCase();
    renderContent();
  });

  const openJsonBtn = el("button", "mv-settings-btn");
  openJsonBtn.textContent = "Open JSON";
  openJsonBtn.addEventListener("click", () => opts.api.openJSON("user"));

  header.append(title, searchInput, openJsonBtn);

  // ── Body (sidebar + content) ───────────────────────────
  const body = el("div", "mv-settings-body");
  const sidebar = el("nav", "mv-settings-sidebar");
  const content = el("div", "mv-settings-content");

  // Render sidebar categories
  function renderSidebar(): void {
    sidebar.innerHTML = "";
    const heading = el("div", "mv-settings-sidebar-heading");
    heading.textContent = "CATEGORIES";
    sidebar.appendChild(heading);

    for (const cat of CATEGORIES) {
      const item = el("div", `mv-settings-cat${cat === activeCategory.current ? " active" : ""}`);
      item.textContent = capitalize(cat);
      item.addEventListener("click", () => {
        activeCategory.current = cat;
        renderSidebar();
        renderContent();
      });
      sidebar.appendChild(item);
    }
  }

  // Render settings content for the active category
  function renderContent(): void {
    content.innerHTML = "";

    const schemas = opts.schemaRegistry.getByCategory(activeCategory.current);
    const filtered = searchQuery.current
      ? schemas.filter(
          (s) =>
            s.key.toLowerCase().includes(searchQuery.current) ||
            s.description.toLowerCase().includes(searchQuery.current),
        )
      : schemas;

    if (filtered.length === 0) {
      const empty = el("div", "mv-settings-empty");
      empty.textContent = searchQuery.current
        ? `No settings matching "${searchQuery.current}"`
        : `No settings registered for "${capitalize(activeCategory.current)}"`;
      content.appendChild(empty);
      return;
    }

    // Section heading
    const sectionTitle = el("h3", "mv-settings-section-title");
    sectionTitle.textContent = capitalize(activeCategory.current);
    content.appendChild(sectionTitle);

    for (const schema of filtered) {
      content.appendChild(renderSettingRow(schema, opts));
    }
  }

  body.append(sidebar, content);
  container.append(header, body);

  renderSidebar();
  renderContent();
}

// ── Setting row renderer ─────────────────────────────────────

function renderSettingRow(schema: SettingSchema, opts: SettingsUIOptions): HTMLElement {
  const row = el("div", "mv-settings-row");

  // Label
  const label = el("div", "mv-settings-label");
  const keySpan = el("span", "mv-settings-key");
  keySpan.textContent = schema.key;
  const descSpan = el("span", "mv-settings-desc");
  descSpan.textContent = schema.description;
  label.append(keySpan, descSpan);

  // Control
  const control = el("div", "mv-settings-control");
  const currentValue = opts.store.get(schema.key);

  switch (schema.type) {
    case "boolean": {
      const cb = el("input", "mv-settings-checkbox") as HTMLInputElement;
      cb.type = "checkbox";
      cb.checked = !!currentValue;
      cb.addEventListener("change", () => opts.api.set(schema.key, cb.checked));
      const cbLabel = el("label", "mv-settings-cb-label");
      cbLabel.append(cb, document.createTextNode(cb.checked ? " enabled" : " disabled"));
      control.appendChild(cbLabel);
      break;
    }
    case "number": {
      const input = el("input", "mv-settings-number") as HTMLInputElement;
      input.type = "number";
      input.value = String(currentValue ?? schema.default ?? 0);
      if (schema.min !== undefined) input.min = String(schema.min);
      if (schema.max !== undefined) input.max = String(schema.max);
      input.addEventListener("change", () => opts.api.set(schema.key, Number(input.value)));
      control.appendChild(input);
      break;
    }
    case "enum": {
      const select = el("select", "mv-settings-select") as HTMLSelectElement;
      for (const opt of schema.enum ?? []) {
        const option = document.createElement("option");
        option.value = String(opt);
        option.textContent = String(opt);
        if (String(opt) === String(currentValue)) option.selected = true;
        select.appendChild(option);
      }
      select.addEventListener("change", () => opts.api.set(schema.key, select.value));
      control.appendChild(select);
      break;
    }
    case "string": {
      if (schema.enum && schema.enum.length > 0) {
        // String with enum → dropdown
        const select = el("select", "mv-settings-select") as HTMLSelectElement;
        for (const opt of schema.enum) {
          const option = document.createElement("option");
          option.value = String(opt);
          option.textContent = String(opt);
          if (String(opt) === String(currentValue)) option.selected = true;
          select.appendChild(option);
        }
        select.addEventListener("change", () => opts.api.set(schema.key, select.value));
        control.appendChild(select);
      } else {
        const input = el("input", "mv-settings-text") as HTMLInputElement;
        input.type = "text";
        input.value = String(currentValue ?? schema.default ?? "");
        input.addEventListener("change", () => opts.api.set(schema.key, input.value));
        control.appendChild(input);
      }
      break;
    }
    case "array":
    case "object": {
      // Render as editable JSON textarea
      const textarea = el("textarea", "mv-settings-json") as HTMLTextAreaElement;
      textarea.value = JSON.stringify(currentValue ?? schema.default, null, 2);
      textarea.rows = 3;
      textarea.addEventListener("change", () => {
        try {
          const parsed = JSON.parse(textarea.value);
          opts.api.set(schema.key, parsed);
          textarea.classList.remove("mv-settings-error");
        } catch {
          textarea.classList.add("mv-settings-error");
        }
      });
      control.appendChild(textarea);
      break;
    }
  }

  // Layer indicator + Reset button
  const meta = el("div", "mv-settings-meta");
  const layerTag = el("span", "mv-settings-layer");
  const userVal = opts.store.get(schema.key, "user");
  const wsVal = opts.store.get(schema.key, "workspace");
  if (wsVal !== undefined) {
    layerTag.textContent = "Workspace";
    layerTag.classList.add("workspace");
  } else if (userVal !== undefined) {
    layerTag.textContent = "User";
    layerTag.classList.add("user");
  } else {
    layerTag.textContent = "Default";
  }

  const resetBtn = el("button", "mv-settings-reset-btn");
  resetBtn.textContent = "Reset to Default";
  resetBtn.addEventListener("click", () => {
    opts.api.reset(schema.key);
    // Re-render this row
    const parent = row.parentElement;
    if (parent) {
      const newRow = renderSettingRow(schema, opts);
      parent.replaceChild(newRow, row);
    }
  });

  meta.append(layerTag, resetBtn);
  row.append(label, control, meta);
  return row;
}

// ── Helpers ──────────────────────────────────────────────────

function el(tag: string, className: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Scoped Styles ────────────────────────────────────────────

function injectStyles(container: HTMLElement): void {
  const styleId = "mv-settings-styles";
  if (container.querySelector(`#${styleId}`)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .mv-settings-panel {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: 13px;
      color: var(--vscode-foreground, #ccc);
      background: var(--vscode-editor-background, #1e1e1e);
    }
    .mv-settings-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border, #333);
    }
    .mv-settings-title {
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }
    .mv-settings-search {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--vscode-input-border, #444);
      background: var(--vscode-input-background, #333);
      color: var(--vscode-input-foreground, #ccc);
      border-radius: 3px;
      outline: none;
      font-size: 12px;
    }
    .mv-settings-search:focus {
      border-color: var(--vscode-focusBorder, #007acc);
    }
    .mv-settings-btn {
      padding: 4px 10px;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
    }
    .mv-settings-btn:hover {
      background: var(--vscode-button-hoverBackground, #1177bb);
    }
    .mv-settings-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .mv-settings-sidebar {
      width: 180px;
      min-width: 140px;
      border-right: 1px solid var(--vscode-panel-border, #333);
      padding: 8px 0;
      overflow-y: auto;
      flex-shrink: 0;
    }
    .mv-settings-sidebar-heading {
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--vscode-sideBarSectionHeader-foreground, #999);
      letter-spacing: 0.5px;
    }
    .mv-settings-cat {
      padding: 5px 12px;
      cursor: pointer;
      border-left: 2px solid transparent;
    }
    .mv-settings-cat:hover {
      background: var(--vscode-list-hoverBackground, #2a2d2e);
    }
    .mv-settings-cat.active {
      background: var(--vscode-list-activeSelectionBackground, #094771);
      color: var(--vscode-list-activeSelectionForeground, #fff);
      border-left-color: var(--vscode-focusBorder, #007acc);
    }
    .mv-settings-content {
      flex: 1;
      padding: 12px 16px;
      overflow-y: auto;
    }
    .mv-settings-section-title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 600;
    }
    .mv-settings-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 0;
      border-bottom: 1px solid var(--vscode-panel-border, #262626);
      align-items: flex-start;
    }
    .mv-settings-label {
      flex: 1;
      min-width: 200px;
    }
    .mv-settings-key {
      display: block;
      font-weight: 500;
      color: var(--vscode-foreground, #ddd);
    }
    .mv-settings-desc {
      display: block;
      font-size: 11px;
      color: var(--vscode-descriptionForeground, #888);
      margin-top: 2px;
    }
    .mv-settings-control {
      min-width: 180px;
    }
    .mv-settings-control input[type="text"],
    .mv-settings-control input[type="number"],
    .mv-settings-control select,
    .mv-settings-control textarea {
      width: 100%;
      padding: 3px 6px;
      border: 1px solid var(--vscode-input-border, #444);
      background: var(--vscode-input-background, #333);
      color: var(--vscode-input-foreground, #ccc);
      border-radius: 3px;
      font-size: 12px;
      font-family: inherit;
    }
    .mv-settings-control input[type="checkbox"] {
      margin-right: 4px;
      accent-color: var(--vscode-focusBorder, #007acc);
    }
    .mv-settings-cb-label {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .mv-settings-json {
      resize: vertical;
      min-height: 40px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
    }
    .mv-settings-error {
      border-color: var(--vscode-inputValidation-errorBorder, #be1100) !important;
    }
    .mv-settings-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-basis: 100%;
      margin-top: 2px;
    }
    .mv-settings-layer {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      background: var(--vscode-badge-background, #4d4d4d);
      color: var(--vscode-badge-foreground, #ccc);
    }
    .mv-settings-layer.workspace {
      background: #2b5c3f;
    }
    .mv-settings-layer.user {
      background: #3a4a6b;
    }
    .mv-settings-reset-btn {
      font-size: 11px;
      padding: 1px 6px;
      border: 1px solid var(--vscode-button-secondaryBorder, #555);
      background: transparent;
      color: var(--vscode-foreground, #aaa);
      border-radius: 3px;
      cursor: pointer;
    }
    .mv-settings-reset-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #333);
    }
    .mv-settings-empty {
      padding: 20px;
      text-align: center;
      color: var(--vscode-descriptionForeground, #666);
    }
  `;
  container.appendChild(style);
}
