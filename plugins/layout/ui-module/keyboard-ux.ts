// ── Keyboard UX Utilities ──────────────────────────────────
// Arrow key navigation, keyboard shortcuts, focus management.

export type Direction = "up" | "down" | "left" | "right";

/**
 * Handle arrow key navigation within a list of items.
 * Returns the new focused index, or -1 if not applicable.
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  currentIndex: number,
  itemCount: number,
  orientation: "vertical" | "horizontal" = "vertical",
): number {
  const upKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const downKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

  if (event.key === upKey) {
    event.preventDefault();
    return currentIndex > 0 ? currentIndex - 1 : itemCount - 1;
  }

  if (event.key === downKey) {
    event.preventDefault();
    return currentIndex < itemCount - 1 ? currentIndex + 1 : 0;
  }

  if (event.key === "Home") {
    event.preventDefault();
    return 0;
  }

  if (event.key === "End") {
    event.preventDefault();
    return itemCount - 1;
  }

  return -1;
}

/**
 * Handle Enter/Space activation on a focused item.
 */
export function handleActivation(
  event: KeyboardEvent,
  onActivate: () => void,
): boolean {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
    return true;
  }
  return false;
}

/**
 * Handle Escape to close/dismiss.
 */
export function handleEscape(
  event: KeyboardEvent,
  onEscape: () => void,
): boolean {
  if (event.key === "Escape") {
    event.preventDefault();
    onEscape();
    return true;
  }
  return false;
}

/**
 * Type-ahead search: match items by typing characters.
 */
export function typeAheadSearch(
  items: { label: string }[],
  buffer: string,
): number {
  const search = buffer.toLowerCase();
  return items.findIndex((item) =>
    item.label.toLowerCase().startsWith(search),
  );
}
