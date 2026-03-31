// ── Animation Utilities ────────────────────────────────────
// Transition helpers with reduced motion support.

/**
 * Check if user prefers reduced motion.
 */
export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Get transition duration — returns 0 if reduced motion is preferred.
 */
export function getTransitionDuration(
  durationMs: number,
  forceAnimate?: boolean,
): number {
  if (!forceAnimate && isReducedMotion()) return 0;
  return durationMs;
}

/**
 * CSS transition string builder.
 */
export function buildTransition(
  properties: string[],
  durationMs: number,
  easing = "ease",
  forceAnimate?: boolean,
): string {
  const duration = getTransitionDuration(durationMs, forceAnimate);
  if (duration === 0) return "none";
  return properties
    .map((prop) => `${prop} ${duration}ms ${easing}`)
    .join(", ");
}

/**
 * Simple requestAnimationFrame-based animation helper.
 */
export function animate(
  durationMs: number,
  onFrame: (progress: number) => void,
  onComplete?: () => void,
): { cancel: () => void } {
  const effectiveDuration = getTransitionDuration(durationMs);
  if (effectiveDuration === 0) {
    onFrame(1);
    onComplete?.();
    return { cancel: () => {} };
  }

  const start = performance.now();
  let cancelled = false;

  function frame(now: number): void {
    if (cancelled) return;
    const elapsed = now - start;
    const progress = Math.min(elapsed / effectiveDuration, 1);
    onFrame(progress);
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete?.();
    }
  }

  requestAnimationFrame(frame);

  return {
    cancel() {
      cancelled = true;
    },
  };
}
