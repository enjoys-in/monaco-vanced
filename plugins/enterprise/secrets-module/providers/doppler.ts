// ── Doppler Provider ───────────────────────────────────────

import type { SecretProvider } from "../types";

export interface DopplerConfig {
  token: string;
  project: string;
  config: string;
  apiUrl?: string;
}

export class DopplerProvider implements SecretProvider {
  readonly name = "doppler";
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly project: string;
  private readonly configName: string;

  constructor(config: DopplerConfig) {
    this.baseUrl = (config.apiUrl ?? "https://api.doppler.com").replace(/\/$/, "");
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    };
    this.project = config.project;
    this.configName = config.config;
  }

  async get(key: string): Promise<string | null> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/v3/configs/config/secret?project=${this.project}&config=${this.configName}&name=${key}`,
        { headers: this.headers },
      );
      if (!resp.ok) return null;
      const body = (await resp.json()) as { value?: { raw?: string } };
      return body.value?.raw ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await fetch(`${this.baseUrl}/v3/configs/config/secrets`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        project: this.project,
        config: this.configName,
        secrets: { [key]: value },
      }),
    });
  }

  async delete(key: string): Promise<void> {
    await fetch(`${this.baseUrl}/v3/configs/config/secrets`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        project: this.project,
        config: this.configName,
        secrets: { [key]: null },
      }),
    });
  }

  async list(): Promise<string[]> {
    try {
      const resp = await fetch(
        `${this.baseUrl}/v3/configs/config/secrets?project=${this.project}&config=${this.configName}`,
        { headers: this.headers },
      );
      if (!resp.ok) return [];
      const body = (await resp.json()) as { secrets?: Record<string, unknown> };
      return body.secrets ? Object.keys(body.secrets) : [];
    } catch {
      return [];
    }
  }
}
