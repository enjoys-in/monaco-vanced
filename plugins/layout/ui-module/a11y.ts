// ── Accessibility Utilities ────────────────────────────────
// ARIA, focus management, screen reader announcements.

import type { FocusTrapConfig } from "./types";

/**
 * Announce a message to screen readers via an ARIA live region.
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite",
): void {
  if (typeof document === "undefined") return;

  const regionId = `monaco-vanced-aria-${priority}`;
  let region = document.getElementById(regionId);

  if (!region) {
    region = document.createElement("div");
    region.id = regionId;
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", priority);
    region.setAttribute("aria-atomic", "true");
    region.style.position = "absolute";
    region.style.width = "1px";
    region.style.height = "1px";
    region.style.overflow = "hidden";
    region.style.clip = "rect(0,0,0,0)";
    region.style.whiteSpace = "nowrap";
    document.body.appendChild(region);
  }

  // Clear and re-set to trigger announcement
  region.textContent = "";
  requestAnimationFrame(() => {
    region!.textContent = message;
  });
}

/**
 * Create a focus trap within a container element.
 */
export function trapFocus(config: FocusTrapConfig): { release: () => void } {
  if (typeof document === "undefined") {
    return { release: () => {} };
  }

  const container = document.getElementById(config.containerId);
  if (!container) return { release: () => {} };

  const focusableSelector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container!.querySelectorAll<HTMLElement>(focusableSelector));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  container.addEventListener("keydown", handleKeyDown);

  // Set initial focus
  if (config.initialFocusId) {
    const initial = document.getElementById(config.initialFocusId);
    initial?.focus();
  } else {
    const focusable = getFocusableElements();
    focusable[0]?.focus();
  }

  const previousFocus = document.activeElement as HTMLElement | null;

  return {
    release() {
      container!.removeEventListener("keydown", handleKeyDown);
      if (config.returnFocusOnDeactivate !== false && previousFocus) {
        previousFocus.focus();
      }
    },
  };
}

/**
 * Set ARIA attributes on an element.
 */
export function setAriaAttributes(
  element: HTMLElement,
  attrs: Record<string, string | boolean>,
): void {
  for (const [key, value] of Object.entries(attrs)) {
    const attrName = key.startsWith("aria-") ? key : `aria-${key}`;
    if (typeof value === "boolean") {
      element.setAttribute(attrName, String(value));
    } else {
      element.setAttribute(attrName, value);
    }
  }
}
