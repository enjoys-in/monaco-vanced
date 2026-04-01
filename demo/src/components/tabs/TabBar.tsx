// ── TabBar — container with state management + event wiring ──

import { useState, useEffect, useCallback, useRef } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { TabEvents, FileEvents, LayoutEvents, SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import { useTheme } from "../theme";
import { Tab } from "./Tab";
import { TabContextMenu, type MenuItemDef } from "./TabContextMenu";
import type { ExplorerIconAPI } from "../../explorer";

// ── Types ────────────────────────────────────────────────────

interface TabEntry {
  uri: string;
  label: string;
  dirty: boolean;
  pinned: boolean;
  isSpecial: boolean;
  deleted: boolean;
}

interface CtxMenuState { x: number; y: number; uri: string }

export interface TabBarProps {
  eventBus: InstanceType<typeof EventBus>;
  iconApi?: ExplorerIconAPI;
  onActiveChange?: (uri: string | null, label: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function TabBar({ eventBus, iconApi, onActiveChange }: TabBarProps) {
  const { tokens: t } = useTheme();
  const [tabs, setTabs] = useState<TabEntry[]>([]);
  const [activeUri, setActiveUri] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const tabsRef = useRef(tabs);
  const activeRef = useRef(activeUri);
  tabsRef.current = tabs;
  activeRef.current = activeUri;

  // ── Title sync ─────────────────────────────────────────────

  useEffect(() => {
    const tab = tabs.find((t) => t.uri === activeUri);
    const label = tab?.label ?? "Antigravity";
    onActiveChange?.(activeUri, label);
    document.title = activeUri
      ? `${label} — Antigravity — Monaco Vanced`
      : "Antigravity — Monaco Vanced";
  }, [activeUri, tabs, onActiveChange]);

  // ── Actions ────────────────────────────────────────────────

  const openTab = useCallback((uri: string, label?: string, isSpecial = false) => {
    setTabs((prev) => {
      if (prev.some((t) => t.uri === uri)) return prev;
      const name = label ?? uri.split("/").pop() ?? uri;
      return [...prev, { uri, label: name, dirty: false, pinned: false, isSpecial, deleted: false }];
    });
    setActiveUri(uri);
  }, []);

  const activateTab = useCallback((uri: string) => setActiveUri(uri), []);

  const closeTab = useCallback(
    (uri: string) => {
      const cur = tabsRef.current;
      const idx = cur.findIndex((t) => t.uri === uri);
      if (idx < 0) return;
      const next = cur.filter((t) => t.uri !== uri);
      setTabs(next);

      if (activeRef.current === uri) {
        if (next.length > 0) {
          const i = Math.min(idx, next.length - 1);
          const t = next[i];
          setActiveUri(t.uri);
          if (t.isSpecial) eventBus.emit("tab:switch-special", { uri: t.uri, label: t.label });
          else eventBus.emit(FileEvents.Open, { uri: t.uri, label: t.label });
        } else {
          setActiveUri(null);
          eventBus.emit("welcome:show", {});
        }
      }
    },
    [eventBus],
  );

  const closeOthers = useCallback((keepUri: string) => {
    setTabs((prev) => prev.filter((t) => t.uri === keepUri));
    setActiveUri(keepUri);
  }, []);

  const closeToRight = useCallback((uri: string) => {
    const cur = tabsRef.current;
    const idx = cur.findIndex((t) => t.uri === uri);
    if (idx < 0) return;
    const next = cur.slice(0, idx + 1);
    setTabs(next);
    if (!next.some((t) => t.uri === activeRef.current)) setActiveUri(uri);
  }, []);

  const closeToLeft = useCallback((uri: string) => {
    const cur = tabsRef.current;
    const idx = cur.findIndex((t) => t.uri === uri);
    if (idx < 0) return;
    const next = cur.slice(idx);
    setTabs(next);
    if (!next.some((t) => t.uri === activeRef.current)) setActiveUri(uri);
  }, []);

  const closeSaved = useCallback(() => {
    const next = tabsRef.current.filter((t) => t.dirty);
    setTabs(next);
    if (next.length === 0) {
      setActiveUri(null);
      eventBus.emit("welcome:show", {});
    } else if (!next.some((t) => t.uri === activeRef.current)) {
      setActiveUri(next[next.length - 1].uri);
    }
  }, [eventBus]);

  const closeAll = useCallback(() => {
    setTabs([]);
    setActiveUri(null);
    eventBus.emit("welcome:show", {});
  }, [eventBus]);

  const togglePin = useCallback(
    (uri: string) => {
      const pinned = !(tabsRef.current.find((t) => t.uri === uri)?.pinned);
      setTabs((prev) => prev.map((t) => (t.uri === uri ? { ...t, pinned } : t)));
      eventBus.emit(TabEvents.Pin, { uri, pinned });
    },
    [eventBus],
  );

  // ── Event bus wiring ───────────────────────────────────────

  useEffect(() => {
    const handlers: [string, (p: unknown) => void][] = [
      [FileEvents.Open, (p) => {
        const { uri, label } = p as { uri: string; label?: string };
        openTab(uri, label);
      }],
      [TabEvents.Open, (p) => {
        const { uri, label } = p as { uri: string; label: string };
        openTab(uri, label);
      }],
      [TabEvents.Switch, (p) => {
        const { uri } = p as { uri: string };
        activateTab(uri);
      }],
      [TabEvents.Close, (p) => {
        const { uri } = p as { uri: string };
        closeTab(uri);
      }],
      [TabEvents.Dirty, (p) => {
        const { uri, dirty } = p as { uri: string; dirty: boolean };
        setTabs((prev) => prev.map((t) => (t.uri === uri ? { ...t, dirty } : t)));
      }],
      [TabEvents.Reorder, (p) => {
        const { order } = p as { order: string[] };
        setTabs((prev) => {
          const map = new Map(prev.map((t) => [t.uri, t]));
          return order.map((u) => map.get(u)).filter(Boolean) as TabEntry[];
        });
      }],
      [FileEvents.Renamed, (p) => {
        const { oldUri, newUri } = p as { oldUri: string; newUri: string };
        const newLabel = newUri.split("/").pop() ?? newUri;
        setTabs((prev) => prev.map((t) => (t.uri === oldUri ? { ...t, uri: newUri, label: newLabel } : t)));
        if (activeRef.current === oldUri) setActiveUri(newUri);
      }],
      [FileEvents.Deleted, (p) => {
        const { uri } = p as { uri: string };
        setTabs((prev) => prev.map((t) => (t.uri === uri ? { ...t, deleted: true } : t)));
        setTimeout(() => closeTab(uri), 1500);
      }],
      ["tab:open-special", (p) => {
        const { uri, label } = p as { uri: string; label: string };
        openTab(uri, label, true);
      }],
      ["tab:switch-special", (p) => {
        const { uri } = p as { uri: string };
        activateTab(uri);
      }],
    ];

    for (const [ev, fn] of handlers) eventBus.on(ev, fn);
    return () => {
      for (const [ev, fn] of handlers) eventBus.off(ev, fn);
    };
  }, [eventBus, openTab, activateTab, closeTab]);

  // ── Context menu builder ───────────────────────────────────

  const buildMenuItems = useCallback(
    (uri: string): MenuItemDef[] => {
      const idx = tabs.findIndex((t) => t.uri === uri);
      const entry = tabs[idx];
      return [
        { label: "Close", shortcut: "Ctrl+W", action: () => closeTab(uri) },
        { label: "Close Others", disabled: tabs.length <= 1, action: () => closeOthers(uri) },
        { label: "Close to the Right", disabled: idx >= tabs.length - 1, action: () => closeToRight(uri) },
        { label: "Close to the Left", disabled: idx <= 0, action: () => closeToLeft(uri) },
        { label: "Close Saved", action: closeSaved },
        { label: "Close All", action: closeAll },
        { type: "separator" },
        { label: "Copy Path", action: () => { navigator.clipboard.writeText(uri); } },
        { label: "Copy Relative Path", action: () => { navigator.clipboard.writeText(uri); } },
        { type: "separator" },
        { label: "Split Right", action: () => eventBus.emit(LayoutEvents.Split, { direction: "right", uri }) },
        { label: "Split Down", action: () => eventBus.emit(LayoutEvents.Split, { direction: "down", uri }) },
        { type: "separator" },
        { label: entry?.pinned ? "Unpin" : "Pin Tab", action: () => togglePin(uri) },
        { label: "Reveal in Explorer", action: () => eventBus.emit(SidebarEvents.ViewActivate, { viewId: "explorer" }) },
      ];
    },
    [tabs, closeTab, closeOthers, closeToRight, closeToLeft, closeSaved, closeAll, togglePin, eventBus],
  );

  // ── Render ─────────────────────────────────────────────────

  return (
    <>
      <div
        style={{
          display: "flex", alignItems: "stretch", height: "100%",
          overflowX: "auto", overflowY: "hidden", flex: 1,
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.uri}
            uri={tab.uri}
            label={tab.label}
            isActive={tab.uri === activeUri}
            isDirty={tab.dirty}
            isPinned={tab.pinned}
            isSpecial={tab.isSpecial}
            isDeleted={tab.deleted}
            iconApi={iconApi}
            onClick={() => {
              if (tab.uri === activeUri) return;
              if (tab.isSpecial) {
                eventBus.emit("tab:switch-special", { uri: tab.uri, label: tab.label });
              } else {
                eventBus.emit(FileEvents.Open, { uri: tab.uri, label: tab.label });
              }
            }}
            onClose={() => closeTab(tab.uri)}
            onContextMenu={(x, y) => setCtxMenu({ x, y, uri: tab.uri })}
          />
        ))}
      </div>
      {ctxMenu && (
        <TabContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={buildMenuItems(ctxMenu.uri)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  );
}
