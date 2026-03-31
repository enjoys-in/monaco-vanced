// ── HashiCorp Vault Provider ───────────────────────────────

import type { SecretProvider } from "../types";

export interface VaultConfig {
  url: string;
  token: string;
  mount?: string;
  namespace?: string;
}

export class VaultProvider implements SecretProvider {
  readonly name = "vault";
  private readonly config: Required<Pick<VaultConfig, "url" | "token" | "mount">> & { namespace?: string };

  constructor(config: VaultConfig) {
    this.config = {
      url: config.url.replace(/\/$/, ""),
      token: config.token,
      mount: config.mount ?? "secret",
      namespace: config.namespace,
    };
  }

  async get(key: string): Promise<string | null> {
    try {
      const resp = await fetch(
        `${this.config.url}/v1/${this.config.mount}/data/${key}`,
        { headers: this.buildHeaders() },
      );
      if (!resp.ok) return null;
      const body = (await resp.json()) as { data?: { data?: Record<string, string> } };
      return body.data?.data?.value ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await fetch(`${this.config.url}/v1/${this.config.mount}/data/${key}`, {
      method: "POST",
      headers: { ...this.buildHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ data: { value } }),
    });
  }

  async delete(key: string): Promise<void> {
    await fetch(`${this.config.url}/v1/${this.config.mount}/metadata/${key}`, {
      method: "DELETE",
      headers: this.buildHeaders(),
    });
  }

  async list(): Promise<string[]> {
    try {
      const resp = await fetch(`${this.config.url}/v1/${this.config.mount}/metadata?list=true`, {
        headers: this.buildHeaders(),
      });
      if (!resp.ok) return [];
      const body = (await resp.json()) as { data?: { keys?: string[] } };
      return body.data?.keys ?? [];
    } catch {
      return [];
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "X-Vault-Token": this.config.token };
    if (this.config.namespace) {
      headers["X-Vault-Namespace"] = this.config.namespace;
    }
    return headers;
  }
}
