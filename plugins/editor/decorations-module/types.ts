// ── Decorations-module types ────────────────────────────────
import type * as monacoNs from "monaco-editor";

export type DecorationType =
  | "highlight"
  | "gutter-icon"
  | "inline-text"
  | "line-background"
  | "border"
  | "custom";

export interface DecorationConfig {
  id: string;
  type: DecorationType;
  /** CSS class applied to the decoration */
  className?: string;
  /** Gutter icon path (for gutter-icon type) */
  glyphMarginClassName?: string;
  /** Inline text content (for inline-text type) */
  afterContentClassName?: string;
  /** Background color class (for line-background type) */
  lineBackgroundClassName?: string;
  /** Hover message */
  hoverMessage?: monacoNs.IMarkdownString;
  /** Whether this decoration is applied to a whole line */
  isWholeLine?: boolean;
  /** Stickiness behavior */
  stickiness?: monacoNs.editor.TrackedRangeStickiness;
}

export interface DecorationEntry {
  id: string;
  config: DecorationConfig;
  ranges: monacoNs.IRange[];
  decorationIds: string[];
}
