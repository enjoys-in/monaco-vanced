// ── Auth Module — Google OAuth Provider ───────────────────────
// OAuth2 PKCE flow for Google authentication.

import type { User, OAuthProviderInterface } from "../types";

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_API = "https://www.googleapis.com/oauth2/v2/userinfo";

export class GoogleAuthProvider implements OAuthProviderInterface {
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];

  constructor(config: { clientId: string; redirectUri: string; scopes?: string[] }) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes ?? ["openid", "email", "profile"];
  }

  getAuthUrl(state: string, codeVerifier: string): string {
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(" "),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
    });
    return `${GOOGLE_AUTHORIZE}?${params}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const resp = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
      }),
    });
    if (!resp.ok) throw new Error(`Google token exchange failed: ${resp.status}`);
    const data = await resp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 3600,
    };
  }

  async getUserInfo(token: string): Promise<User> {
    const resp = await fetch(GOOGLE_USER_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Google user info failed: ${resp.status}`);
    const data = await resp.json();
    return {
      id: data.id,
      name: data.name ?? data.email,
      email: data.email ?? "",
      avatar: data.picture,
      provider: "google",
    };
  }

  private generateCodeChallenge(verifier: string): string {
    return btoa(verifier)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
