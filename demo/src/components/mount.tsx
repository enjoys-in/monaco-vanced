// ── React mount bridge — renders React components into wireframe DOM ─

import { createRoot, type Root } from "react-dom/client";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { ExplorerIconAPI } from "../explorer";
import type { MockFsAPI } from "../mock-fs";
import { ThemeProvider } from "./theme";
import { SettingsPanel } from "./settings";
import { WelcomePage } from "./welcome";
import { TabBar } from "./tabs";
import { Breadcrumbs } from "./tabs";

interface MountOptions {
  settingsEl: HTMLElement;
  welcomeEl: HTMLElement;
  eventBus: InstanceType<typeof EventBus>;
  recentFiles: { uri: string; name: string }[];
  tabListEl?: HTMLElement;
  breadcrumbEl?: HTMLElement;
  titleCenterEl?: HTMLElement;
  iconApi?: ExplorerIconAPI;
  fsApi?: MockFsAPI;
}

let settingsRoot: Root | null = null;
let welcomeRoot: Root | null = null;
let tabBarRoot: Root | null = null;
let breadcrumbRoot: Root | null = null;

export function mountReactComponents({
  settingsEl, welcomeEl, eventBus, recentFiles,
  tabListEl, breadcrumbEl, titleCenterEl, iconApi, fsApi,
}: MountOptions) {
  const emit = (ev: string, payload: unknown) => eventBus.emit(ev, payload);

  // Mount Settings
  if (!settingsRoot) {
    settingsRoot = createRoot(settingsEl);
  }
  settingsRoot.render(
    <ThemeProvider eventBus={eventBus}>
      <SettingsPanel emit={emit} />
    </ThemeProvider>,
  );

  // Mount Welcome
  if (!welcomeRoot) {
    welcomeRoot = createRoot(welcomeEl);
  }
  welcomeRoot.render(
    <ThemeProvider eventBus={eventBus}>
      <WelcomePage emit={emit} recentFiles={recentFiles} />
    </ThemeProvider>,
  );

  // Mount TabBar (React tabs)
  if (tabListEl) {
    if (!tabBarRoot) {
      tabBarRoot = createRoot(tabListEl);
    }
    tabBarRoot.render(
      <ThemeProvider eventBus={eventBus}>
        <TabBar
          eventBus={eventBus}
          iconApi={iconApi}
          onActiveChange={(_uri, label) => {
            if (titleCenterEl) titleCenterEl.textContent = label;
          }}
        />
      </ThemeProvider>,
    );
  }

  // Mount Breadcrumbs
  if (breadcrumbEl) {
    if (!breadcrumbRoot) {
      breadcrumbRoot = createRoot(breadcrumbEl);
    }
    breadcrumbRoot.render(
      <ThemeProvider eventBus={eventBus}>
        <Breadcrumbs eventBus={eventBus} fsApi={fsApi} iconApi={iconApi} />
      </ThemeProvider>,
    );
  }
}

export function unmountReactComponents() {
  settingsRoot?.unmount();
  welcomeRoot?.unmount();
  tabBarRoot?.unmount();
  breadcrumbRoot?.unmount();
  settingsRoot = null;
  welcomeRoot = null;
  tabBarRoot = null;
  breadcrumbRoot = null;
}
