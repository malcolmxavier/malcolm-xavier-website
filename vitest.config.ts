// ─────────────────────────────────────────────────────────────────
// Vitest config — minimal setup matching the project's `@/` path
// alias and node test environment. We don't currently test
// component rendering (no jsdom), only the brittle correctness
// paths that bit us during the 2026-04-28 audit:
//   • lib/feeds/spotify.ts — endpointFamily, getMusicData
//     snapshot fallback, cooldown tracking
//   • app/music/PlaylistCard.tsx — pickMosaicCovers helper
//
// Run with: npm test
// ─────────────────────────────────────────────────────────────────

import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      // server-only is a Next.js sentinel that throws if imported
      // from a client bundle. In Vitest we're a node test runner,
      // not a bundler, so the package isn't installed and the
      // import fails resolution. Stub it to a no-op.
      "server-only": resolve(__dirname, "./test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
