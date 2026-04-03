// ── Extension Detail — Content area (README, Features, Changelog) ──

import { useState, useEffect, memo } from "react";
import { useTheme } from "../theme";
import type { DetailTab, OpenVSXMetadata } from "./types";

// ── Inject markdown styles once ──────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("ext-readme-css")) {
  const css = document.createElement("style");
  css.id = "ext-readme-css";
  css.textContent = `
    .ext-detail-readme h1, .ext-detail-readme h2, .ext-detail-readme h3,
    .ext-detail-readme h4, .ext-detail-readme h5, .ext-detail-readme h6 {
      margin-top: 24px; margin-bottom: 12px; font-weight: 600; line-height: 1.25;
      color: var(--vsc-fg-bright);
    }
    .ext-detail-readme h1 { font-size: 1.6em; padding-bottom: 8px; border-bottom: 1px solid var(--vsc-border); }
    .ext-detail-readme h2 { font-size: 1.35em; padding-bottom: 6px; border-bottom: 1px solid var(--vsc-border); }
    .ext-detail-readme h3 { font-size: 1.15em; }
    .ext-detail-readme p { margin: 0 0 12px; }
    .ext-detail-readme a { color: var(--vsc-text-link); text-decoration: none; }
    .ext-detail-readme a:hover { text-decoration: underline; }
    .ext-detail-readme img { max-width: 100%; border-radius: 4px; margin: 8px 0; }
    .ext-detail-readme code {
      padding: 2px 6px; border-radius: 3px; font-size: 0.9em;
      background: var(--vsc-input-bg); color: var(--vsc-fg); font-family: 'JetBrains Mono','Fira Code',monospace;
    }
    .ext-detail-readme pre {
      padding: 12px 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0;
      background: var(--vsc-input-bg); border: 1px solid var(--vsc-border);
    }
    .ext-detail-readme pre code { padding: 0; background: none; font-size: 13px; }
    .ext-detail-readme ul, .ext-detail-readme ol { padding-left: 24px; margin: 8px 0 12px; }
    .ext-detail-readme li { margin: 4px 0; }
    .ext-detail-readme blockquote {
      margin: 12px 0; padding: 8px 16px; border-left: 3px solid var(--vsc-accent);
      background: var(--vsc-card-bg); border-radius: 0 4px 4px 0; color: var(--vsc-fg-dim);
    }
    .ext-detail-readme table { border-collapse: collapse; margin: 12px 0; width: 100%; }
    .ext-detail-readme th, .ext-detail-readme td {
      padding: 6px 12px; border: 1px solid var(--vsc-border); text-align: left;
    }
    .ext-detail-readme th { background: var(--vsc-card-bg); font-weight: 600; }
    .ext-detail-readme hr { border: none; border-top: 1px solid var(--vsc-border); margin: 20px 0; }
  `;
  document.head.appendChild(css);
}

interface Props {
  data: OpenVSXMetadata;
  activeTab: DetailTab;
  onInteract?: () => void;
  fetchText?: (url: string) => Promise<string>;
}

/** Lazy-load marked for proper GFM rendering */
async function renderMarkdown(md: string): Promise<string> {
  try {
    const { marked } = await import("marked");
    return marked.parse(md, { gfm: true, breaks: true }) as string;
  } catch {
    // Fallback: return escaped text with basic line breaks
    return md
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
  }
}

export const ExtDetailContent = memo(function ExtDetailContent({ data, activeTab, onInteract, fetchText }: Props) {
  const { tokens: t } = useTheme();
  const [readmeHtml, setReadmeHtml] = useState<string | null>(null);
  const [changelogHtml, setChangelogHtml] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Fetch and render README
  useEffect(() => {
    if (!data.files?.readme) {
      setReadmeHtml(null);
      return;
    }
    let cancelled = false;
    setLoadingContent(true);

    const doFetch = fetchText
      ? fetchText(data.files.readme)
      : fetch(data.files.readme).then((r) => (r.ok ? r.text() : ""));

    doFetch
      .then((md) => (cancelled ? Promise.resolve("") : renderMarkdown(md)))
      .then((html) => { if (!cancelled) setReadmeHtml(html); })
      .catch(() => { if (!cancelled) setReadmeHtml(null); })
      .finally(() => { if (!cancelled) setLoadingContent(false); });

    return () => { cancelled = true; };
  }, [data.files?.readme, fetchText]);

  // Fetch and render changelog
  useEffect(() => {
    if (!data.files?.changelog) {
      setChangelogHtml(null);
      return;
    }
    let cancelled = false;

    const doFetch = fetchText
      ? fetchText(data.files.changelog)
      : fetch(data.files.changelog).then((r) => (r.ok ? r.text() : ""));

    doFetch
      .then((md) => (cancelled ? Promise.resolve("") : renderMarkdown(md)))
      .then((html) => { if (!cancelled) setChangelogHtml(html); })
      .catch(() => { if (!cancelled) setChangelogHtml(null); });

    return () => { cancelled = true; };
  }, [data.files?.changelog, fetchText]);

  const baseStyle: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: "16px 24px",
    fontSize: 13, lineHeight: 1.6, color: t.fg,
  };

  if (activeTab === "details") {
    if (loadingContent) {
      return (
        <div style={{ ...baseStyle, display: "flex", alignItems: "center", justifyContent: "center", color: t.fgDim }}>
          Loading README…
        </div>
      );
    }
    return (
      <div style={baseStyle} onScroll={onInteract} className="ext-detail-readme">
        {readmeHtml ? (
          <div dangerouslySetInnerHTML={{ __html: readmeHtml }} />
        ) : (
          <p style={{ color: t.fgDim }}>{data.description || "No additional details available."}</p>
        )}
      </div>
    );
  }

  if (activeTab === "features") {
    return (
      <div style={baseStyle} onScroll={onInteract}>
        <FeaturesSection data={data} />
      </div>
    );
  }

  if (activeTab === "changelog") {
    return (
      <div style={baseStyle} onScroll={onInteract} className="ext-detail-readme">
        {changelogHtml ? (
          <div dangerouslySetInnerHTML={{ __html: changelogHtml }} />
        ) : (
          <p style={{ color: t.fgDim }}>No changelog available.</p>
        )}
      </div>
    );
  }

  return null;
});

// ── Features sub-section ─────────────────────────────────────

function FeaturesSection({ data }: { data: OpenVSXMetadata }) {
  const { tokens: t } = useTheme();
  const cats = data.categories ?? [];
  const tags = data.tags ?? [];

  return (
    <div>
      {cats.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.fg, marginBottom: 8 }}>Categories</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cats.map((c) => (
              <span key={c} style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 3,
                background: t.cardBg, color: t.fg, border: `1px solid ${t.border}`,
              }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.fg, marginBottom: 8 }}>Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {tags.map((tag) => (
              <span key={tag} style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 3,
                background: t.cardBg, color: t.fgDim, border: `1px solid ${t.border}`,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.fg, marginBottom: 8 }}>Extension Details</div>
        <table style={{ fontSize: 12, color: t.fgDim, borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={{ padding: "4px 16px 4px 0", color: t.fgDim }}>Identifier</td><td style={{ color: t.fg }}>{data.namespace}.{data.name}</td></tr>
            <tr><td style={{ padding: "4px 16px 4px 0", color: t.fgDim }}>Version</td><td style={{ color: t.fg }}>{data.version}</td></tr>
            <tr><td style={{ padding: "4px 16px 4px 0", color: t.fgDim }}>License</td><td style={{ color: t.fg }}>{data.license || "—"}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
