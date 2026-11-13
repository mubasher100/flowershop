/// <reference types="vitest" />
import react from "@vitejs/plugin-react"
import path from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // The delivery label, receipt and gift card are printed by the same code
      // as the admin's, so the two can never print different paperwork.
      "@admin-lib": path.resolve(__dirname, "../backend/src/admin/lib"),
    },
  },
  // The brand file and fonts live in the storefront; allow importing them.
  server: { fs: { allow: [path.resolve(__dirname, "..")] } },
  build: { sourcemap: true },
  // Logic tests only; the phone journeys in e2e/ run under Playwright.
  test: { include: ["src/**/*.test.ts"] },
})
