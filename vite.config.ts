import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@sankofa/browser": path.resolve(
        __dirname,
        "../../sdks/sankofa_sdk_web/packages/browser/src/index.ts",
      ),
      "@sankofa/replay-rrweb": path.resolve(
        __dirname,
        "../../sdks/sankofa_sdk_web/packages/replay-rrweb/src/index.ts",
      ),
    },
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: ["@sankofa/browser", "@sankofa/replay-rrweb"],
  },
  server: {
    port: 5173,
  },
});
