// ── Sidebar Container (React) — multi-view panel switching ───

import { useState, useEffect } from "react";
import { useTheme } from "../theme";
import { SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { MockFsAPI } from "../../mock-fs";
import type { ExplorerIconAPI } from "../../explorer";
import type { ChatIndexerApi } from "../ai-chat/types";
import { ExplorerView } from "../../explorer/ExplorerView";
import { SearchView } from "./SearchView";
import { ScmView } from "./ScmView";
import { DebugView } from "./DebugView";
import { ExtensionsView } from "./ExtensionsView";
import { AccountsView } from "./AccountsView";
import { SettingsRedirect } from "./SettingsRedirect";

interface FileEntry { uri: string; name: string; content: string; language: string }

export interface SidebarProps {
  eventBus: InstanceType<typeof EventBus>;
  files: FileEntry[];
  notificationApi?: { show(opts: { type: string; message: string; duration: number }): void };
  extensionApi?: { enable(id: string): void; disable(id: string): void };
  vsixApi?: { fetch(id: string): Promise<unknown>; install(pkg: unknown): Promise<void>; uninstall(id: string): void; getInstalled(): { name: string; publisher: string }[]; search?(query: string, opts?: Record<string, unknown>): Promise<unknown> };
  marketplaceApi?: { install(id: string): Promise<void> };
  indexerApi?: ChatIndexerApi;
  /** Mock FS for the explorer view */
  mockFs?: MockFsAPI;
  /** Icon API for file/folder icons */
  iconApi?: ExplorerIconAPI;
}

export function SidebarViews({ eventBus, files, notificationApi, extensionApi, vsixApi, marketplaceApi, indexerApi, mockFs, iconApi }: SidebarProps) {
  const { tokens: t } = useTheme();
  const [activeView, setActiveView] = useState("explorer");

  // Wire event bus → view switching
  useEffect(() => {
    const onActivate = (p: unknown) => {
      const { viewId } = p as { viewId: string };
      setActiveView(viewId);
    };
    eventBus.on(SidebarEvents.ViewActivate, onActivate);
    return () => { eventBus.off(SidebarEvents.ViewActivate, onActivate); };
  }, [eventBus]);

  const renderView = () => {
    switch (activeView) {
      case "explorer":
        return mockFs ? (
          <ExplorerView
            fs={mockFs}
            eventBus={eventBus}
            rootLabel="MONACO-VANCED"
            onNotify={(msg, type) => notificationApi?.show({ type: type ?? "info", message: msg, duration: 3000 })}
            iconApi={iconApi}
          />
        ) : (
          <div style={{ padding: 20, color: t.fgDim, fontSize: 12 }}>No filesystem available</div>
        );
      case "search":
        return <SearchView eventBus={eventBus} files={files} notificationApi={notificationApi} indexerApi={indexerApi} />;
      case "scm":
        return <ScmView eventBus={eventBus} files={files} notificationApi={notificationApi} />;
      case "debug":
        return <DebugView eventBus={eventBus} notificationApi={notificationApi} />;
      case "extensions":
        return <ExtensionsView eventBus={eventBus} notificationApi={notificationApi} extensionApi={extensionApi} vsixApi={vsixApi} marketplaceApi={marketplaceApi} />;
      case "accounts":
        return <AccountsView eventBus={eventBus} notificationApi={notificationApi} />;
      case "settings-gear":
        return <SettingsRedirect eventBus={eventBus} />;
      default:
        return <div style={{ padding: 20, color: t.fgDim, fontSize: 12 }}>Unknown view: {activeView}</div>;
    }
  };

  return renderView();
}
