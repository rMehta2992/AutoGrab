import { defineConfig, devices } from "@playwright/test";
import { env } from "node:process";

export default defineConfig({
  testDir: "./apps/frontend/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm --prefix apps/api run dev",
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: !env.CI,
      timeout: 30_000,
    },
    {
      command:
        "npm --prefix apps/frontend run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !env.CI,
      timeout: 30_000,
    },
  ],
});
