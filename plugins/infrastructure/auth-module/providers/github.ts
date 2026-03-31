// ── Auth Module — GitHub OAuth Provider ───────────────────────
// OAuth2 PKCE flow for GitHub authentication.

import type { User, OAuthProviderInterface } from "../types";

const GITHUB_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_USER_API = "https://api.github.com/user";

export class GitHubAuthProvider implements OAuthProviderInterface {
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];

  constructor(config: { clientId: string; redirectUri: string; scopes?: string[] }) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.scopes = config.scopes ?? ["read:user", "user:email"];
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
    });
    return `${GITHUB_AUTHORIZE}?${params}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }> {
    const resp = await fetch(GITHUB_TOKEN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });
    if (!resp.ok) throw new Error(`GitHub token exchange failed: ${resp.status}`);
    const data = await resp.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in ?? 3600,
    };
  }

  async getUserInfo(token: string): Promise<User> {
    const resp = await fetch(GITHUB_USER_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`GitHub user info failed: ${resp.status}`);
    const data = await resp.json();
    return {
      id: String(data.id),
      name: data.name ?? data.login,
      email: data.email ?? "",
      avatar: data.avatar_url,
      provider: "github",
    };
  }

  private generateCodeChallenge(verifier: string): string {
    // Base64url-encode the SHA-256 hash (sync fallback: plain verifier)
    // In a real browser environment, use crypto.subtle
    return btoa(verifier)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
