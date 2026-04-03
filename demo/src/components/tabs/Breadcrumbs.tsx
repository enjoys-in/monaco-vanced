// ── Breadcrumbs — interactive path navigation with dropdown pickers ──

import { useState, useEffect, useRef, useCallback } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { FileEvents, TabEvents, WelcomeEvents } from "@enjoys/monaco-vanced/core/events";
import { useTheme } from "../theme";
import type { MockFsAPI, FsEntry } from "../../mock-fs";
import type { ExplorerIconAPI } from "../../explorer";
import { fileIconSvg, getExt } from "../../wireframe/utils";

export interface BreadcrumbsProps {
  eventBus: InstanceType<typeof EventBus>;
  fsApi?: MockFsAPI;
  iconApi?: ExplorerIconAPI;
}

// ── Dropdown item ────────────────────────────────────────────
interface DropdownItem {
  path: string;
  name: string;
  type: "file" | "directory";
}

// ── Dropdown component ───────────────────────────────────────
function BreadcrumbDropdown({
  items,
  anchorRect,
  onSelect,
  onClose,
  iconApi,
}: {
  items: DropdownItem[];
  anchorRect: DOMRect;
  onSelect: (item: DropdownItem) => void;
  onClose: () => void;
  iconApi?: ExplorerIconAPI;
}) {
  const { tokens: t } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(-1);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const top = anchorRect.bottom + 2;
  const left = anchorRect.left;

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top,
        left,
        minWidth: 180,
        maxHeight: 280,
        overflowY: "auto",
        background: t.menuBg,
        border: `1px solid ${t.border}`,
        borderRadius: 4,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 9999,
        padding: "4px 0",
        fontSize: 12,
      }}
    >
      {items.length === 0 && (
        <div style={{ padding: "6px 12px", color: t.fgDim, fontStyle: "italic" }}>Empty</div>
      )}
      {items.map((item, i) => {
        const isDir = item.type === "directory";
        const iconSrc = iconApi?.getFileIcon(item.name, isDir, false);
        return (
          <div
            key={item.path}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              cursor: "pointer",
              background: hovered === i ? t.listHover : "transparent",
              color: t.fg,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(-1)}
            onClick={() => onSelect(item)}
          >
            {iconSrc ? (
              <img src={iconSrc} alt="" width={16} height={16} style={{ flexShrink: 0 }} />
            ) : (
              <span style={{ width: 16, textAlign: "center", color: t.fgDim, flexShrink: 0 }}>
                {isDir ? "📁" : "📄"}
              </span>
            )}
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.name}
            </span>
            {isDir && <span style={{ marginLeft: "auto", color: t.fgDim, fontSize: 10 }}>›</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Breadcrumbs component ────────────────────────────────────
export function Breadcrumbs({ eventBus, fsApi, iconApi }: BreadcrumbsProps) {
  const { tokens: t } = useTheme();
  const [path, setPath] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<{ segmentIndex: number; rect: DOMRect } | null>(null);
  const [dropdownItems, setDropdownItems] = useState<DropdownItem[]>([]);

  useEffect(() => {
    const onOpen = (p: unknown) => {
      const { uri } = p as { uri: string };
      setPath(uri);
    };
    const onSpecial = (p: unknown) => {
      const { label } = p as { label: string };
      setPath(label);
    };
    const onWelcome = () => setPath(null);

    eventBus.on(FileEvents.Open, onOpen);
    eventBus.on(TabEvents.SwitchSpecial, onSpecial);
    eventBus.on(WelcomeEvents.Show, onWelcome);
    return () => {
      eventBus.off(FileEvents.Open, onOpen);
      eventBus.off(TabEvents.SwitchSpecial, onSpecial);
      eventBus.off(WelcomeEvents.Show, onWelcome);
    };
  }, [eventBus]);

  const handleSegmentClick = useCallback(
    (segmentIndex: number, parts: string[], e: React.MouseEvent) => {
      if (!fsApi) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

      // Build directory path for this segment
      const dirPath = segmentIndex === 0 ? "" : parts.slice(0, segmentIndex).join("/");
      const entries: FsEntry[] = fsApi.readDir(dirPath);

      const items: DropdownItem[] = entries.map((entry) => ({
        path: dirPath ? `${dirPath}/${entry.name}` : entry.name,
        name: entry.name,
        type: entry.type,
      }));

      setDropdownItems(items);
      setDropdown({ segmentIndex, rect });
    },
    [fsApi],
  );

  const handleDropdownSelect = useCallback(
    (item: DropdownItem) => {
      setDropdown(null);
      if (item.type === "file") {
        eventBus.emit(FileEvents.Open, { uri: item.path });
      } else {
        // Navigate into directory — update breadcrumb path
        setPath(item.path);
      }
    },
    [eventBus],
  );

  const closeDropdown = useCallback(() => setDropdown(null), []);

  if (!path) return null;

  const parts = path.split("/");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, fontSize: 12, padding: "0 8px", position: "relative" }}>
      {parts.map((part, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && (
            <span style={{ color: t.fgDim, fontSize: 9, margin: "0 2px", userSelect: "none" }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill={t.fgDim}>
                <path d="M5.7 13.7L5 13l5-5-5-5 .7-.7 5.7 5.7z" />
              </svg>
            </span>
          )}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              color: i === parts.length - 1 ? t.fg : t.breadcrumbFg,
              cursor: fsApi ? "pointer" : "default",
              padding: "2px 4px",
              borderRadius: 3,
              background: dropdown?.segmentIndex === i ? t.listHover : "transparent",
              transition: "background .1s",
            }}
            onMouseEnter={(e) => {
              if (dropdown?.segmentIndex !== i) (e.currentTarget as HTMLElement).style.background = t.hover;
            }}
            onMouseLeave={(e) => {
              if (dropdown?.segmentIndex !== i) (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
            onClick={(e) => handleSegmentClick(i, parts, e)}
          >
            {i === parts.length - 1 && (() => {
              const ext = getExt(part);
              const iconSrc = iconApi?.getFileIcon(part, false, false);
              if (iconSrc) return <img src={iconSrc} alt="" width={14} height={14} style={{ flexShrink: 0, marginRight: 2 }} />;
              return <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0, marginRight: 2 }} dangerouslySetInnerHTML={{ __html: fileIconSvg(ext) }} />;
            })()}
            {part}
            {fsApi && (
              <svg
                width="8" height="8" viewBox="0 0 16 16" fill={t.fgDim}
                style={{ marginLeft: 1, opacity: 0.7 }}
              >
                <path d="M3 5h10l-5 6z" />
              </svg>
            )}
          </span>
        </span>
      ))}

      {dropdown && (
        <BreadcrumbDropdown
          items={dropdownItems}
          anchorRect={dropdown.rect}
          onSelect={handleDropdownSelect}
          onClose={closeDropdown}
          iconApi={iconApi}
        />
      )}
    </div>
  );
}
