// ── Security Module — RateLimiter ─────────────────────────────

import type { RateLimitConfig, RateLimitResult } from "./types";

interface Window {
  timestamps: number[];
  max: number;
  windowMs: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, Window>();

  configure(configs: RateLimitConfig[]): void {
    for (const cfg of configs) {
      this.windows.set(cfg.domain, {
        timestamps: [],
        max: cfg.max,
        windowMs: cfg.windowMs,
      });
    }
  }

  check(domain: string): RateLimitResult {
    const window = this.windows.get(domain);
    if (!window) return { allowed: true, retryAfter: 0 };

    const now = Date.now();
    const cutoff = now - window.windowMs;

    // Sliding window — prune old entries
    window.timestamps = window.timestamps.filter((t) => t > cutoff);

    if (window.timestamps.length >= window.max) {
      const oldest = window.timestamps[0];
      const retryAfter = oldest + window.windowMs - now;
      return { allowed: false, retryAfter: Math.max(0, retryAfter) };
    }

    window.timestamps.push(now);
    return { allowed: true, retryAfter: 0 };
  }

  reset(domain: string): void {
    const window = this.windows.get(domain);
    if (window) window.timestamps = [];
  }

  resetAll(): void {
    for (const w of this.windows.values()) w.timestamps = [];
  }
}
