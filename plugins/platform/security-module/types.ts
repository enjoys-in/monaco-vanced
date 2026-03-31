// ── Security Module — Types ───────────────────────────────────

import type { IDisposable } from "@core/types";

export interface PermissionManifest {
  permissions: string[];
}

export interface RateLimitConfig {
  domain: string;
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

export interface SecurityConfig {
  defaultPermissions?: string[];
  rateLimits?: RateLimitConfig[];
}

export interface AuditEvent {
  type: string;
  pluginId?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export interface SecurityModuleAPI {
  checkPermission(pluginId: string, capability: string): boolean;
  rateLimit(domain: string): RateLimitResult;
  sanitizeHTML(html: string): string;
  getCSP(viewId: string): string;
  audit(event: AuditEvent): void;
  registerPermissions(pluginId: string, manifest: PermissionManifest): void;
  onPermissionDenied(handler: (data?: unknown) => void): IDisposable;
}
