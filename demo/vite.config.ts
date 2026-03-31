import { defineConfig } from "vite";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: resolve(__dirname),
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@core": resolve(__dirname, "../core"),
      "@plugins": resolve(__dirname, "../plugins"),
      "monaco-vanced": resolve(__dirname, "../src/index.ts"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
