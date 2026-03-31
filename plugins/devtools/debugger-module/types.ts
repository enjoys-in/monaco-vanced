// ── Debugger Module — Shared Types ───────────────────────────

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  condition?: string;
  hitCount?: number;
  enabled: boolean;
}

export interface StackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
  scopes: VariableScope[];
}

export interface VariableScope {
  name: string;
  variablesReference: number;
}

export interface Variable {
  name: string;
  value: string;
  type: string;
  children?: Variable[];
  variablesReference?: number;
}

export type DebugState = "stopped" | "running" | "disconnected";

export interface DebugSession {
  id: string;
  name: string;
  type: string;
  state: DebugState;
}

export interface DebugConfig {
  adapterUrl?: string;
  launchConfig?: Record<string, unknown>;
}

export interface DebugModuleAPI {
  setBreakpoint(file: string, line: number, condition?: string): Breakpoint;
  removeBreakpoint(id: string): void;
  getBreakpoints(): Breakpoint[];
  launch(config?: Record<string, unknown>): Promise<void>;
  continue(): Promise<void>;
  stepOver(): Promise<void>;
  stepInto(): Promise<void>;
  stepOut(): Promise<void>;
  getStack(): StackFrame[];
  getVariables(frameId: number): Variable[];
  terminate(): Promise<void>;
}
