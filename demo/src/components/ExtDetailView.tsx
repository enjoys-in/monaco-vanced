// ── Extension Detail View (React) — shows extension info from Open VSX ──

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "./theme";
import { MarketplaceEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";

const OPENVSX = "https://open-vsx.org/";

interface Props {
  extId: string;
  extName: string;
  eventBus: InstanceType<typeof EventBus>;
  /** Whether user has interacted with this detail (scrolled, clicked install, etc.) */
  onInteract?: () => void;
}

interface ExtData {
  displayName?: string;
  namespace?: string;
  version?: string;
  description?: string;
  downloadCount?: number;
  license?: string;
  categories?: string[];
  files?: { icon?: string; readme?: string };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function simpleMarkdown(md: string): string {
  let html = md
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      return `<pre style="background:var(--vsc-card-bg);border:1px solid var(--vsc-border);border-radius:6px;padding:12px;overflow-x:auto;font-size:12px;font-family:'JetBrains Mono','Fira Code',monospace;"><code>${esc(code)}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, `<code style="background:var(--vsc-card-bg);padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>`)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:8px 0;" />`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener" style="color:var(--vsc-text-link);">$1</a>`)
    .replace(/^#### (.+)$/gm, `<h4 style="font-size:14px;font-weight:600;margin:16px 0 8px;color:var(--vsc-fg);">$1</h4>`)
    .replace(/^### (.+)$/gm, `<h3 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:var(--vsc-fg);">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 style="font-size:17px;font-weight:600;margin:24px 0 10px;color:var(--vsc-fg);">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 style="font-size:20px;font-weight:600;margin:28px 0 12px;color:var(--vsc-fg);">$1</h1>`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid var(--vsc-border);margin:16px 0;" />`)
    .replace(/^[*-] (.+)$/gm, `<li style="margin-left:20px;margin-bottom:4px;">$1</li>`)
    .replace(/\n{2,}/g, "</p><p style=\"margin:8px 0;\">")
    .replace(/\n/g, "<br/>");
  return `<p style="margin:8px 0;">${html}</p>`;
}

export function ExtDetailView({ extId, extName, eventBus, onInteract }: Props) {
  const { tokens: t } = useTheme();
  const [data, setData] = useState<ExtData | null>(null);
  const [readme, setReadme] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);

  const [ns, name] = extId.includes(".") ? extId.split(".", 2) : ["unknown", extId];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${OPENVSX}/api/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: ExtData) => {
        if (cancelled) return;
        setData(d);
        // Fetch README
        if (d.files?.readme) {
          fetch(d.files.readme)
            .then((r) => (r.ok ? r.text() : ""))
            .then((md) => { if (!cancelled) setReadme(md); })
            .catch(() => { if (!cancelled) setReadme(null); });
        }
      })
      .catch((err) => { if (!cancelled) setError((err as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ns, name]);

  const handleInstall = useCallback(() => {
    setInstalled(true);
    onInteract?.();
    eventBus.emit(MarketplaceEvents.InstallStart, { id: extId });
  }, [extId, eventBus, onInteract]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.fgDim, fontSize: 13 }}>
        Loading extension details…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: t.fgDim, fontSize: 13, gap: 8 }}>
        <div style={{ color: t.errorRed }}>Failed to load extension details</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const dl = data.downloadCount ?? 0;
  const dlStr = dl >= 1_000_000 ? `${(dl / 1_000_000).toFixed(1)}M` : dl >= 1_000 ? `${(dl / 1_000).toFixed(0)}K` : String(dl);
  const cats = (data.categories || []).join(", ") || "—";
  const license = data.license || "—";

  return (
    <div style={{ overflowY: "auto", height: "100%" }} onScroll={onInteract}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, minWidth: 64, borderRadius: 10, overflow: "hidden",
            background: t.cardBg, display: "flex", alignItems: "center", justifyContent: "center",
            ...(!data.files?.icon ? { fontSize: 28, fontWeight: 700, color: t.accent } : {}),
          }}>
            {data.files?.icon ? (
              <img
                src={data.files.icon} width={64} height={64}
                style={{ objectFit: "cover", borderRadius: 10 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                alt=""
              />
            ) : (
              (data.displayName || name).charAt(0).toUpperCase()
            )}
          </div>

          {/* Meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: t.fg, marginBottom: 4 }}>
              {data.displayName || name}
            </div>
            <div style={{ fontSize: 12, color: t.fgDim, marginBottom: 6 }}>
              {ns} · v{data.version || "0.0.0"}
            </div>
            <div style={{ fontSize: 13, color: t.fgDim, lineHeight: 1.4 }}>
              {data.description || ""}
            </div>
          </div>

          {/* Install button */}
          <button
            className={`vsc-btn ${installed ? "vsc-btn-secondary" : "vsc-btn-primary"}`}
            style={{ flexShrink: 0, fontSize: 12, padding: "6px 18px", marginTop: 4 }}
            disabled={installed}
            onClick={handleInstall}
          >
            {installed ? "Installed" : "Install"}
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: 20, padding: "12px 0",
          borderTop: `1px solid ${t.border}`, borderBottom: `1px solid ${t.border}`,
          marginBottom: 20, fontSize: 12, color: t.fgDim,
        }}>
          <span><strong>Downloads:</strong> {dlStr}</span>
          <span><strong>License:</strong> {license}</span>
          <span><strong>Categories:</strong> {cats}</span>
        </div>

        {/* README */}
        <div
          className="ext-detail-readme"
          style={{ fontSize: 13, lineHeight: 1.6, color: t.fg }}
          dangerouslySetInnerHTML={{
            __html: readme ? simpleMarkdown(readme) : `<p>${esc(data.description || "No additional details available.")}</p>`,
          }}
        />
      </div>
    </div>
  );
}
