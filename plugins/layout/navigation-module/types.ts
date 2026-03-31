// ── Navigation Module Types ────────────────────────────────

export interface NavigationEntry {
  readonly uri: string;
  readonly line?: number;
  readonly column?: number;
  readonly label?: string;
  readonly timestamp: number;
}

export interface BreadcrumbSegment {
  readonly label: string;
  readonly path: string;
  readonly kind: "folder" | "file" | "symbol";
  readonly symbolKind?: string;
}

export interface NavigationPluginOptions {
  readonly maxHistorySize?: number;
}

export interface NavigationModuleAPI {
  goBack(): NavigationEntry | null;
  goForward(): NavigationEntry | null;
  push(entry: Omit<NavigationEntry, "timestamp">): void;
  getHistory(): NavigationEntry[];
  canGoBack(): boolean;
  canGoForward(): boolean;
  getBreadcrumbs(filePath: string): BreadcrumbSegment[];
  clearHistory(): void;
}
