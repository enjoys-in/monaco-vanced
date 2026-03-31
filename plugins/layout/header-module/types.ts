// ── Header Module Types ────────────────────────────────────

export interface MenuEntry {
  readonly id: string;
  readonly label: string;
  readonly keybinding?: string;
  readonly icon?: string;
  readonly disabled?: boolean;
  readonly children?: MenuEntry[];
  readonly action?: string; // Command ID to execute
}

export interface HeaderSection {
  readonly left?: string[];
  readonly center?: string[];
  readonly right?: string[];
}

export interface HeaderConfig {
  readonly title?: string;
  readonly logo?: string;
  readonly sections?: HeaderSection;
  readonly menus?: MenuEntry[];
  readonly showWindowControls?: boolean;
  readonly showSearch?: boolean;
  readonly showProfile?: boolean;
}

export interface UserProfile {
  readonly name: string;
  readonly email?: string;
  readonly avatarUrl?: string;
}

export interface HeaderState {
  readonly title: string;
  readonly profile: UserProfile | null;
  readonly aiStatus: "idle" | "thinking" | "error";
  readonly notificationCount: number;
  readonly menus: MenuEntry[];
}

export interface HeaderModuleAPI {
  getState(): HeaderState;
  setTitle(title: string): void;
  setMenus(menus: MenuEntry[]): void;
  updateProfile(profile: UserProfile | null): void;
  setAIStatus(status: "idle" | "thinking" | "error"): void;
  setNotificationCount(count: number): void;
}
