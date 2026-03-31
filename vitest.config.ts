import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "context"],
  },
  resolve: {
    alias: {
      "@core": resolve(__dirname, "core"),
      "@plugins": resolve(__dirname, "plugins"),
    },
  },
});
