// ── Security Module — Plugin Entry ────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { SecurityConfig, SecurityModuleAPI, AuditEvent, PermissionManifest, RateLimitResult } from "./types";
import { PermissionGate } from "./permission-gate";
import { RateLimiter } from "./rate-limiter";
import { CSPBuilder } from "./csp";
import { sanitizeHTML } from "./sanitizer";
import { AuditBridge } from "./audit-bridge";

export type { SecurityConfig, SecurityModuleAPI, PermissionManifest, RateLimitConfig, RateLimitResult, AuditEvent } from "./types";
export { PermissionGate } from "./permission-gate";
export { RateLimiter } from "./rate-limiter";
export { CSPBuilder, type CSPOptions } from "./csp";
export { sanitizeHTML } from "./sanitizer";
export { AuditBridge } from "./audit-bridge";

export function createSecurityPlugin(config: SecurityConfig = {}): {
  plugin: MonacoPlugin;
  api: SecurityModuleAPI;
} {
  const gate = new PermissionGate(config.defaultPermissions);
  const limiter = new RateLimiter();
  const cspBuilder = new CSPBuilder();
  const auditBridge = new AuditBridge();
  const disposables: IDisposable[] = [];
  const deniedHandlers: Array<(data?: unknown) => void> = [];
  let ctx: PluginContext | null = null;

  if (config.rateLimits) {
    limiter.configure(config.rateLimits);
  }

  const api: SecurityModuleAPI = {
    checkPermission(pluginId: string, capability: string): boolean {
      const allowed = gate.check(pluginId, capability);
      if (!allowed) {
        const event: AuditEvent = {
          type: "permission-denied",
          pluginId,
          details: { capability },
          timestamp: Date.now(),
        };
        auditBridge.log(event);
        ctx?.emit("security:permission-denied", { pluginId, capability });
        deniedHandlers.forEach((h) => {
          try { h({ pluginId, capability }); } catch {}
        });
      }
      return allowed;
    },

    rateLimit(domain: string): RateLimitResult {
      const result = limiter.check(domain);
      if (!result.allowed) {
        ctx?.emit("security:rate-limited", { domain, retryAfter: result.retryAfter });
        auditBridge.log({
          type: "rate-limited",
          details: { domain, retryAfter: result.retryAfter },
          timestamp: Date.now(),
        });
      }
      return result;
    },

    sanitizeHTML(html: string): string {
      return sanitizeHTML(html);
    },

    getCSP(viewId: string): string {
      return cspBuilder.build(viewId);
    },

    audit(event: AuditEvent): void {
      auditBridge.log(event);
    },

    registerPermissions(pluginId: string, manifest: PermissionManifest): void {
      gate.register(pluginId, manifest);
    },

    onPermissionDenied(handler: (data?: unknown) => void): IDisposable {
      deniedHandlers.push(handler);
      return {
        dispose() {
          const idx = deniedHandlers.indexOf(handler);
          if (idx !== -1) deniedHandlers.splice(idx, 1);
        },
      };
    },
  };

  const plugin: MonacoPlugin = {
    id: "platform.security",
    name: "Security Module",
    version: "1.0.0",
    description: "Permission gating, rate limiting, CSP, HTML sanitization, and audit logging",

    onMount(_ctx: PluginContext) {
      ctx = _ctx;
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      deniedHandlers.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
