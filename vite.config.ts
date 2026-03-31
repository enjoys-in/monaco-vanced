import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync, statSync } from "fs";

// ── Collect every plugin entry point ─────────────────────────
function collectPluginEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  const pluginsDir = resolve(__dirname, "plugins");
  for (const category of readdirSync(pluginsDir)) {
    const catDir = resolve(pluginsDir, category);
    if (!statSync(catDir).isDirectory()) continue;
    for (const mod of readdirSync(catDir)) {
      const modDir = resolve(catDir, mod);
      const idx = resolve(modDir, "index.ts");
      try {
        if (statSync(idx).isFile()) {
          entries[`plugins/${category}/${mod}/index`] = idx;
        }
      } catch { /* no index.ts */ }
    }
  }
  return entries;
}

// ── Collect core entry points ────────────────────────────────
function collectCoreEntries(): Record<string, string> {
  const entries: Record<string, string> = {};
  const coreDir = resolve(__dirname, "core");
  for (const file of readdirSync(coreDir)) {
    if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      const name = file.replace(/\.ts$/, "");
      entries[`core/${name}`] = resolve(coreDir, file);
    }
  }
  // core/events barrel
  const eventsIdx = resolve(coreDir, "events/index.ts");
  try { if (statSync(eventsIdx).isFile()) entries["core/events/index"] = eventsIdx; } catch {}
  return entries;
}

const pluginEntries = collectPluginEntries();
const coreEntries = collectCoreEntries();

export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "core"),
      "@plugins": resolve(__dirname, "plugins"),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        ...coreEntries,
        ...pluginEntries,
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: ["monaco-editor"],
      output: {
        globals: {
          "monaco-editor": "monaco",
        },
        // Preserve module directory structure
        preserveModules: false,
      },
    },
    sourcemap: true,
    minify: false,
  },
});
