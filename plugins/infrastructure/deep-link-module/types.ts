// ── Deep Link Module — Types ───────────────────────────────────

import type { IDisposable } from "@core/types";

export type DeepLinkTargetType = "file" | "panel" | "command";

export interface DeepLinkTarget {
  type: DeepLinkTargetType;
  path?: string;
  line?: number;
  column?: number;
  commandId?: string;
  args?: unknown[];
}

export interface DeepLinkConfig {
  scheme?: string;
}

export interface DeepLinkModuleAPI {
  create(target: DeepLinkTarget): string;
  navigate(uri: string): Promise<void>;
  parse(uri: string): DeepLinkTarget | null;
  onNavigate(handler: (data?: unknown) => void): IDisposable;
}
