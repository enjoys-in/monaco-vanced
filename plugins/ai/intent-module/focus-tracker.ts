// ── Focus Tracker ──────────────────────────────────────────
// Tracks which panel/view the user is focused on.

export class FocusTracker {
  private current: string | null = null;
  private history: Array<{ panelId: string; timestamp: number }> = [];
  private maxHistory = 50;

  setFocus(panelId: string): string | null {
    const prev = this.current;
    this.current = panelId;
    this.history.push({ panelId, timestamp: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
    return prev;
  }

  getCurrent(): string | null {
    return this.current;
  }

  getHistory(): Array<{ panelId: string; timestamp: number }> {
    return [...this.history];
  }
}
