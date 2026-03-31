// ── Embed Module — Shared Types ──────────────────────────────

export interface EmbedConfig {
  /** DOM container ID to mount the editor */
  containerId: string;
  /** Editor options to apply when embedded */
  options?: Record<string, unknown>;
  /** Sandbox permissions for iframe embedding */
  sandboxPermissions?: string[];
}

export interface EmbedMessage {
  /** Message type identifier */
  type: string;
  /** Arbitrary payload */
  payload: unknown;
  /** Origin source identifier */
  source: string;
}

export interface EmbedModuleAPI {
  /** Mount editor into a container element */
  mount(containerId: string, options?: Record<string, unknown>): void;
  /** Unmount embedded editor */
  unmount(): void;
  /** Send a message to parent/child frame */
  sendMessage(msg: EmbedMessage): void;
  /** Register a handler for incoming messages */
  onMessage(handler: (msg: EmbedMessage) => void): void;
  /** Check if editor is running inside an iframe */
  isEmbedded(): boolean;
}
