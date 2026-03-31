// ── Video preview provider ──────────────────────────────────
// Custom controls, PiP, fullscreen support.
import type { PreviewProvider, PreviewFile } from "../types";

export const videoProvider: PreviewProvider = {
  id: "video",
  extensions: [".mp4", ".webm", ".mov", ".ogg"],
  mimeTypes: ["video/mp4", "video/webm", "video/ogg"],
  toolbarActions: [
    { id: "play-pause", icon: "play", tooltip: "Play/Pause" },
    { id: "speed", icon: "speed", tooltip: "Playback Speed" },
    { id: "pip", icon: "pip", tooltip: "Picture-in-Picture" },
    { id: "fullscreen", icon: "fullscreen", tooltip: "Fullscreen" },
  ],

  async render(file: PreviewFile): Promise<string> {
    const data = typeof file.content === "string" ? file.content : file.content as unknown as BlobPart;
    const src = file.objectUrl ?? URL.createObjectURL(
      new Blob([data]),
    );

    return /* html */ `
      <div class="preview-video" style="display: flex; align-items: center; justify-content: center; height: 100%; background: #000;">
        <video controls src="${src}" style="max-width: 100%; max-height: 100%;"></video>
      </div>
    `;
  },
};
