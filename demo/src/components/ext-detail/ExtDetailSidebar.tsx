// ── Extension Detail — Right sidebar (Installation, Marketplace, Categories, Resources) ──

import { memo } from "react";
import { useTheme } from "../theme";
import { formatDate, type OpenVSXMetadata } from "./types";

interface Props {
  data: OpenVSXMetadata;
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens: t } = useTheme();
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: t.fg, marginBottom: 8, letterSpacing: 0.5 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const { tokens: t } = useTheme();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4, gap: 12 }}>
      <span style={{ color: t.fgDim, whiteSpace: "nowrap" }}>{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: t.accent, textDecoration: "none", textAlign: "right", wordBreak: "break-all" }}>
          {value}
        </a>
      ) : (
        <span style={{ color: t.fg, textAlign: "right", wordBreak: "break-all" }}>{value}</span>
      )}
    </div>
  );
}

function Tag({ label }: { label: string }) {
  const { tokens: t } = useTheme();
  return (
    <span style={{
      display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 3,
      background: t.cardBg, color: t.fg, marginRight: 4, marginBottom: 4,
      border: `1px solid ${t.border}`,
    }}>
      {label}
    </span>
  );
}

export const ExtDetailSidebar = memo(function ExtDetailSidebar({ data }: Props) {
  const { tokens: t } = useTheme();

  const ns = data.namespace ?? data.name;
  const extId = `${ns}.${data.name}`;
  const versions = data.allVersions ? Object.keys(data.allVersions) : [];
  const lastUpdated = formatDate(data.timestamp);

  return (
    <div style={{
      width: 260, minWidth: 260, padding: "0 16px", borderLeft: `1px solid ${t.border}`,
      fontSize: 12, overflowY: "auto",
    }}>
      {/* Installation */}
      <SidebarSection title="Installation">
        <InfoRow label="Identifier" value={extId} />
        <InfoRow label="Version" value={data.version || "0.0.0"} />
        <InfoRow label="Last Updated" value={lastUpdated} />
        {versions.length > 1 && <InfoRow label="Versions" value={String(versions.length)} />}
      </SidebarSection>

      {/* Marketplace */}
      <SidebarSection title="Marketplace">
        <InfoRow label="Publisher" value={ns} />
        {data.publishedBy?.loginName && <InfoRow label="Published By" value={data.publishedBy.loginName} />}
        <InfoRow label="License" value={data.license || "—"} />
      </SidebarSection>

      {/* Categories */}
      {data.categories && data.categories.length > 0 && (
        <SidebarSection title="Categories">
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {data.categories.map((c) => <Tag key={c} label={c} />)}
          </div>
        </SidebarSection>
      )}

      {/* Tags */}
      {data.tags && data.tags.length > 0 && (
        <SidebarSection title="Tags">
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {data.tags.map((tag) => <Tag key={tag} label={tag} />)}
          </div>
        </SidebarSection>
      )}

      {/* Resources */}
      <SidebarSection title="Resources">
        {data.repository && <InfoRow label="Repository" value="GitHub" href={data.repository} />}
        {data.bugs && <InfoRow label="Issues" value="Report" href={data.bugs} />}
        {data.homepage && <InfoRow label="Homepage" value="Visit" href={data.homepage} />}
        {data.files?.license && <InfoRow label="License File" value="View" href={data.files.license} />}
        {data.files?.changelog && <InfoRow label="Changelog" value="View" href={data.files.changelog} />}
      </SidebarSection>
    </div>
  );
});
