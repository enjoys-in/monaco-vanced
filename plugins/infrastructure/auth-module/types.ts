// ── Auth Module — Types ───────────────────────────────────────

import type { IDisposable } from "@core/types";

export type AuthProvider = "github" | "google" | "custom";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: AuthProvider;
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthConfig {
  providers: AuthProvider[];
  redirectUrl?: string;
  tokenStorageKey?: string;
  customEndpoints?: {
    authorize: string;
    token: string;
    userInfo: string;
    clientId: string;
    scopes?: string[];
  };
}

export interface AuthModuleAPI {
  login(provider: AuthProvider): Promise<void>;
  logout(): Promise<void>;
  getSession(): AuthSession | null;
  getUser(): User | null;
  isAuthenticated(): boolean;
  onAuthChange(handler: (data?: unknown) => void): IDisposable;
  refreshToken(): Promise<boolean>;
}

export interface OAuthProviderInterface {
  getAuthUrl(state: string, codeVerifier: string): string;
  exchangeCode(code: string, codeVerifier: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  getUserInfo(token: string): Promise<User>;
}
