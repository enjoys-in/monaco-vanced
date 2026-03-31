// ── Keybinding Module — Parser ─────────────────────────────────

import type { KeyCombo } from "./types";

const KEY_ALIASES: Record<string, string> = {
  ctrl: "ctrl",
  control: "ctrl",
  shift: "shift",
  alt: "alt",
  option: "alt",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  win: "meta",
  super: "meta",
  escape: "escape",
  esc: "escape",
  enter: "enter",
  return: "enter",
  space: " ",
  backspace: "backspace",
  delete: "delete",
  del: "delete",
  tab: "tab",
  arrowup: "arrowup",
  arrowdown: "arrowdown",
  arrowleft: "arrowleft",
  arrowright: "arrowright",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
};

export function parseKeyCombo(str: string): KeyCombo {
  const parts = str
    .toLowerCase()
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);

  const combo: KeyCombo = { ctrl: false, shift: false, alt: false, meta: false, key: "" };

  for (const part of parts) {
    const normalized = KEY_ALIASES[part] ?? part;
    switch (normalized) {
      case "ctrl":
        combo.ctrl = true;
        break;
      case "shift":
        combo.shift = true;
        break;
      case "alt":
        combo.alt = true;
        break;
      case "meta":
        combo.meta = true;
        break;
      default:
        combo.key = normalized;
    }
  }

  return combo;
}

export function normalizeKey(raw: string): string {
  const combo = parseKeyCombo(raw);
  const parts: string[] = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.shift) parts.push("Shift");
  if (combo.alt) parts.push("Alt");
  if (combo.meta) parts.push("Meta");
  if (combo.key) parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : capitalize(combo.key));
  return parts.join("+");
}

export function matchEvent(event: KeyboardEvent, combo: KeyCombo): boolean {
  if (event.ctrlKey !== combo.ctrl) return false;
  if (event.shiftKey !== combo.shift) return false;
  if (event.altKey !== combo.alt) return false;
  if (event.metaKey !== combo.meta) return false;
  const eventKey = event.key.toLowerCase();
  const comboKey = combo.key.toLowerCase();
  return eventKey === comboKey || (KEY_ALIASES[eventKey] ?? eventKey) === comboKey;
}

export function keyComboToString(combo: KeyCombo): string {
  const parts: string[] = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.shift) parts.push("Shift");
  if (combo.alt) parts.push("Alt");
  if (combo.meta) parts.push("Meta");
  if (combo.key) parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : capitalize(combo.key));
  return parts.join("+");
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
