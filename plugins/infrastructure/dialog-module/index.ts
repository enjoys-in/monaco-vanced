// ── Dialog Module — Plugin Entry ───────────────────────────────

import type { MonacoPlugin, PluginContext, IDisposable } from "@core/types";
import type { DialogConfig, DialogModuleAPI, DialogResult, QuickPickItem, QuickPickOptions } from "./types";
import { QuickPick } from "./quick-pick";
import { DialogRenderer } from "./renderer";
import { TrustStore } from "./trust-store";
import { DialogEvents } from "@core/events";

export type { DialogConfig, DialogModuleAPI, DialogResult, DialogType, DialogAction, DialogField, QuickPickItem, QuickPickOptions } from "./types";
export { QuickPick } from "./quick-pick";
export { DialogRenderer } from "./renderer";
export { TrustStore } from "./trust-store";

export function createDialogPlugin(_config: Partial<DialogConfig> = {}): {
  plugin: MonacoPlugin;
  api: DialogModuleAPI;
} {
  const renderer = new DialogRenderer();
  const quickPick = new QuickPick();
  const _trustStore = new TrustStore(); void _trustStore;
  const activeDialogs: DialogConfig[] = [];
  const disposables: IDisposable[] = [];
  let ctx: PluginContext | null = null;

  function trackDialog(cfg: DialogConfig): void {
    activeDialogs.push(cfg);
  }

  function untrackDialog(id: string): void {
    const idx = activeDialogs.findIndex((d) => d.id === id);
    if (idx >= 0) activeDialogs.splice(idx, 1);
  }

  const api: DialogModuleAPI = {
    async showConfirm(cfg: Omit<DialogConfig, "type">): Promise<DialogResult> {
      const fullConfig: DialogConfig = {
        ...cfg,
        type: "confirm",
        actions: cfg.actions ?? [
          { id: "cancel", label: "Cancel" },
          { id: "confirm", label: "Confirm", primary: true },
        ],
      };
      trackDialog(fullConfig);
      const { promise } = renderer.renderModal(fullConfig);
      const result = await promise;
      untrackDialog(fullConfig.id ?? "");
      return result;
    },

    async showInput(cfg: Omit<DialogConfig, "type">): Promise<DialogResult> {
      const fullConfig: DialogConfig = {
        ...cfg,
        type: "input",
        fields: cfg.fields ?? [
          { id: "input", label: "Value", type: "text", placeholder: "Enter value..." },
        ],
        actions: cfg.actions ?? [
          { id: "cancel", label: "Cancel" },
          { id: "submit", label: "Submit", primary: true },
        ],
      };
      trackDialog(fullConfig);
      const { promise } = renderer.renderModal(fullConfig);
      const result = await promise;
      untrackDialog(fullConfig.id ?? "");
      return result;
    },

    async showCustom(cfg: DialogConfig): Promise<DialogResult> {
      trackDialog(cfg);
      const { promise } = renderer.renderModal(cfg);
      const result = await promise;
      untrackDialog(cfg.id ?? "");
      return result;
    },

    async showQuickPick(
      items: QuickPickItem[],
      options?: QuickPickOptions,
    ): Promise<QuickPickItem | QuickPickItem[] | null> {
      return quickPick.show(items, options);
    },

    close(id: string): void {
      renderer.close(id);
      untrackDialog(id);
    },

    getActive(): DialogConfig[] {
      return [...activeDialogs];
    },
  };

  const plugin: MonacoPlugin = {
    id: "infrastructure.dialog",
    name: "Dialog Module",
    version: "1.0.0",
    description: "Modal dialogs, quick pick, trust store",

    onMount(pluginCtx: PluginContext) {
      ctx = pluginCtx;

      disposables.push(
        ctx.on("dialog:show", async (data?: unknown) => {
          const cfg = data as DialogConfig | undefined;
          if (cfg) {
            const result = await api.showCustom(cfg);
            ctx?.emit(DialogEvents.Result, result);
          }
        }),
      );

      disposables.push(
        ctx.on("dialog:close", (data?: unknown) => {
          const d = data as { id?: string } | undefined;
          if (d?.id) api.close(d.id);
        }),
      );
    },

    onDispose() {
      disposables.forEach((d) => d.dispose());
      disposables.length = 0;
      renderer.closeAll();
      activeDialogs.length = 0;
      ctx = null;
    },
  };

  return { plugin, api };
}
