// ── Auth Module — Session Manager ─────────────────────────────
// Manages auth session lifecycle: store, retrieve, expiry, refresh.

import type { AuthSession } from "./types";
import { TokenStore } from "./token-store";

const REFRESH_BUFFER_MS = 60_000; // refresh 1 min before expiry

export class SessionManager {
  private session: AuthSession | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly tokenStore: TokenStore;
  private onRefreshNeeded: (() => Promise<boolean>) | null = null;

  constructor(tokenStore: TokenStore) {
    this.tokenStore = tokenStore;
    this.restore();
  }

  setRefreshHandler(handler: () => Promise<boolean>): void {
    this.onRefreshNeeded = handler;
  }

  store(session: AuthSession): void {
    this.session = session;
    this.tokenStore.set("session", JSON.stringify({
      user: session.user,
      token: session.token,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    }));
    this.scheduleRefresh();
  }

  clear(): void {
    this.session = null;
    this.tokenStore.remove("session");
    this.cancelRefresh();
  }

  get(): AuthSession | null {
    if (!this.session) return null;
    if (this.isExpired()) {
      this.clear();
      return null;
    }
    return this.session;
  }

  isExpired(): boolean {
    if (!this.session) return true;
    return Date.now() >= this.session.expiresAt;
  }

  isAuthenticated(): boolean {
    return this.get() !== null;
  }

  private restore(): void {
    const raw = this.tokenStore.get("session");
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as AuthSession;
      if (data.expiresAt > Date.now()) {
        this.session = data;
        this.scheduleRefresh();
      } else {
        this.tokenStore.remove("session");
      }
    } catch {
      this.tokenStore.remove("session");
    }
  }

  private scheduleRefresh(): void {
    this.cancelRefresh();
    if (!this.session) return;
    const delay = Math.max(0, this.session.expiresAt - Date.now() - REFRESH_BUFFER_MS);
    this.refreshTimer = setTimeout(async () => {
      if (this.onRefreshNeeded) {
        const ok = await this.onRefreshNeeded();
        if (!ok) this.clear();
      }
    }, delay);
  }

  private cancelRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  dispose(): void {
    this.cancelRefresh();
  }
}
