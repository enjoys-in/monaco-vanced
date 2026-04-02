// ── Extension Detail — shared types & helpers ────────────────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { OpenVSXMetadata } from "@enjoys/monaco-vanced/extensions/vsix-module";

export type { OpenVSXMetadata };

export interface ExtDetailProps {
  extId: string;
  extName: string;
  eventBus: InstanceType<typeof EventBus>;
  onInteract?: () => void;
  /** VSIX module API for fetching metadata/readme */
  vsixApi?: {
    getMetadata(id: string): Promise<OpenVSXMetadata>;
    fetchText(url: string): Promise<string>;
    fetch(id: string): Promise<unknown>;
    install(pkg: unknown): Promise<void>;
  };
}

export type DetailTab = "details" | "features" | "changelog";

export function formatDownloads(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function formatRating(avg?: number, count?: number): string {
  if (avg == null || avg === 0) return "No ratings";
  const stars = "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg));
  return count ? `${stars} (${count})` : stars;
}
