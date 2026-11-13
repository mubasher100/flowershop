import { defineConfig, devices } from "@playwright/test"

/**
 * Journey tests: a phone walks each job the florist does, for real, against a
 * test backend (local by default, staging in CI). Never point these at the
 * live shop; they add, change and delete flowers.
 */
const APP = process.env.SHOP_APP_URL || "http://localhost:5174"

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: APP,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"], viewport: { width: 375, height: 740 } } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
})
