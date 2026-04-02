// ── Extension Detail — Header (icon, name, buttons) ──────────

import { memo } from "react";
import { useTheme } from "../theme";
import { formatDownloads, formatRating, type OpenVSXMetadata } from "./types";

interface Props {
  data: OpenVSXMetadata;
  installed: boolean;
  onInstall: () => void;
  onInteract?: () => void;
}

export const ExtDetailHeader = memo(function ExtDetailHeader({ data, installed, onInstall, onInteract }: Props) {
  const { tokens: t } = useTheme();
  const ns = data.namespace ?? data.name;
  const displayName = data.displayName || data.name;
  const dlStr = formatDownloads(data.downloadCount ?? 0);
  const ratingStr = formatRating(data.averageRating, data.reviewCount);

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 24px 16px" }}>
      {/* Icon */}
      <div style={{
        width: 128, height: 128, minWidth: 128, borderRadius: 6, overflow: "hidden",
        background: t.cardBg, display: "flex", alignItems: "center", justifyContent: "center",
        ...(!data.files?.icon ? { fontSize: 48, fontWeight: 700, color: t.accent } : {}),
      }}>
        {data.files?.icon ? (
          <img
            src={data.files.icon} width={128} height={128}
            style={{ objectFit: "cover" }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              el.parentElement!.textContent = displayName.charAt(0).toUpperCase();
            }}
            alt=""
          />
        ) : (
          displayName.charAt(0).toUpperCase()
        )}
      </div>

      {/* Meta column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 600, color: t.fg, lineHeight: 1.2 }}>
          {displayName}
        </div>
        <div style={{ fontSize: 12, color: t.fgDim, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{ns}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span title="Downloads">⬇ {dlStr}</span>
          <span style={{ opacity: 0.5 }}>|</span>
          <span title="Rating">{ratingStr}</span>
        </div>
        <div style={{ fontSize: 13, color: t.fgDim, lineHeight: 1.4, marginTop: 4 }}>
          {data.description || ""}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            className={`vsc-btn ${installed ? "vsc-btn-secondary" : "vsc-btn-primary"}`}
            style={{ fontSize: 12, padding: "5px 16px" }}
            disabled={installed}
            onClick={() => { onInstall(); onInteract?.(); }}
          >
            {installed ? "Installed" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
});
