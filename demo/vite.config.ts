import { defineConfig } from "vite";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: resolve(__dirname),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Deep core paths — e.g. @enjoys/monaco-vanced/core/event-bus → core/event-bus.ts
      { find: "@enjoys/monaco-vanced/core/events", replacement: resolve(__dirname, "../core/events/index.ts") },
      { find: /^@enjoys\/monaco-vanced\/core\/(.+)$/, replacement: resolve(__dirname, "../core/$1.ts") },
      // Deep plugin paths — e.g. @enjoys/monaco-vanced/layout/ui-module → plugins/layout/ui-module/index.ts
      { find: /^@enjoys\/monaco-vanced\/(.+)$/, replacement: resolve(__dirname, "../plugins/$1/index.ts") },
      // Bare package — barrel entry
      { find: "@enjoys/monaco-vanced", replacement: resolve(__dirname, "../src/index.ts") },
      // Internal aliases — needed by the package source tree during dev
      { find: "@core", replacement: resolve(__dirname, "../core") },
      { find: "@plugins", replacement: resolve(__dirname, "../plugins") },
    ],
  },
  server: {
    port: 5173,
    open: true,
  },
});
