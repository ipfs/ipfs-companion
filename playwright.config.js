import { defineConfig } from '@playwright/test'

// e2e drives a real Chromium with the unpacked extension loaded; it needs a
// prior `npm run build`, a reachable Kubo node, and TEST_E2E=true (the specs
// skip otherwise). Firefox stays out: MV3 optional host-permission prompts are
// not automatable, same reason the selenium suite was Chromium-only.
export default defineConfig({
  testDir: './test/e2e',
  timeout: 300_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './test/e2e/global-setup.js',
  use: {
    locale: 'en-GB'
  }
})
