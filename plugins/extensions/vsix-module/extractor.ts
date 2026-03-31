// ── VSIX Module — Extractor ──────────────────────────────────

import type { VSIXPackage } from "./types";
import { parseVSIXManifest } from "./manifest-parser";

/**
 * Extract a VSIX file (ZIP format) into a VSIXPackage.
 * Uses DecompressionStream when available, otherwise falls back to manual
 * ZIP parsing for the common "stored" (no compression) case.
 */
export class VSIXExtractor {
  /** Extract VSIX buffer into package */
  async extract(buffer: ArrayBuffer): Promise<VSIXPackage> {
    const files = await this.unzip(buffer);

    // Find package.json
    const packageJsonKey = this.findFile(files, "extension/package.json") ?? this.findFile(files, "package.json");
    if (!packageJsonKey) {
      throw new Error("VSIX package missing package.json");
    }

    const decoder = new TextDecoder();
    const packageJsonText = decoder.decode(files.get(packageJsonKey)!);
    const manifest = parseVSIXManifest(packageJsonText);

    return { manifest, files };
  }

  private async unzip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
    const files = new Map<string, Uint8Array>();
    const view = new DataView(buffer);
    let offset = 0;

    while (offset < buffer.byteLength - 4) {
      const signature = view.getUint32(offset, true);

      // Local file header signature
      if (signature !== 0x04034b50) break;

      const compressionMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);

      const nameBytes = new Uint8Array(buffer, offset + 30, nameLength);
      const fileName = new TextDecoder().decode(nameBytes);

      const dataStart = offset + 30 + nameLength + extraLength;
      const dataSize = compressedSize || uncompressedSize;

      if (dataSize > 0 && !fileName.endsWith("/")) {
        const rawData = new Uint8Array(buffer, dataStart, dataSize);

        if (compressionMethod === 8) {
          // Deflate — use DecompressionStream if available
          try {
            const decompressed = await this.inflate(rawData);
            files.set(fileName, decompressed);
          } catch {
            // Store raw if decompression fails
            files.set(fileName, rawData.slice());
          }
        } else {
          // Stored (no compression)
          files.set(fileName, rawData.slice());
        }
      }

      offset = dataStart + dataSize;
    }

    return files;
  }

  private async inflate(data: Uint8Array): Promise<Uint8Array> {
    if ("DecompressionStream" in globalThis) {
      const ds = new DecompressionStream("deflate-raw" as CompressionFormat);
      const writer = ds.writable.getWriter();
      writer.write(data.buffer as ArrayBuffer);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s, c) => s + c.byteLength, 0);
      const result = new Uint8Array(total);
      let off = 0;
      for (const chunk of chunks) {
        result.set(chunk, off);
        off += chunk.byteLength;
      }
      return result;
    }
    // Fallback: return raw data
    return data;
  }

  private findFile(files: Map<string, Uint8Array>, name: string): string | undefined {
    for (const key of files.keys()) {
      if (key === name || key.endsWith(`/${name}`)) return key;
    }
    return undefined;
  }
}
