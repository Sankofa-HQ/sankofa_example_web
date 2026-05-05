import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Local Sankofa packages are aliased to their `src/` entry points
// (not their built `dist/`) so source edits land in the sandbox via
// normal HMR. They're also excluded from optimizeDeps so Vite doesn't
// pre-bundle the published `dist/` and serve a stale snapshot —
// that's the bug we hit when the @sankofa/pulse build was rebuilt
// but the sandbox kept rendering yesterday's CSS until .vite/deps was
// manually cleared.
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
      "@sankofa/pulse": path.resolve(
        __dirname,
        "../../sdks/sankofa_sdk_web/packages/pulse/src/index.ts",
      ),
    },
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: ["@sankofa/browser", "@sankofa/replay-rrweb", "@sankofa/pulse"],
  },
  server: {
    port: 5173,
  },
});
