// ── UI Module Types ────────────────────────────────────────

export type ThemeKind = "dark" | "light" | "hc";

export interface ThemeColors {
  readonly foreground: string;
  readonly background: string;
  readonly accent: string;
  readonly border: string;
  readonly inputBackground: string;
  readonly inputForeground: string;
  readonly buttonBackground: string;
  readonly buttonForeground: string;
  readonly errorForeground: string;
  readonly warningForeground: string;
  readonly [key: string]: string;
}

export interface ThemeInfo {
  readonly kind: ThemeKind;
  readonly colors: ThemeColors;
}

// ── Component Types ───────────────────────────────────────

export interface DropdownOption {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
  readonly separator?: boolean;
}

export interface DropdownConfig {
  readonly options: DropdownOption[];
  readonly selectedId?: string;
  readonly placeholder?: string;
  readonly width?: number;
  readonly maxHeight?: number;
}

export interface InputConfig {
  readonly value?: string;
  readonly placeholder?: string;
  readonly type?: "text" | "password" | "number" | "search";
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly maxLength?: number;
  readonly icon?: string;
  readonly validation?: (value: string) => string | null;
}

export interface ModalConfig {
  readonly id: string;
  readonly title: string;
  readonly content?: string;
  readonly width?: number;
  readonly closable?: boolean;
  readonly overlay?: boolean;
  readonly actions?: ModalAction[];
}

export interface ModalAction {
  readonly id: string;
  readonly label: string;
  readonly primary?: boolean;
  readonly danger?: boolean;
  readonly disabled?: boolean;
}

export interface TooltipConfig {
  readonly content: string;
  readonly position?: "top" | "bottom" | "left" | "right";
  readonly delay?: number;
  readonly maxWidth?: number;
}

export interface TreeNode {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly children?: TreeNode[];
  readonly expanded?: boolean;
  readonly selected?: boolean;
  readonly data?: unknown;
}

export interface TreeConfig {
  readonly roots: TreeNode[];
  readonly multiSelect?: boolean;
  readonly showIcons?: boolean;
  readonly indent?: number;
  readonly filter?: string;
}

// ── Focus Trap ────────────────────────────────────────────

export interface FocusTrapConfig {
  readonly containerId: string;
  readonly initialFocusId?: string;
  readonly returnFocusOnDeactivate?: boolean;
}

// ── Plugin Config ─────────────────────────────────────────

export interface UIPluginOptions {
  readonly enableAnimations?: boolean;
  readonly reducedMotion?: boolean;
  readonly enableA11y?: boolean;
}

export interface UIModuleAPI {
  getTheme(): ThemeInfo | null;
  getCSSVariable(name: string): string;
  announceToScreenReader(message: string, priority?: "polite" | "assertive"): void;
  trapFocus(config: FocusTrapConfig): { release: () => void };
  isReducedMotion(): boolean;
}
