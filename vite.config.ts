import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "core"),
      "@plugins": resolve(__dirname, "plugins"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MonacoVanced",
      formats: ["es", "cjs"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "cjs"}`,
    },
    rollupOptions: {
      external: ["monaco-editor"],
      output: {
        globals: {
          "monaco-editor": "monaco",
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
