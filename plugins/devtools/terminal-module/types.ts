// ── Terminal Module — Shared Types ────────────────────────────

export interface TerminalSession {
  id: string;
  label: string;
  cwd: string;
  createdAt: number;
  active: boolean;
}

export interface TerminalConfig {
  maxSessions?: number;
  defaultShell?: string;
  fontSize?: number;
}

export interface TerminalModuleAPI {
  createSession(label?: string, cwd?: string): TerminalSession;
  closeSession(id: string): void;
  getSession(id: string): TerminalSession | undefined;
  getSessions(): TerminalSession[];
  write(id: string, data: string): void;
  onData(id: string, handler: (data: string) => void): () => void;
  getActive(): TerminalSession | undefined;
  setActive(id: string): void;
}
