import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, expect, chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pathToExtension = path.resolve(__dirname, '../../add-on')

const ipfsApiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5001'
const customGatewayUrl = process.env.CUSTOM_GATEWAY_URL || 'http://localhost:8080'

// Load the unpacked extension into a persistent Chromium context and expose its
// id (taken from the MV3 service worker). Standard Playwright extension setup.
const test = base.extend({
  context: async ({}, use) => { // eslint-disable-line no-empty-pattern
    const context = await chromium.launchPersistentContext('', {
      // MV3 extensions only load in headed Chromium; CI runs this under a
      // virtual display (xvfb).
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--lang=en-GB,en-US'
      ]
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (worker == null) worker = await context.waitForEvent('serviceworker')
    await use(new URL(worker.url()).host)
  }
})

async function setExtensionOption (page, extensionId, id, value) {
  // the options page can reload itself on first run, interrupting goto; ignore
  // that and wait for the field before typing.
  await page.goto(`chrome-extension://${extensionId}/dist/options/options.html`).catch(() => {})
  const input = page.locator(`#${id}`)
  await expect(input).toBeVisible()
  // the choo-controlled input re-renders from the store, so a single fill can
  // be reverted; retry the type-and-commit until the value sticks.
  await expect(async () => {
    await input.click()
    await input.fill('')
    await input.fill(value)
    await input.press('Tab')
    await expect(input).toHaveValue(value)
  }).toPass({ timeout: 20_000 })
}

// e2e needs a built extension, a running Kubo node, and an opt-in flag.
test.skip(process.env.TEST_E2E !== 'true', 'set TEST_E2E=true to run the e2e suite')

test.describe('ipfs-companion in chromium', () => {
  test('connects to the node and reports peers', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await setExtensionOption(page, extensionId, 'ipfsApiUrl', ipfsApiUrl)
    await setExtensionOption(page, extensionId, 'customGatewayUrl', customGatewayUrl)

    await page.goto(`chrome-extension://${extensionId}/dist/landing-pages/welcome/index.html`)
    const peers = page.locator("xpath=//p[text()='Your node is connected to ']/span")
    await expect.poll(async () => parseInt(await peers.textContent(), 10), {
      timeout: 30_000
    }).toBeGreaterThan(0)
  })

  test('resolves ipfs urls through the local gateway', async ({ context, extensionId }) => {
    const page = await context.newPage()
    await setExtensionOption(page, extensionId, 'ipfsApiUrl', ipfsApiUrl)
    await setExtensionOption(page, extensionId, 'customGatewayUrl', customGatewayUrl)

    const cases = [{
      initialUrl: 'https://ipfs.io/ipfs/QmTqZhR6f7jzdhLgPArDPnsbZpvvgxzCZycXK7ywkLxSyU?filename=ipfs-logo.3ea91a2f.svg',
      finalUrl: 'http://bafybeicrwkoherkuzwp2zk3cd4jc3miwp7mrkz2blxrd5afbdibqv5ivo4.ipfs.localhost:8080/?filename=ipfs-logo.3ea91a2f.svg'
    }, {
      initialUrl: 'https://docs.ipfs.tech',
      finalUrl: 'http://docs.ipfs.tech.ipns.localhost:8080/'
    }, {
      initialUrl: 'https://en.wikipedia-on-ipfs.org/wiki/InterPlanetary_File_System',
      finalUrl: 'http://en.wikipedia-on-ipfs.org.ipns.localhost:8080/wiki/InterPlanetary_File_System'
    }]

    for (const { initialUrl, finalUrl } of cases) {
      // best-effort DNSLink resolves async and redirects a later request once
      // cached, so re-navigate until the extension lands us on the gateway URL.
      // waitUntil 'commit' avoids blocking on the redirected page's full load.
      await expect.poll(async () => {
        await page.goto(initialUrl, { waitUntil: 'commit', timeout: 30_000 }).catch(() => {})
        return page.url()
      }, { timeout: 90_000, intervals: [1000, 2000, 3000, 5000] }).toBe(finalUrl)
    }
  })
})
