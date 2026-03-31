// ── Auth Module — Plugin Entry ─────────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { AuthConfig, AuthModuleAPI, AuthProvider, AuthSession, OAuthProviderInterface } from "./types";
import { SessionManager } from "./session";
import { TokenStore } from "./token-store";
import { GitHubAuthProvider } from "./providers/github";
import { GoogleAuthProvider } from "./providers/google";
import { CustomAuthProvider } from "./providers/custom";

export type { AuthConfig, AuthModuleAPI, AuthProvider, AuthSession, User, OAuthProviderInterface } from "./types";
export { SessionManager } from "./session";
export { TokenStore } from "./token-store";
export { GitHubAuthProvider } from "./providers/github";
export { GoogleAuthProvider } from "./providers/google";
export { CustomAuthProvider } from "./providers/custom";

function generateState(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateCodeVerifier(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createAuthPlugin(config: AuthConfig): {
  plugin: MonacoPlugin;
  api: AuthModuleAPI;
} {
  const tokenStore = new TokenStore(config.tokenStorageKey);
  const sessionManager = new SessionManager(tokenStore);
  const authChangeHandlers: Array<(data?: unknown) => void> = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  const providers = new Map<AuthProvider, OAuthProviderInterface>();

  function notifyAuthChange(data?: unknown): void {
    authChangeHandlers.forEach((h) => {
      try { h(data); } catch (e) { console.warn("[auth-module] handler error:", e); }
    });
  }

  const api: AuthModuleAPI = {
    async login(provider: AuthProvider): Promise<void> {
      const p = providers.get(provider);
      if (!p) throw new Error(`Auth provider "${provider}" not configured`);

      const state = generateState();
      const codeVerifier = generateCodeVerifier();
      tokenStore.set("oauth_state", state);
      tokenStore.set("oauth_verifier", codeVerifier);
      tokenStore.set("oauth_provider", provider);

      const url = p.getAuthUrl(state, codeVerifier);
      window.open(url, "_blank", "width=600,height=700");
      ctx?.emit("auth:login", { provider });
    },

    async logout(): Promise<void> {
      sessionManager.clear();
      notifyAuthChange({ type: "logout" });
      ctx?.emit("auth:logout", undefined);
    },

    getSession(): AuthSession | null {
      return sessionManager.get();
    },

    getUser() {
      return sessionManager.get()?.user ?? null;
    },

    isAuthenticated(): boolean {
      return sessionManager.isAuthenticated();
    },

    onAuthChange(handler: (data?: unknown) => void): IDisposable {
      authChangeHandlers.push(handler);
      return {
        dispose() {
          const idx = authChangeHandlers.indexOf(handler);
          if (idx >= 0) authChangeHandlers.splice(idx, 1);
        },
      };
    },

    async refreshToken(): Promise<boolean> {
      const session = sessionManager.get();
      if (!session?.refreshToken) return false;
      const p = providers.get(session.user.provider);
      if (!p) return false;
      try {
        const result = await p.exchangeCode(session.refreshToken, "");
        sessionManager.store({
          user: session.user,
          token: result.accessToken,
          refreshToken: result.refreshToken ?? session.refreshToken,
          expiresAt: Date.now() + result.expiresIn * 1000,
        });
        notifyAuthChange({ type: "refresh" });
        ctx?.emit("auth:token-refresh", undefined);
        return true;
      } catch {
        return false;
      }
    },
  };

  sessionManager.setRefreshHandler(() => api.refreshToken());

  async function handleOAuthCallback(code: string, state: string): Promise<void> {
    const savedState = tokenStore.get("oauth_state");
    const codeVerifier = tokenStore.get("oauth_verifier") ?? "";
    const providerName = tokenStore.get("oauth_provider") as AuthProvider | null;

    tokenStore.remove("oauth_state");
    tokenStore.remove("oauth_verifier");
    tokenStore.remove("oauth_provider");

    if (state !== savedState) throw new Error("OAuth state mismatch");
    if (!providerName) throw new Error("No provider in OAuth callback");

    const p = providers.get(providerName);
    if (!p) throw new Error(`Provider "${providerName}" not found`);

    const tokenResult = await p.exchangeCode(code, codeVerifier);
    const user = await p.getUserInfo(tokenResult.accessToken);

    sessionManager.store({
      user,
      token: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAt: Date.now() + tokenResult.expiresIn * 1000,
    });

    notifyAuthChange({ type: "login", user });
  }

  const plugin: MonacoPlugin = {
    id: "infrastructure.auth",
    name: "Auth Module",
    version: "1.0.0",
    description: "Authentication with OAuth2 PKCE flow",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      // Initialize providers based on config
      if (config.providers.includes("github")) {
        providers.set("github", new GitHubAuthProvider({
          clientId: "",
          redirectUri: config.redirectUrl ?? window.location.origin,
        }));
      }
      if (config.providers.includes("google")) {
        providers.set("google", new GoogleAuthProvider({
          clientId: "",
          redirectUri: config.redirectUrl ?? window.location.origin,
        }));
      }
      if (config.providers.includes("custom") && config.customEndpoints) {
        providers.set("custom", new CustomAuthProvider({
          clientId: config.customEndpoints.clientId,
          redirectUri: config.redirectUrl ?? window.location.origin,
          authorizeUrl: config.customEndpoints.authorize,
          tokenUrl: config.customEndpoints.token,
          userInfoUrl: config.customEndpoints.userInfo,
          scopes: config.customEndpoints.scopes,
        }));
      }

      // Listen for OAuth callback via event bus
      disposables.push(
        ctx.on("auth:callback", async (data?: unknown) => {
          const { code, state } = data as { code: string; state: string };
          try {
            await handleOAuthCallback(code, state);
          } catch (e) {
            console.error("[auth-module] OAuth callback failed:", e);
          }
        }),
      );

      disposables.push(
        ctx.on("auth:login", (data?: unknown) => {
          const d = data as { provider?: AuthProvider } | undefined;
          if (d?.provider) api.login(d.provider).catch(console.error);
        }),
      );

      disposables.push(
        ctx.on("auth:logout", () => {
          api.logout().catch(console.error);
        }),
      );

      disposables.push(
        ctx.on("auth:token-refresh", () => {
          api.refreshToken().catch(console.error);
        }),
      );
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      sessionManager.dispose();
      ctx = null;
    },
  };

  return { plugin, api };
}
