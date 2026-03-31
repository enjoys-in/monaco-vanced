// ── Notification Module — Plugin Entry ─────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { Notification, NotificationConfig, NotificationModuleAPI } from "./types";
import { ToastQueue } from "./toast-queue";
import { NotificationPreferences } from "./preferences";

export type { Notification, NotificationConfig, NotificationModuleAPI, NotificationType, NotificationAction, NotificationPosition } from "./types";
export { ToastQueue } from "./toast-queue";
export { NotificationPreferences } from "./preferences";

let nextId = 1;

export function createNotificationPlugin(config: NotificationConfig = {}): {
  plugin: MonacoPlugin;
  api: NotificationModuleAPI;
} {
  const queue = new ToastQueue(config.maxToasts, config.defaultDuration);
  const _preferences = new NotificationPreferences(); void _preferences;
  const actionHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  queue.setDismissHandler((id) => {
    ctx?.emit("notification:dismiss", { id });
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
      };
      queue.enqueue(full);
      ctx?.emit("notification:show", full);
      return id;
    },

    dismiss(id: string): void {
      queue.dismiss(id);
      ctx?.emit("notification:dismiss", { id });
    },

    dismissAll(): void {
      queue.dismissAll();
      ctx?.emit("notification:dismiss", { all: true });
    },

    getActive(): Notification[] {
      return queue.getAll();
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
    description: "Toast notifications with queue, auto-dismiss, and preferences",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("notification:show", (data?: unknown) => {
          const d = data as Omit<Notification, "id"> & { id?: string } | undefined;
          if (d?.message) api.show(d);
        }),
      );

      disposables.push(
        ctx.on("notification:dismiss", (data?: unknown) => {
          const d = data as { id?: string; all?: boolean } | undefined;
          if (d?.all) api.dismissAll();
          else if (d?.id) api.dismiss(d.id);
        }),
      );

      disposables.push(
        ctx.on("notification:action", (data?: unknown) => {
          for (const handler of actionHandlers) {
            try { handler(data); } catch (e) { console.warn("[notification-module] action handler error:", e); }
          }
        }),
      );
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
