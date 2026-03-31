// ── UI Module ──────────────────────────────────────────────
// Shared UI utilities: theme bridge, accessibility, animations,
// keyboard UX, and headless component state managers.

import type { MonacoPlugin, PluginContext } from "@core/types";
import { UiEvents } from "@core/events";
import type { FocusTrapConfig, ThemeInfo, UIModuleAPI, UIPluginOptions } from "./types";
import { ThemeBridge } from "./theme-bridge";
import { announceToScreenReader, trapFocus } from "./a11y";
import { isReducedMotion } from "./animations";

export function createUIPlugin(
  _options: UIPluginOptions = {},
): { plugin: MonacoPlugin; api: UIModuleAPI } {
  const themeBridge = new ThemeBridge();
  let ctx: PluginContext | null = null;

  const api: UIModuleAPI = {
    getTheme(): ThemeInfo | null {
      return themeBridge.getTheme();
    },

    getCSSVariable(name: string): string {
      return themeBridge.getCSSVariable(name);
    },

    announceToScreenReader(message: string, priority?: "polite" | "assertive"): void {
      announceToScreenReader(message, priority);
    },

    trapFocus(config: FocusTrapConfig): { release: () => void } {
      return trapFocus(config);
    },

    isReducedMotion(): boolean {
      return isReducedMotion();
    },
  };

  const plugin: MonacoPlugin = {
    id: "ui-module",
    name: "UI Module",
    version: "1.0.0",
    description: "Shared UI utilities: theme bridge, accessibility, animations, components",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;

      // Listen for theme changes
      ctx.addDisposable(
        ctx.on(UiEvents.ThemeChange, (data) => {
          const theme = data as ThemeInfo;
          themeBridge.applyTheme(theme);
        }),
      );

      // Listen for fullscreen toggle
      ctx.addDisposable(
        ctx.on(UiEvents.FullscreenToggle, () => {
          if (typeof document === "undefined") return;
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          } else {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        }),
      );
    },

    onDispose(): void {
      themeBridge.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}

// ── Re-exports ─────────────────────────────────────────────

export type {
  UIModuleAPI,
  UIPluginOptions,
  ThemeInfo,
  ThemeKind,
  ThemeColors,
  FocusTrapConfig,
  DropdownOption,
  DropdownConfig,
  InputConfig,
  ModalConfig,
  ModalAction,
  TooltipConfig,
  TreeNode,
  TreeConfig,
} from "./types";

export { ThemeBridge } from "./theme-bridge";
export { announceToScreenReader, trapFocus, setAriaAttributes } from "./a11y";
export { isReducedMotion, getTransitionDuration, buildTransition, animate } from "./animations";
export { flashHighlight, shake, pulse } from "./feedback";
export {
  handleArrowNavigation,
  handleActivation,
  handleEscape,
  typeAheadSearch,
  type Direction,
} from "./keyboard-ux";

// Components
export { DropdownState } from "./components/dropdown";
export { InputState, createDebouncedHandler } from "./components/input";
export { ModalState, createConfirmModal, createDangerModal } from "./components/modal";
export { TooltipManager, type TooltipState } from "./components/tooltip";
export { TreeState } from "./components/tree";
