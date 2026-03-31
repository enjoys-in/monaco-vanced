// ── Version Manager ────────────────────────────────────────

import type { APIVersion } from "./types";

export class VersionManager {
  private version: APIVersion;

  constructor(initial: APIVersion = { major: 1, minor: 0, patch: 0 }) {
    this.version = { ...initial };
  }

  get(): APIVersion {
    return { ...this.version };
  }

  set(v: APIVersion): void {
    this.version = { ...v };
  }

  toString(): string {
    const { major, minor, patch, label } = this.version;
    return `${major}.${minor}.${patch}${label ? `-${label}` : ""}`;
  }

  static parse(semver: string): APIVersion {
    const [core, label] = semver.split("-", 2);
    const [major, minor, patch] = core.split(".").map(Number);
    return { major: major ?? 0, minor: minor ?? 0, patch: patch ?? 0, label };
  }

  compare(other: APIVersion): number {
    if (this.version.major !== other.major) return this.version.major - other.major;
    if (this.version.minor !== other.minor) return this.version.minor - other.minor;
    return this.version.patch - other.patch;
  }

  isCompatible(required: APIVersion): boolean {
    // Major must match, minor/patch must be >= required
    if (this.version.major !== required.major) return false;
    if (this.version.minor < required.minor) return false;
    if (this.version.minor === required.minor && this.version.patch < required.patch) return false;
    return true;
  }
}
