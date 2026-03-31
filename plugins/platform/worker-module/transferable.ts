// ── Worker Module — Transferable Utilities ─────────────────────

export function isTransferable(obj: unknown): obj is Transferable {
  return (
    obj instanceof ArrayBuffer ||
    obj instanceof MessagePort ||
    (typeof OffscreenCanvas !== "undefined" && obj instanceof OffscreenCanvas)
  );
}

export function extractTransferables(data: unknown): Transferable[] {
  const result: Transferable[] = [];
  const visited = new WeakSet();

  function walk(value: unknown): void {
    if (value == null || typeof value !== "object") return;
    if (visited.has(value as object)) return;
    visited.add(value as object);

    if (isTransferable(value)) {
      result.push(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value as unknown[]) walk(item);
      return;
    }

    for (const key of Object.keys(value as Record<string, unknown>)) {
      walk((value as Record<string, unknown>)[key]);
    }
  }

  walk(data);
  return result;
}
