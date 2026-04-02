// ── Accessibility Module — Plugin Entry ───────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { AccessibilityConfig, AccessibilityModuleAPI, AriaLive, FocusTrapConfig } from "./types";
import { AccessibilityEvents } from "@core/events";

export type { AccessibilityConfig, AccessibilityModuleAPI, AriaLive, FocusTrapConfig } from "./types";

export function createAccessibilityPlugin(config: AccessibilityConfig = {}): {
  plugin: MonacoPlugin;
  api: AccessibilityModuleAPI;
} {
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let highContrast = false;
  let announceEl: HTMLElement | null = null;
  const announceDelay = config.announceDelay ?? 100;

  function getOrCreateAnnouncer(): HTMLElement {
    if (announceEl) return announceEl;
    announceEl = document.createElement("div");
    announceEl.setAttribute("role", "status");
    announceEl.setAttribute("aria-live", "polite");
    announceEl.setAttribute("aria-atomic", "true");
    announceEl.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;";
    document.body.appendChild(announceEl);
    return announceEl;
  }

  function getFocusableElements(): HTMLElement[] {
    const container = document.querySelector("[data-editor-container]") ?? document.body;
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }

  const reduceMotionQuery = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;

  const api: AccessibilityModuleAPI = {
    announce(message: string, priority: AriaLive = "polite"): void {
      const el = getOrCreateAnnouncer();
      el.setAttribute("aria-live", priority);
      // Clear then set to force re-announce
      el.textContent = "";
      setTimeout(() => {
        el.textContent = message;
      }, announceDelay);
      ctx?.emit(AccessibilityEvents.AnnounceMessage, { message, priority });
    },

    prefersReducedMotion(): boolean {
      if (config.reducedMotion !== undefined) return config.reducedMotion;
      return reduceMotionQuery?.matches ?? false;
    },

    isScreenReaderOptimized(): boolean {
      // Heuristic: check if the accessibility tree is actively being read
      return document.documentElement.getAttribute("aria-hidden") !== "true";
    },

    setAriaLabel(element: HTMLElement, label: string): void {
      element.setAttribute("aria-label", label);
    },

    createFocusTrap(trapConfig: FocusTrapConfig): IDisposable {
      const { container, initialFocus, returnFocusOnDeactivate = true } = trapConfig;
      const previousActive = document.activeElement as HTMLElement | null;

      const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };

      container.addEventListener("keydown", handleKeydown);
      (initialFocus ?? container).focus();
      ctx?.emit(AccessibilityEvents.FocusTrap, { container: container.id ?? "unknown" });

      return {
        dispose() {
          container.removeEventListener("keydown", handleKeydown);
          if (returnFocusOnDeactivate) previousActive?.focus();
        },
      };
    },

    focusNext(): void {
      const elements = getFocusableElements();
      const idx = elements.indexOf(document.activeElement as HTMLElement);
      const next = elements[(idx + 1) % elements.length];
      next?.focus();
    },

    focusPrevious(): void {
      const elements = getFocusableElements();
      const idx = elements.indexOf(document.activeElement as HTMLElement);
      const prev = elements[(idx - 1 + elements.length) % elements.length];
      prev?.focus();
    },

    setHighContrast(enabled: boolean): void {
      highContrast = enabled;
      document.documentElement.classList.toggle("high-contrast", enabled);
      ctx?.emit(AccessibilityEvents.HighContrastToggle, { enabled });
    },

    isHighContrast(): boolean {
      return highContrast;
    },
  };

  const plugin: MonacoPlugin = {
    id: "accessibility-module",
    name: "Accessibility Module",
    version: "1.0.0",
    description: "Screen reader support, ARIA management, focus traps, and reduced motion",

    onMount(pluginCtx) {
      ctx = pluginCtx;

      // Listen for OS-level reduced motion changes
      if (reduceMotionQuery) {
        const handler = (e: MediaQueryListEvent) => {
          ctx?.emit(AccessibilityEvents.ReducedMotionToggle, { enabled: e.matches });
        };
        reduceMotionQuery.addEventListener("change", handler);
        disposables.push({ dispose: () => reduceMotionQuery.removeEventListener("change", handler) });
      }

      // Set initial ARIA attributes on editor
      const editorContainer = document.querySelector("[data-editor-container]");
      if (editorContainer) {
        editorContainer.setAttribute("role", "application");
        editorContainer.setAttribute("aria-label", "Code Editor");
      }
    },

    onDispose() {
      for (const d of disposables) d.dispose();
      disposables.length = 0;
      announceEl?.remove();
      announceEl = null;
      ctx = null;
    },
  };

  return { plugin, api };
}
