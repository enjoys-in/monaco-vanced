// ── Notification Module — Types ────────────────────────────────

import type { IDisposable } from "@core/types";

export type NotificationType = "info" | "success" | "warning" | "error";

export type NotificationPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";

export interface NotificationAction {
  id: string;
  label: string;
}

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  actions?: NotificationAction[];
  autoHide?: boolean;
  duration?: number;
  progress?: number;
  category?: string;
}

/** Persisted notification history entry (Dexie) */
export interface NotificationHistoryEntry {
  id: string;
  message: string;
  type: NotificationType;
  category?: string;
  timestamp: number;
  read: boolean;
}

/** Persisted category preferences (Dexie) */
export interface CategoryPreference {
  category: string;
  muted: boolean;
  customDuration?: number;
}

/** Persisted global preferences (Dexie) */
export interface GlobalPreference {
  key: string;
  value: unknown;
}

export interface NotificationConfig {
  maxToasts?: number;
  defaultDuration?: number;
  position?: NotificationPosition;
  persistKey?: string;
  maxHistory?: number;
}

export interface NotificationModuleAPI {
  show(notification: Omit<Notification, "id"> & { id?: string }): string;
  dismiss(id: string): void;
  dismissAll(): void;
  getActive(): Notification[];
  getHistory(): Promise<NotificationHistoryEntry[]>;
  clearHistory(): Promise<void>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  getUnreadCount(): Promise<number>;
  onAction(handler: (data?: unknown) => void): IDisposable;
}
