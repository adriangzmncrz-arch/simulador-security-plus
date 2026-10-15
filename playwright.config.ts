import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "1100-claro", use: { ...devices["Desktop Chrome"], viewport: { width: 1100, height: 900 }, colorScheme: "light" } },
    { name: "400-oscuro", use: { ...devices["Desktop Chrome"], viewport: { width: 400, height: 860 }, isMobile: true, hasTouch: true, colorScheme: "dark" } },
  ],
  // Prueba el sitio construido, igual que en GitHub Pages.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
