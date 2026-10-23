import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@packet/fixture": resolve("fixtures/sample-decks/packet.ts"),
      ...Object.fromEntries(
        [
          "document-model",
          "motion-engine",
          "camera-engine",
          "editor-core",
          "database",
          "component-registry",
        ].map((p) => [`@packet/${p}`, resolve(`packages/${p}/src/index.ts`)]),
      ),
    },
  },
});
