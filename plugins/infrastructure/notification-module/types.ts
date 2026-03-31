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
}

export interface NotificationConfig {
  maxToasts?: number;
  defaultDuration?: number;
  position?: NotificationPosition;
}

export interface NotificationModuleAPI {
  show(notification: Omit<Notification, "id"> & { id?: string }): string;
  dismiss(id: string): void;
  dismissAll(): void;
  getActive(): Notification[];
  onAction(handler: (data?: unknown) => void): IDisposable;
}
