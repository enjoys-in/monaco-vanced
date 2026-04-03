// ── React mount bridge — renders React components into wireframe DOM ─

import { createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { TitlebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { ExplorerIconAPI } from "../explorer";
import type { MockFsAPI } from "../mock-fs";
import type { DOMRefs } from "../wireframe/types";
import { ThemeProvider } from "./theme";
import { SettingsPanel } from "./settings";
import { WelcomePage } from "./welcome";
import { TabBar } from "./tabs";
import { Breadcrumbs } from "./tabs";
import type { ChatIndexerApi } from "./ai-chat/types";
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
    console.log("[mount] TabBar mounting into tabListEl", { hasIconApi: !!iconApi, el: tabListEl.tagName });
    if (!tabBarRoot) {
      tabBarRoot = createRoot(tabListEl);
    }
    tabBarRoot.render(
      <ThemeProvider eventBus={eventBus}>
        <TabBar
          eventBus={eventBus}
          iconApi={iconApi}
          onActiveChange={(_uri, label) => {
            eventBus.emit(TitlebarEvents.Update, { fileName: label });
          }}
        />
      </ThemeProvider>,
    );
  } else {
    console.warn("[mount] TabBar NOT mounted — tabListEl is falsy");
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

export function buildReactShell(
  rootEl: HTMLElement,
  eventBus: InstanceType<typeof EventBus>,
  extras?: {
    authApi?: { isAuthenticated(): boolean; getSession(): { user?: { name?: string; email?: string } } | null; login(provider: string): Promise<void>; logout(): void };
    commandApi?: { execute(id: string, ...args: unknown[]): void; search?(query: string): { id: string; label?: string }[]; getAll?(): { id: string; label?: string }[] | string[] };
    statusbarApi?: { getItems(align: "left" | "right"): { id: string; label: string; tooltip?: string; alignment?: "left" | "right"; command?: string; visible?: boolean }[] };
    contextMenuApi?: { dismiss(): void };
    aiApi?: { chat(messages: { role: string; content: string }[], opts?: Record<string, unknown>): Promise<{ content: string; metadata?: Record<string, unknown> }>; abort(): void; getStatus(): string };
    indexerApi?: ChatIndexerApi;
    iconApi?: { getFileIcon(filename: string, isDirectory?: boolean, isOpen?: boolean): string };
    layoutApi?: { getRegisteredViews(location: "bottom"): { id: string; label: string; icon?: string; isWebview?: boolean; webviewContainer?: HTMLElement }[] };
    files?: { uri: string; name: string }[];
  },
): DOMRefs {
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
        <Shell
          ref={shellRef}
          rootEl={rootEl}
          eventBus={eventBus}
          authApi={extras?.authApi}
          commandApi={extras?.commandApi}
          statusbarApi={extras?.statusbarApi}
          contextMenuApi={extras?.contextMenuApi}
          aiApi={extras?.aiApi}
          indexerApi={extras?.indexerApi}
          iconApi={extras?.iconApi}
          layoutApi={extras?.layoutApi}
          files={extras?.files}
        />
      </ThemeProvider>,
    );
  });

  return shellRef.current!.getDOMRefs();
}

export function unmountReactShell() {
  shellRoot?.unmount();
  shellRoot = null;
}
