// ── Notification Module — Plugin Entry ─────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { Notification, NotificationConfig, NotificationModuleAPI, NotificationHistoryEntry } from "./types";
import { NotificationEvents } from "@core/events";
import { ToastQueue } from "./toast-queue";
import { NotificationPreferences } from "./preferences";

export type { Notification, NotificationConfig, NotificationModuleAPI, NotificationType, NotificationAction, NotificationPosition, NotificationHistoryEntry, CategoryPreference, GlobalPreference } from "./types";
export { ToastQueue } from "./toast-queue";
export { NotificationPreferences } from "./preferences";

let nextId = 1;

export function createNotificationPlugin(config: NotificationConfig = {}): {
  plugin: MonacoPlugin;
  api: NotificationModuleAPI;
} {
  const queue = new ToastQueue(config.maxToasts, config.defaultDuration);
  const preferences = new NotificationPreferences(config.persistKey, config.maxHistory);
  const actionHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;
  let emitting = false;

  queue.setDismissHandler((id) => {
    ctx?.emit(NotificationEvents.Dismiss, { id });
  });

  const api: NotificationModuleAPI = {
    show(notification): string {
      const id = notification.id ?? `notif-${nextId++}`;
      const full: Notification = {
        id,
        message: notification.message,
        type: notification.type,
        actions: notification.actions,
        autoHide: notification.autoHide ?? true,
        duration: notification.duration ?? config.defaultDuration,
        progress: notification.progress,
        category: notification.category,
      };
      queue.enqueue(full);
      emitting = true;
      ctx?.emit(NotificationEvents.Show, full);
      emitting = false;

      // Persist to history (fire-and-forget)
      preferences.addHistory({
        id,
        message: full.message,
        type: full.type,
        category: full.category,
        timestamp: Date.now(),
        read: false,
      }).catch(() => {});

      return id;
    },

    dismiss(id: string): void {
      queue.dismiss(id);
      ctx?.emit(NotificationEvents.Dismiss, { id });
    },

    dismissAll(): void {
      queue.dismissAll();
      ctx?.emit(NotificationEvents.Dismiss, { all: true });
    },

    getActive(): Notification[] {
      return queue.getAll();
    },

    async getHistory(): Promise<NotificationHistoryEntry[]> {
      return preferences.getHistory();
    },

    async clearHistory(): Promise<void> {
      await preferences.clearHistory();
      ctx?.emit(NotificationEvents.HistoryClear, {});
    },

    async markRead(id: string): Promise<void> {
      await preferences.markRead(id);
    },

    async markAllRead(): Promise<void> {
      await preferences.markAllRead();
    },

    async getUnreadCount(): Promise<number> {
      return preferences.getUnreadCount();
    },

    onAction(handler: (data?: unknown) => void): IDisposable {
      actionHandlers.push(handler);
      return {
        dispose() {
          const idx = actionHandlers.indexOf(handler);
          if (idx >= 0) actionHandlers.splice(idx, 1);
        },
      };
    },
  };

  const plugin: MonacoPlugin = {
    id: "infrastructure.notification",
    name: "Notification Module",
    version: "1.0.0",
    description: "Toast notifications with queue, Dexie-persisted preferences/history, and auto-dismiss",

    async onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Wait for IndexedDB restore
      await preferences.ready();

      disposables.push(
        ctx.on(NotificationEvents.Show, (data?: unknown) => {
          if (emitting) return; // prevent re-entrancy from api.show()
          const d = data as Omit<Notification, "id"> & { id?: string } | undefined;
          if (d?.message) api.show(d);
        }),
      );

      disposables.push(
        ctx.on(NotificationEvents.Dismiss, (data?: unknown) => {
          const d = data as { id?: string; all?: boolean } | undefined;
          if (d?.all) api.dismissAll();
          else if (d?.id) api.dismiss(d.id);
        }),
      );

      disposables.push(
        ctx.on(NotificationEvents.Action, (data?: unknown) => {
          for (const handler of actionHandlers) {
            try { handler(data); } catch (e) { console.warn("[notification-module] action handler error:", e); }
          }
        }),
      );

      // Signal API ready for engine injection
      ctx.emit(NotificationEvents.ApiReady, api);
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      queue.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
