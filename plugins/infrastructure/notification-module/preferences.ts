// ── Notification Module — Preferences ─────────────────────────

import type { NotificationType } from "./types";

interface CategoryPrefs {
  muted: boolean;
  customDuration?: number;
}

const STORAGE_KEY = "monaco-vanced-notification-prefs";

export class NotificationPreferences {
  private categories = new Map<string, CategoryPrefs>();
  private typeDurations = new Map<NotificationType, number>();
  private globalMute = false;

  constructor() {
    this.restore();
  }

  mute(category: string): void {
    const existing = this.categories.get(category) ?? { muted: false };
    existing.muted = true;
    this.categories.set(category, existing);
    this.persist();
  }

  unmute(category: string): void {
    const existing = this.categories.get(category);
    if (existing) {
      existing.muted = false;
      this.categories.set(category, existing);
      this.persist();
    }
  }

  isMuted(category: string): boolean {
    if (this.globalMute) return true;
    return this.categories.get(category)?.muted ?? false;
  }

  setGlobalMute(muted: boolean): void {
    this.globalMute = muted;
    this.persist();
  }

  isGloballyMuted(): boolean {
    return this.globalMute;
  }

  setDurationForType(type: NotificationType, duration: number): void {
    this.typeDurations.set(type, duration);
    this.persist();
  }

  getDurationForType(type: NotificationType): number | undefined {
    return this.typeDurations.get(type);
  }

  setCategoryDuration(category: string, duration: number): void {
    const existing = this.categories.get(category) ?? { muted: false };
    existing.customDuration = duration;
    this.categories.set(category, existing);
    this.persist();
  }

  getCategoryDuration(category: string): number | undefined {
    return this.categories.get(category)?.customDuration;
  }

  getMutedCategories(): string[] {
    const muted: string[] = [];
    for (const [cat, prefs] of this.categories) {
      if (prefs.muted) muted.push(cat);
    }
    return muted;
  }

  reset(): void {
    this.categories.clear();
    this.typeDurations.clear();
    this.globalMute = false;
    localStorage.removeItem(STORAGE_KEY);
  }

  private persist(): void {
    try {
      const data = {
        categories: Object.fromEntries(this.categories),
        typeDurations: Object.fromEntries(this.typeDurations),
        globalMute: this.globalMute,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // silent fail
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.categories) {
        for (const [k, v] of Object.entries(data.categories)) {
          this.categories.set(k, v as CategoryPrefs);
        }
      }
      if (data.typeDurations) {
        for (const [k, v] of Object.entries(data.typeDurations)) {
          this.typeDurations.set(k as NotificationType, v as number);
        }
      }
      this.globalMute = Boolean(data.globalMute);
    } catch {
      // silent fail
    }
  }
}
