// ── AWS Secrets Manager Provider ───────────────────────────

import type { SecretProvider } from "../types";

export interface AWSSecretsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export class AWSSecretsProvider implements SecretProvider {
  readonly name = "aws";
  private readonly config: AWSSecretsConfig;
  private readonly baseUrl: string;

  constructor(config: AWSSecretsConfig) {
    this.config = config;
    this.baseUrl =
      config.endpoint ?? `https://secretsmanager.${config.region}.amazonaws.com`;
  }

  async get(key: string): Promise<string | null> {
    try {
      const resp = await this.request("GetSecretValue", { SecretId: key });
      if (!resp.ok) return null;
      const body = (await resp.json()) as { SecretString?: string };
      return body.SecretString ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    // Try update first, create if not exists
    const existing = await this.get(key);
    if (existing !== null) {
      await this.request("PutSecretValue", { SecretId: key, SecretString: value });
    } else {
      await this.request("CreateSecret", { Name: key, SecretString: value });
    }
  }

  async delete(key: string): Promise<void> {
    await this.request("DeleteSecret", {
      SecretId: key,
      ForceDeleteWithoutRecovery: true,
    });
  }

  async list(): Promise<string[]> {
    try {
      const resp = await this.request("ListSecrets", {});
      if (!resp.ok) return [];
      const body = (await resp.json()) as { SecretList?: Array<{ Name: string }> };
      return body.SecretList?.map((s) => s.Name) ?? [];
    } catch {
      return [];
    }
  }

  private async request(action: string, payload: Record<string, unknown>): Promise<Response> {
    // SigV4 signing stub — in production use a full AWS SDK or signing library
    return fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `secretsmanager.${action}`,
        "X-Amz-Region": this.config.region,
        Authorization: `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/stub`,
      },
      body: JSON.stringify(payload),
    });
  }
}
