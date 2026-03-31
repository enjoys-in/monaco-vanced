// ── Profile State ──────────────────────────────────────────
// Tracks authenticated user profile for the header.

import type { UserProfile } from "./types";

export class ProfileState {
  private profile: UserProfile | null = null;

  update(profile: UserProfile | null): void {
    this.profile = profile;
  }

  get(): UserProfile | null {
    return this.profile;
  }

  isLoggedIn(): boolean {
    return this.profile !== null;
  }

  dispose(): void {
    this.profile = null;
  }
}
