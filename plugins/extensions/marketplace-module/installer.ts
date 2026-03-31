// ── Marketplace Module — Extension Installer ─────────────────

export interface InstallProgress {
  phase: "downloading" | "extracting" | "validating" | "installing" | "complete";
  progress: number; // 0-100
}

export class ExtensionInstaller {
  private progressHandlers: Array<(progress: InstallProgress) => void> = [];

  /** Register a progress handler */
  onProgress(handler: (progress: InstallProgress) => void): void {
    this.progressHandlers.push(handler);
  }

  /** Download a package from a URL */
  async download(url: string): Promise<ArrayBuffer> {
    this.emitProgress("downloading", 0);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const reader = response.body?.getReader();

    if (!reader) {
      this.emitProgress("downloading", 100);
      return response.arrayBuffer();
    }

    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (contentLength > 0) {
        this.emitProgress("downloading", Math.round((received / contentLength) * 100));
      }
    }

    this.emitProgress("downloading", 100);
    return this.mergeChunks(chunks);
  }

  /** Extract a package (stub — actual extraction delegated to VSIX extractor) */
  async extract(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
    this.emitProgress("extracting", 0);
    // Simple extraction: treat as single file for non-VSIX packages
    const files = new Map<string, Uint8Array>();
    files.set("package", new Uint8Array(buffer));
    this.emitProgress("extracting", 100);
    return files;
  }

  /** Validate extracted files */
  async validate(files: Map<string, Uint8Array>): Promise<boolean> {
    this.emitProgress("validating", 0);
    const valid = files.size > 0;
    this.emitProgress("validating", 100);
    return valid;
  }

  /** Install into the extension store */
  async install(extensionId: string, files: Map<string, Uint8Array>): Promise<void> {
    this.emitProgress("installing", 0);

    // Store in Cache Storage for persistence
    if ("caches" in globalThis) {
      const cache = await caches.open("monaco-extensions");
      for (const [name, data] of files) {
        const response = new Response(data.buffer as ArrayBuffer, {
          headers: { "Content-Type": "application/octet-stream" },
        });
        await cache.put(`/extensions/${extensionId}/${name}`, response);
      }
    }

    this.emitProgress("installing", 100);
    this.emitProgress("complete", 100);
  }

  private emitProgress(phase: InstallProgress["phase"], progress: number): void {
    const event: InstallProgress = { phase, progress };
    for (const handler of this.progressHandlers) {
      try {
        handler(event);
      } catch {
        // ignore handler errors
      }
    }
  }

  private mergeChunks(chunks: Uint8Array[]): ArrayBuffer {
    const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result.buffer;
  }
}
