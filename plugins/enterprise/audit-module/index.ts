// ── Audit Module ───────────────────────────────────────────

import type { MonacoPlugin, PluginContext } from "@core/types";
import type { AuditConfig, AuditEvent, AuditExporter, AuditFilter, AuditModuleAPI, AuditStats, RedactConfig } from "./types";
import { AuditCollector } from "./collector";
import { Redactor } from "./redactor";
import { AuditEvents } from "@core/events";

export type { AuditConfig, AuditEvent, AuditExporter, AuditFilter, AuditModuleAPI, AuditStats, RedactConfig };
export { AuditCollector, Redactor };
export { ConsoleExporter } from "./exporters/console";
export { HttpExporter } from "./exporters/http";
export { KafkaExporter } from "./exporters/kafka";
export { S3Exporter } from "./exporters/s3";

export function createAuditPlugin(
  config: AuditConfig = {},
): { plugin: MonacoPlugin; api: AuditModuleAPI } {
  const collector = new AuditCollector(config.bufferSize);
  const redactor = config.redactFields?.length
    ? new Redactor({ fields: config.redactFields })
    : null;

  if (config.exporters) {
    for (const exp of config.exporters) {
      collector.addExporter(exp);
    }
  }

  let ctx: PluginContext | null = null;

  const api: AuditModuleAPI = {
    log(event: Omit<AuditEvent, "id" | "timestamp">): void {
      let full = collector.log(event);
      if (redactor) full = redactor.redact(full);
      ctx?.emit(AuditEvents.Event, { id: full.id, actor: full.actor, action: full.action });
    },

    query(filter: AuditFilter): AuditEvent[] {
      return collector.query(filter);
    },

    addExporter(exporter: AuditExporter): void {
      collector.addExporter(exporter);
    },

    async flush(): Promise<void> {
      await collector.flush();
      ctx?.emit(AuditEvents.Flush, undefined);
    },

    getStats(): AuditStats {
      return collector.getStats();
    },
  };

  const plugin: MonacoPlugin = {
    id: "audit-module",
    name: "Audit Module",
    version: "1.0.0",
    description: "Enterprise audit logging with exporters and field redaction",

    onMount(pluginCtx: PluginContext): void {
      ctx = pluginCtx;
    },

    onDispose(): void {
      void collector.flush();
      ctx = null;
    },
  };

  return { plugin, api };
}
