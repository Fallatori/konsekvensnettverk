import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // e2e/ holds Playwright specs (run via `npm run test:e2e`), not Vitest -
    // the two runners' default include globs otherwise overlap.
    exclude: ["node_modules/**", "e2e/**"],
  },
});
