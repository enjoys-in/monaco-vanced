// ── Sidebar Container (React) — multi-view panel switching ───

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "../theme";
import { SidebarEvents, FileEvents, TabEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
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
  vsixApi?: { fetch(id: string): Promise<unknown>; install(pkg: unknown): Promise<void>; uninstall(id: string): void };
  marketplaceApi?: { install(id: string): Promise<void> };
  indexerApi?: { query(q: { query: string }): { name: string; kind: string; path: string; line: number; column: number }[]; isReady(): boolean };
  /** Explorer element rendered by the vanilla Explorer class — mounted into the explorer view */
  explorerElement?: HTMLElement | null;
}

const VIEW_TITLES: Record<string, string> = {
  explorer: "Explorer", search: "Search", scm: "Source Control",
  debug: "Run and Debug", extensions: "Extensions", accounts: "Accounts",
  "settings-gear": "Settings",
};

export function SidebarViews({ eventBus, files, notificationApi, extensionApi, vsixApi, marketplaceApi, indexerApi, explorerElement }: SidebarProps) {
  const { tokens: t } = useTheme();
  const [activeView, setActiveView] = useState("explorer");
  const explorerRef = useRef<HTMLDivElement>(null);

  // Wire event bus → view switching
  useEffect(() => {
    const onActivate = (p: unknown) => {
      const { viewId } = p as { viewId: string };
      setActiveView(viewId);
    };
    eventBus.on(SidebarEvents.ViewActivate, onActivate);
    return () => { eventBus.off(SidebarEvents.ViewActivate, onActivate); };
  }, [eventBus]);

  // Mount the vanilla DOM explorer element into our ref
  useEffect(() => {
    if (explorerRef.current && explorerElement) {
      explorerRef.current.innerHTML = "";
      explorerRef.current.appendChild(explorerElement);
    }
  }, [explorerElement, activeView]);

  const renderView = () => {
    switch (activeView) {
      case "explorer":
        // Explorer is a vanilla DOM element, mounted via ref
        return <div ref={explorerRef} style={{ height: "100%", overflowY: "auto" }} />;
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
