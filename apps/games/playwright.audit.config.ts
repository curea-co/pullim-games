import { defineConfig, devices } from "@playwright/test";

// Audit controls use isolated HTML; the landing check uses the documented app.
// No injected authentication or shared storage state is needed.
export default defineConfig({
  testDir: "e2e",
  testMatch: "ui-audit.spec.js",
  workers: 2,
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3004" },
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3004",
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
