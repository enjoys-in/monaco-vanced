export enum NotificationEvents {
  Show = "notification:show",
  Dismiss = "notification:dismiss",
  Action = "notification:action",
  HistoryClear = "notification:history-clear",
  ApiReady = "notification:api-ready",
}

/** @deprecated Use NotificationEvents */
export const NotifyEvents = NotificationEvents;
