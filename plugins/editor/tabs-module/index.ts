// ── Tabs plugin — tab strip, open/close, dirty state, ordering ──
import type { MonacoPlugin, PluginContext } from "@core/types";
import { TabState } from "./tab-state";
import { ModelEvents, TabEvents, FileEvents } from "@core/events";

export function createTabsPlugin(): MonacoPlugin {
  let tabState: TabState;

  return {
    id: "tabs-module",
    name: "Tabs Module",
    version: "1.0.0",
    description: "Tab strip management — open, close, switch, dirty, pin, reorder",
    dependencies: ["editor-module"],
    priority: 90,
    defaultEnabled: true,

    onMount(ctx: PluginContext) {
      tabState = new TabState(ctx);

      // model:create → open tab
      ctx.on(ModelEvents.Create, (payload) => {
        const { uri } = payload as { uri: string; language: string };
        tabState.open(uri);
      });

      // tab:dirty from model-manager content changes
      ctx.on(TabEvents.Dirty, (payload) => {
        const { uri, dirty } = payload as { uri: string; dirty: boolean };
        tabState.setDirty(uri, dirty);
      });

      // file:written → mark clean
      ctx.on(FileEvents.Written, (payload) => {
        const { path } = payload as { path: string };
        tabState.setDirty(path, false);
      });

      // file:close → close tab
      ctx.on(FileEvents.Close, (payload) => {
        const { path } = payload as { path: string };
        tabState.close(path);
      });
    },

    onDispose() {
      tabState?.clear();
    },
  };
}

export { TabState } from "./tab-state";
export type { TabEntry, TabGroup } from "./types";
