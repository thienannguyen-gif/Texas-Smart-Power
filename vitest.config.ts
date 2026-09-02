import { defineConfig } from "vitest/config";

// Root suite: API handlers (api/) and shared pipeline code (pipeline/).
// The frontend has its own Vitest config in frontend/vite.config.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["api/**/*.test.ts", "pipeline/**/*.test.ts"],
    exclude: ["**/node_modules/**", "frontend/**"],
  },
});
