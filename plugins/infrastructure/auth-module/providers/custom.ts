// ── Auth Module — Custom OAuth Provider ───────────────────────
// Generic configurable OAuth2 PKCE provider with custom endpoints.

import type { User, OAuthProviderInterface } from "../types";

export interface CustomProviderConfig {
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes?: string[];
  userMapping?: {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export class CustomAuthProvider implements OAuthProviderInterface {
  private readonly config: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    this.config = config;
  }

  getAuthUrl(state: string, codeVerifier: string): string {
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: (this.config.scopes ?? ["openid"]).join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      response_type: "code",
    });
    return `${this.config.authorizeUrl}?${params}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const resp = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        code,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
      }),
    });
    if (!resp.ok) throw new Error(`Custom token exchange failed: ${resp.status}`);
    const data = await resp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 3600,
    };
  }

  async getUserInfo(token: string): Promise<User> {
    const resp = await fetch(this.config.userInfoUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Custom user info failed: ${resp.status}`);
    const data = await resp.json();
    const m = this.config.userMapping;
    return {
      id: String(data[m?.id ?? "id"] ?? data.sub ?? ""),
      name: data[m?.name ?? "name"] ?? data.preferred_username ?? "",
      email: data[m?.email ?? "email"] ?? "",
      avatar: data[m?.avatar ?? "picture"],
      provider: "custom",
    };
  }

  private generateCodeChallenge(verifier: string): string {
    return btoa(verifier)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
