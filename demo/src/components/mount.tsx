// ── React mount bridge — renders React components into wireframe DOM ─

import { createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { ExplorerIconAPI } from "../explorer";
import type { MockFsAPI } from "../mock-fs";
import type { DOMRefs } from "../wireframe/types";
import { ThemeProvider } from "./theme";
import { SettingsPanel } from "./settings";
import { WelcomePage } from "./welcome";
import { TabBar } from "./tabs";
import { Breadcrumbs } from "./tabs";
import { Shell, type ShellHandle } from "./shell";

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
  themeApi?: { apply(id: string): Promise<void>; getIndex(): { id: string; file: string }[]; getThemes(): { id: string; name: string; type: string; colors: Record<string, string> }[]; getCurrent(): string };
  extensionApi?: { enable(id: string): void; disable(id: string): void };
}

let settingsRoot: Root | null = null;
let welcomeRoot: Root | null = null;
let tabBarRoot: Root | null = null;
let breadcrumbRoot: Root | null = null;

export function mountReactComponents({
  settingsEl, welcomeEl, eventBus, recentFiles,
  tabListEl, breadcrumbEl, titleCenterEl, iconApi, fsApi, themeApi, extensionApi,
}: MountOptions) {
  const emit = (ev: string, payload: unknown) => eventBus.emit(ev, payload);

  // Mount Settings
  if (!settingsRoot) {
    settingsRoot = createRoot(settingsEl);
  }
  settingsRoot.render(
    <ThemeProvider eventBus={eventBus}>
      <SettingsPanel emit={emit} themeApi={themeApi} extensionApi={extensionApi} />
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

// ── React Shell — renders the IDE chrome as React ────────────
let shellRoot: Root | null = null;

export function buildReactShell(rootEl: HTMLElement, eventBus: InstanceType<typeof EventBus>): DOMRefs {
  rootEl.innerHTML = "";
  rootEl.style.cssText = "display:flex;flex-direction:column;height:100%;width:100%;overflow:hidden;";

  const shellRef = createRef<ShellHandle>();

  if (!shellRoot) {
    shellRoot = createRoot(rootEl);
  }

  // flushSync ensures the DOM is ready before we read refs
  flushSync(() => {
    shellRoot!.render(
      <ThemeProvider eventBus={eventBus}>
        <Shell ref={shellRef} rootEl={rootEl} />
      </ThemeProvider>,
    );
  });

  return shellRef.current!.getDOMRefs();
}

export function unmountReactShell() {
  shellRoot?.unmount();
  shellRoot = null;
}
