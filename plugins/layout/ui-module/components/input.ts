// ── Input Component Logic ──────────────────────────────────
// Headless input state management with validation.

import type { InputConfig } from "../types";

export class InputState {
  private value: string;
  private error: string | null = null;
  private readonly validation?: (value: string) => string | null;

  constructor(config: InputConfig) {
    this.value = config.value ?? "";
    this.validation = config.validation;
  }

  getValue(): string {
    return this.value;
  }

  setValue(value: string): { value: string; error: string | null } {
    this.value = value;
    this.error = this.validate(value);
    return { value: this.value, error: this.error };
  }

  getError(): string | null {
    return this.error;
  }

  validate(value?: string): string | null {
    const v = value ?? this.value;
    if (!this.validation) return null;
    this.error = this.validation(v);
    return this.error;
  }

  isValid(): boolean {
    return this.error === null;
  }

  clear(): void {
    this.value = "";
    this.error = null;
  }
}

/**
 * Debounced input handler factory.
 */
export function createDebouncedHandler(
  handler: (value: string) => void,
  delayMs = 300,
): (value: string) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (value: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => handler(value), delayMs);
  };
}
