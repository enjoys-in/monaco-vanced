// ── Audio preview provider ──────────────────────────────────
// Custom controls with Web Audio API waveform visualization.
import type { PreviewProvider, PreviewFile } from "../types";

export const audioProvider: PreviewProvider = {
  id: "audio",
  extensions: [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".webm"],
  mimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"],
  toolbarActions: [
    { id: "play-pause", icon: "play", tooltip: "Play/Pause" },
    { id: "speed", icon: "speed", tooltip: "Playback Speed" },
    { id: "loop", icon: "loop", tooltip: "Loop", toggle: true },
    { id: "volume", icon: "volume", tooltip: "Volume" },
  ],

  async render(file: PreviewFile): Promise<string> {
    const data = typeof file.content === "string" ? file.content : file.content as unknown as BlobPart;
    const src = file.objectUrl ?? URL.createObjectURL(
      new Blob([data]),
    );

    return /* html */ `
      <div class="preview-audio" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px;">
        <div style="font-size: 14px; color: #888;">${file.name} (${formatSize(file.size)})</div>
        <audio controls src="${src}" style="width: 80%; max-width: 600px;"></audio>
      </div>
    `;
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
