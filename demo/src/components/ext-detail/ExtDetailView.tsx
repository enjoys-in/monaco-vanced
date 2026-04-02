// ── Extension Detail View — VS Code-style layout ─────────────
// Header + TabBar + (Content left | Sidebar right)

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../theme";
import { MarketplaceEvents, DialogEvents } from "@enjoys/monaco-vanced/core/events";
import type { ExtDetailProps, DetailTab, OpenVSXMetadata } from "./types";
import { ExtDetailHeader } from "./ExtDetailHeader";
import { ExtDetailTabs } from "./ExtDetailTabs";
import { ExtDetailContent } from "./ExtDetailContent";
import { ExtDetailSidebar } from "./ExtDetailSidebar";
import { ExtDetailError } from "./ExtDetailError";

export function ExtDetailView({ extId, extName, eventBus, onInteract, vsixApi }: ExtDetailProps) {
  const { tokens: t } = useTheme();
  const [data, setData] = useState<OpenVSXMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");

  const fetchData = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const doFetch = vsixApi
      ? vsixApi.getMetadata(extId)
      : fetch(`https://open-vsx.org/api/${encodeURIComponent(extId.split(".")[0])}/${encodeURIComponent(extId.split(".").slice(1).join("."))}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));

    doFetch
      .then((d: OpenVSXMetadata) => { if (!cancelled) setData(d); })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        // Also fire a dialog event so the notification system catches it
        eventBus.emit(DialogEvents.Show, {
          type: "error",
          title: "Extension Error",
          message: `Failed to load "${extName || extId}": ${msg}`,
          buttons: [{ label: "Dismiss", value: "dismiss" }],
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [extId, extName, eventBus, vsixApi]);

  useEffect(() => fetchData(), [fetchData]);

  const handleInstall = useCallback(() => {
    setInstalled(true);
    onInteract?.();

    if (vsixApi) {
      // Use VSIX module pipeline: fetch → install
      vsixApi.fetch(extId)
        .then((pkg) => vsixApi.install(pkg))
        .catch((err: unknown) => {
          setInstalled(false);
          eventBus.emit(DialogEvents.Show, {
            type: "error",
            title: "Install Failed",
            message: `Could not install "${extName || extId}": ${err instanceof Error ? err.message : String(err)}`,
            buttons: [{ label: "OK", value: "ok" }],
          });
        });
    }

    eventBus.emit(MarketplaceEvents.InstallStart, { id: extId });
  }, [extId, extName, eventBus, onInteract, vsixApi]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: t.fgDim, fontSize: 13 }}>
        Loading extension details…
      </div>
    );
  }

  if (error || !data) {
    return (
      <ExtDetailError
        error={error || "Unknown error"}
        extId={extId}
        eventBus={eventBus}
        onRetry={fetchData}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <ExtDetailHeader
        data={data}
        installed={installed}
        onInstall={handleInstall}
        onInteract={onInteract}
      />

      {/* Tab bar */}
      <ExtDetailTabs
        activeTab={activeTab}
        onChange={setActiveTab}
        hasChangelog={!!data.files?.changelog}
      />

      {/* Body: content + sidebar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <ExtDetailContent
          data={data}
          activeTab={activeTab}
          onInteract={onInteract}
          fetchText={vsixApi?.fetchText}
        />
        <ExtDetailSidebar data={data} />
      </div>
    </div>
  );
}
