// ── Accessibility Module — Types ──────────────────────────────

import type { IDisposable } from "@core/types";

export type AriaLive = "off" | "polite" | "assertive";

export interface FocusTrapConfig {
  container: HTMLElement;
  initialFocus?: HTMLElement;
  returnFocusOnDeactivate?: boolean;
}

export interface AccessibilityConfig {
  announceDelay?: number;
  reducedMotion?: boolean;
}

export interface AccessibilityModuleAPI {
  /** Announce a message to screen readers */
  announce(message: string, priority?: AriaLive): void;
  /** Check if reduced motion is preferred */
  prefersReducedMotion(): boolean;
  /** Check if a screen reader is likely active */
  isScreenReaderOptimized(): boolean;
  /** Set ARIA attributes on the editor container */
  setAriaLabel(element: HTMLElement, label: string): void;
  /** Create a focus trap within a container */
  createFocusTrap(config: FocusTrapConfig): IDisposable;
  /** Move focus to the next focusable element in sequence */
  focusNext(): void;
  /** Move focus to the previous focusable element */
  focusPrevious(): void;
  /** Enable/disable high-contrast mode */
  setHighContrast(enabled: boolean): void;
  /** Check if high-contrast mode is active */
  isHighContrast(): boolean;
}
