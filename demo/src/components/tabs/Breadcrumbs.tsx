// ── Breadcrumbs — path navigation below the tab bar ──────────

import { useState, useEffect } from "react";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import { useTheme } from "../theme";

export interface BreadcrumbsProps {
  eventBus: InstanceType<typeof EventBus>;
}

export function Breadcrumbs({ eventBus }: BreadcrumbsProps) {
  const { tokens: t } = useTheme();
  const [path, setPath] = useState<string | null>(null);

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
    eventBus.on("tab:switch-special", onSpecial);
    eventBus.on("welcome:show", onWelcome);
    return () => {
      eventBus.off(FileEvents.Open, onOpen);
      eventBus.off("tab:switch-special", onSpecial);
      eventBus.off("welcome:show", onWelcome);
    };
  }, [eventBus]);

  if (!path) return null;

  const parts = path.split("/");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, fontSize: 12, padding: "0 8px" }}>
      {parts.map((part, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center" }}>
          {i > 0 && <span style={{ color: t.fgDim, fontSize: 11, margin: "0 2px" }}>›</span>}
          <span
            style={{
              color: i === parts.length - 1 ? t.fg : t.breadcrumbFg,
              cursor: "pointer", padding: "2px 3px", borderRadius: 3,
              transition: "background .1s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}
