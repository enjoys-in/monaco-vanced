// ── Extension Detail — Tab bar (Details / Features / Changelog) ──

import { memo } from "react";
import { useTheme } from "../theme";
import type { DetailTab } from "./types";

interface Props {
  activeTab: DetailTab;
  onChange: (tab: DetailTab) => void;
  hasChangelog: boolean;
}

const TABS: { id: DetailTab; label: string }[] = [
  { id: "details", label: "DETAILS" },
  { id: "features", label: "FEATURES" },
  { id: "changelog", label: "CHANGELOG" },
];

export const ExtDetailTabs = memo(function ExtDetailTabs({ activeTab, onChange, hasChangelog }: Props) {
  const { tokens: t } = useTheme();
  const visibleTabs = hasChangelog ? TABS : TABS.filter((tab) => tab.id !== "changelog");

  return (
    <div style={{
      display: "flex", gap: 0, borderBottom: `1px solid ${t.border}`,
      padding: "0 24px", fontSize: 12,
    }}>
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "8px 16px", color: activeTab === tab.id ? t.fg : t.fgDim,
            borderBottom: activeTab === tab.id ? `2px solid ${t.accent}` : "2px solid transparent",
            fontWeight: activeTab === tab.id ? 600 : 400,
            fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
});
