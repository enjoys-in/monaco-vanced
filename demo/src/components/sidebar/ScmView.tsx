// ── Source Control View (React) ──────────────────────────────

import { useState, useCallback } from "react";
import { useTheme } from "../theme";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { fileIconSvg, getExt } from "../../wireframe/utils";

interface FileEntry {
  uri: string;
  name: string;
}

interface Props {
  eventBus: InstanceType<typeof EventBus>;
  files: FileEntry[];
  notificationApi?: { show(opts: { type: string; message: string; duration: number }): void };
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <span style={{
      display: "inline-flex", transition: "transform .12s",
      transform: expanded ? "rotate(90deg)" : "rotate(0)", marginRight: 4,
    }}>
      <svg width="10" height="10" viewBox="0 0 16 16">
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    </span>
  );
}

export function ScmView({ eventBus, files, notificationApi }: Props) {
  const { tokens: t } = useTheme();
  const [commitMsg, setCommitMsg] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ staged: true, changes: true });

  const stagedFiles = files.slice(0, 3);
  const changedFiles = files.slice(3);

  const toggle = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleCommit = useCallback(() => {
    if (!commitMsg.trim()) {
      notificationApi?.show({ type: "warning", message: "Please enter a commit message.", duration: 3000 });
      return;
    }
    notificationApi?.show({ type: "success", message: `Committed: "${commitMsg.trim()}"`, duration: 4000 });
    setCommitMsg("");
  }, [commitMsg, notificationApi]);

  const openFile = useCallback((uri: string, name: string) => {
    eventBus.emit(FileEvents.Open, { uri, label: name });
  }, [eventBus]);

  const renderFileList = (fileList: FileEntry[], badge: string, badgeColor: string) =>
    fileList.map((f) => (
      <div
        key={f.uri}
        className="vsc-file-item"
        style={{ display: "flex", alignItems: "center", height: 24, padding: "0 8px", cursor: "pointer", userSelect: "none" }}
        onClick={() => openFile(f.uri, f.name)}
      >
        <span style={{ marginRight: 6, display: "inline-flex", alignItems: "center" }} dangerouslySetInnerHTML={{ __html: fileIconSvg(getExt(f.name)) }} />
        <span style={{ flex: 1, color: t.fg, fontSize: 13 }}>{f.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "0 6px", color: badgeColor }}>{badge}</span>
      </div>
    ));

  return (
    <div style={{ padding: "10px 12px", overflowY: "auto", height: "100%" }}>
      <input
        type="text"
        className="vsc-input"
        placeholder="Message (Ctrl+Enter to commit)"
        value={commitMsg}
        onChange={(e) => setCommitMsg(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleCommit(); }}
        style={{ marginBottom: 8 }}
      />
      <button
        className="vsc-btn vsc-btn-primary"
        style={{ width: "100%", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        onClick={handleCommit}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z" /></svg>
        <span>Commit</span>
      </button>

      {/* Staged Changes */}
      <div>
        <div className="vsc-section-header" style={{ cursor: "pointer" }} onClick={() => toggle("staged")}>
          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ChevronIcon expanded={expandedSections.staged ?? true} />
            <span>Staged Changes ({stagedFiles.length})</span>
          </span>
        </div>
        {(expandedSections.staged ?? true) && renderFileList(stagedFiles, "A", t.successGreen)}
      </div>

      {/* Changes */}
      <div>
        <div className="vsc-section-header" style={{ cursor: "pointer" }} onClick={() => toggle("changes")}>
          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ChevronIcon expanded={expandedSections.changes ?? true} />
            <span>Changes ({changedFiles.length})</span>
          </span>
        </div>
        {(expandedSections.changes ?? true) && renderFileList(changedFiles, "M", t.warningYellow)}
      </div>
    </div>
  );
}
