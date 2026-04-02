export enum LspEvents {
  // ── Connection lifecycle ──────────────────────────────
  Connecting = "lsp:connecting",
  Connected = "lsp:connected",
  Disconnected = "lsp:disconnected",
  Reconnecting = "lsp:reconnecting",
  Failed = "lsp:failed",

  // ── Requests ──────────────────────────────────────────
  RequestSent = "lsp:request-sent",
  ResponseReceived = "lsp:response-received",
  RequestTimeout = "lsp:request-timeout",
  RequestError = "lsp:request-error",

  // ── Configuration ─────────────────────────────────────
  UrlChanged = "lsp:url-changed",
  ConfigChanged = "lsp:config-changed",
  ModeChanged = "lsp:mode-changed",

  // ── Diagnostics (server → client, V2 only) ───────────
  Diagnostics = "lsp:diagnostics",

  // ── Document sync (V2 only) ───────────────────────────
  DidOpen = "lsp:did-open",
  DidChange = "lsp:did-change",

  // ── Server messages (V2 only) ─────────────────────────
  ServerMessage = "lsp:server-message",

  // ── Health check ──────────────────────────────────────
  HealthCheckOk = "lsp:health-check-ok",
  HealthCheckFailed = "lsp:health-check-failed",

  // ── Liveness ping ─────────────────────────────────────
  PingSuccess = "lsp:ping-success",
  PingTimeout = "lsp:ping-timeout",
  PingFailed = "lsp:ping-failed",
}
