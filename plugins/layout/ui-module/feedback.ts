// ── Visual Feedback Utilities ──────────────────────────────
// Ripple effects, highlight flashes, shake animations.

/**
 * Flash highlight on an element (e.g., after a find/replace match).
 */
export function flashHighlight(
  element: HTMLElement,
  color = "rgba(255, 255, 0, 0.3)",
  durationMs = 600,
): void {
  const original = element.style.backgroundColor;
  element.style.transition = `background-color ${durationMs}ms ease`;
  element.style.backgroundColor = color;
  setTimeout(() => {
    element.style.backgroundColor = original;
    setTimeout(() => {
      element.style.transition = "";
    }, durationMs);
  }, durationMs);
}

/**
 * Shake animation for invalid input.
 */
export function shake(element: HTMLElement, durationMs = 300): void {
  const keyframes = [
    { transform: "translateX(0)" },
    { transform: "translateX(-4px)" },
    { transform: "translateX(4px)" },
    { transform: "translateX(-4px)" },
    { transform: "translateX(4px)" },
    { transform: "translateX(0)" },
  ];

  if (typeof element.animate === "function") {
    element.animate(keyframes, { duration: durationMs, easing: "ease-in-out" });
  }
}

/**
 * Pulse scale effect (e.g., on button press).
 */
export function pulse(element: HTMLElement, scale = 0.95, durationMs = 150): void {
  const keyframes = [
    { transform: "scale(1)" },
    { transform: `scale(${scale})` },
    { transform: "scale(1)" },
  ];

  if (typeof element.animate === "function") {
    element.animate(keyframes, { duration: durationMs, easing: "ease-in-out" });
  }
}
