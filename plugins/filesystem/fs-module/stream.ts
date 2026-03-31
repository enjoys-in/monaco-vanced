// ── FS Module — Streaming / Chunked Transfer ─────────────────
// Helpers for chunked upload/download with progress tracking.

import type { ProgressCallback } from "./types";

/** Default chunk size: 1 MB */
const DEFAULT_CHUNK_SIZE = 1024 * 1024;

/**
 * Split data into chunks and call writer for each chunk,
 * reporting progress via callback.
 */
export async function chunkedUpload(
  data: Uint8Array,
  writer: (chunk: Uint8Array, offset: number) => Promise<void>,
  onProgress?: ProgressCallback,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): Promise<void> {
  const total = data.byteLength;
  let offset = 0;

  while (offset < total) {
    const end = Math.min(offset + chunkSize, total);
    const chunk = data.slice(offset, end);
    await writer(chunk, offset);
    offset = end;
    onProgress?.(offset, total);
  }
}

/**
 * Read data in chunks from a reader function,
 * reporting progress via callback.
 */
export async function chunkedDownload(
  totalSize: number,
  reader: (offset: number, length: number) => Promise<Uint8Array>,
  onProgress?: ProgressCallback,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let offset = 0;

  while (offset < totalSize) {
    const length = Math.min(chunkSize, totalSize - offset);
    const chunk = await reader(offset, length);
    chunks.push(chunk);
    offset += chunk.byteLength;
    onProgress?.(offset, totalSize);
  }

  return mergeChunks(chunks, totalSize);
}

/** Merge multiple Uint8Array chunks into a single buffer */
export function mergeChunks(chunks: Uint8Array[], totalSize?: number): Uint8Array {
  const size = totalSize ?? chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
