import { equal, fail, notEqual } from 'assert'
import { expect } from 'chai'
import { backOff } from 'exponential-backoff'
import fs from 'fs'
import { before, describe, it } from 'mocha'
import { Builder, By, Key } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import firefox from 'selenium-webdriver/firefox.js'

function getExtension (browserName) {
  const version = process.env.IPFS_COMPANION_VERSION || JSON.parse(fs.readFileSync('add-on/manifest.common.json')).version
  return `build/ipfs_companion-${version}_${browserName}.zip`
}

async function openChromium (extension) {
  console.info('Opening Chromium browser')
  const options = new chrome.Options()
  if (extension !== undefined) {
    options.addExtensions(extension)
  }
  options.addArguments('--lang=en-GB,en-US')
  if (process.env.TEST_HEADLESS === 'true') {
    options.addArguments('--headless=chrome')
  }
  const builder = new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
  if (process.env.SELENIUM_REMOTE_CHROMIUM_URL !== undefined) {
    console.info(`Using remote webdriver: ${process.env.SELENIUM_REMOTE_CHROMIUM_URL}`)
    builder.usingServer(process.env.SELENIUM_REMOTE_CHROMIUM_URL)
  }
  console.info('Starting Chromium')
  const browser = await builder.build()
  console.info('Chromium is ready')
  return browser
}

async function openFirefox (extension) {
  console.info('Opening Firefox browser')
  const options = new firefox.Options()
  options.setPreference('intl.accept_languages', 'en-gb,en-us')
  options.setPreference('intl.locale.requested', 'en-GB,en-US')
  if (process.env.TEST_HEADLESS === 'true') {
    options.addArguments('--headless')
  }
  const builder = new Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
  if (process.env.SELENIUM_REMOTE_FIREFOX_URL !== undefined) {
    console.info(`Using remote webdriver: ${process.env.SELENIUM_REMOTE_FIREFOX_URL}`)
    builder.usingServer(process.env.SELENIUM_REMOTE_FIREFOX_URL)
  }
  console.info('Starting Firefox')
  const browser = await builder.build()
  if (extension !== undefined) {
    console.info('Installing the extension')
    await browser.installAddon(extension, true)
  }
  console.info('Firefox is ready')
  return browser
}

const ExtensionURLRegex = /^(moz|chrome)-extension:\/\/[^\/]+/ // eslint-disable-line no-useless-escape
async function findExtensionUrl (browser) {
  console.info('Looking for an open extension tab')
  const handles = await browser.getAllWindowHandles()
  console.info(`Found ${handles.length} candidates`)

  for (const handle of handles) {
    console.info('Switching tabs')
    await browser.switchTo().window(handle)
    const url = await browser.getCurrentUrl()
    console.info(`The current URL is: ${url}`)
    /**
     * Read line-209 for why this is commented out.
     * if the extension wants permissions, this happens in firefox for host permission.
     * this might happen in chromium in the future.
     * if (url.includes('landing-pages/permissions/request.html')) {
     *   //By.tagName is deprecated, replacement is called By.css() for some reason.
     *   browser.findElement(By.css('button')).click()
     * }
     */
    const extensionURL = ExtensionURLRegex.exec(url)?.at(0)
    if (extensionURL !== undefined) {
      console.info(`Found the extension URL: ${extensionURL}`)
      return extensionURL
    }
  }
  console.warn('No extension URL found')
}

async function updateExtensionSettings (browser, url, id, value) {
  console.info('Updating extension setting')
  console.info(`Going to: ${url}/dist/options/options.html`)
  await browser.get(`${url}/dist/options/options.html`)
  console.info(`Looking for an element: ${id}`)
  const element = browser.findElement(By.id(id))
  console.info(`Setting new value to: ${value}`)
  await element.sendKeys('')
  await backOff(async () => {
    const activeElement = await browser.switchTo().activeElement()
    const activeElementID = await activeElement.getAttribute('id')
    equal(activeElementID, id, 'The element is not focused yet')
  }, {
    numOfAttempts: 5,
    startingDelay: 500
  })
  await element.clear()
  await backOff(async () => {
    const v = await element.getAttribute('value')
    equal(v, '', 'The element is not cleared yet')
  }, {
    numOfAttempts: 5,
    startingDelay: 500
  })
  await element.sendKeys(value)
  await element.sendKeys(Key.TAB)
  console.info('Checking if the update worked')
  backOff(async () => {
    const e = browser.findElement(By.id(id))
    const v = await e.getAttribute('value')
    equal(v, value, 'The element is not updated yet')
  }, {
    delayFirstAttempt: true,
    numOfAttempts: 5,
    startingDelay: 500
  })
  console.info('The setting update is complete')
}

async function getNumberOfConnectedPeers (browser, url) {
  console.info('Checking the number of connected peers')
  console.info(`Going to: ${url}/dist/landing-pages/welcome/index.html`)
  await browser.get(`${url}/dist/landing-pages/welcome/index.html`)
  console.info('Looking for an element with text: \'Your node is connected to ...\'')
  const peers = await backOff(async () => {
    const p = browser.findElement(By.xpath("//p[text()='Your node is connected to ']"))
    const span = p.findElement(By.css('span'))
    return span.getText()
  }, {
    delayFirstAttempt: true,
    numOfAttempts: 5,
    startingDelay: 500
  })
  console.info(`There are ${peers} connected peers`)
  return parseInt(peers)
}

async function getFinalUrl (browser, initialUrl) {
  await browser.get(initialUrl)
  console.info('Checking the final url')
  const finalUrl = await backOff(async () => {
    const currentUrl = await browser.getCurrentUrl()
    return currentUrl
  }, {
    delayFirstAttempt: true,
    numOfAttempts: 5,
    startingDelay: 500
  })
  return finalUrl
}

async function runBrowserTest (browserName, testFunc) {
  const extension = getExtension(browserName)

  console.info(`Checking if ${extension} exists`)
  expect(fs.existsSync(extension)).to.be.true // eslint-disable-line no-unused-expressions

  let browser
  if (browserName === 'chromium') {
    browser = await openChromium(extension)
  } else if (browserName === 'firefox') {
    browser = await openFirefox(extension)
  } else {
    fail(`unknown browser name: ${browserName}`)
  }

  try {
    const url = await backOff(async () => {
      const u = await findExtensionUrl(browser)
      notEqual(u, undefined, 'Extension URL not found yet')
      return u
    }, {
      delayFirstAttempt: true,
      numOfAttempts: 5,
      startingDelay: 500
    })

    const ipfsApiUrl = process.env.IPFS_API_URL || 'http://127.0.0.1:5001'
    await updateExtensionSettings(browser, url, 'ipfsApiUrl', ipfsApiUrl)

    const customGatewayUrl = process.env.CUSTOM_GATEWAY_URL || 'http://localhost:8080'
    await updateExtensionSettings(browser, url, 'customGatewayUrl', customGatewayUrl)

    return await testFunc(browser, url)
  } finally {
    await browser.quit()
  }
}

describe('ipfs-companion', () => {
  before(function () {
    if (process.env.TEST_E2E !== 'true') {
      this.skip()
    }
  })

  /**
   * [read line-75] firefox is disabled for now, because: https://github.com/w3c/webextensions/issues/227
   * the new host-permission API is optional be default. In a normal UI, the extension shows the permission request
   * screen located at `landing-pages/permissions/request.html`. Clicking on the grant permission button shows a popup
   * which requires further interaction to click "Allow". The selenium driver is unable to interact with the popup.
   * Things Tried:
   *    - using custom profiles.
   *    - Clicking grant permissions button on line-74, but that results in a popup which is not interactable.
   *    - using capabilities (in builder section, to handler alert popups and accept all).
   *      https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/lib/capabilities_exports_Capabilities.html
   *      selenium has different interfaces for chrome permissions, e.g.: https://github.com/SeleniumHQ/selenium/blob/selenium-4.10.0/javascript/node/selenium-webdriver/test/chrome/permission_test.js#L37
   */
  const browsersToTest = ['chromium']

  for (const browserName of browsersToTest) {
    describe(`ipfs-companion in ${browserName}`, () => {
      it(`should be able to install the extension in ${browserName}`, async () => {
        await runBrowserTest(browserName, async (browser, url) => {
          const peers = await getNumberOfConnectedPeers(browser, url)
          expect(peers).not.to.equal(0)
        })
      })

      it(`should resolve urls in ${browserName}`, async () => {
        await runBrowserTest(browserName, async (browser, url) => {
          const urlsToTest = [{
            initialUrl: 'https://ipfs.io/ipfs/QmTqZhR6f7jzdhLgPArDPnsbZpvvgxzCZycXK7ywkLxSyU?filename=ipfs-logo.3ea91a2f.svg',
            finalUrl: 'http://bafybeicrwkoherkuzwp2zk3cd4jc3miwp7mrkz2blxrd5afbdibqv5ivo4.ipfs.localhost:8080/?filename=ipfs-logo.3ea91a2f.svg'
          }, {
            initialUrl: 'https://docs.ipfs.tech',
            finalUrl: 'http://docs.ipfs.tech.ipns.localhost:8080/'
          }, {
            initialUrl: 'https://en.wikipedia-on-ipfs.org/wiki/InterPlanetary_File_System',
            finalUrl: 'http://en.wikipedia-on-ipfs.org.ipns.localhost:8080/wiki/InterPlanetary_File_System'
          }]

          for (const { initialUrl, finalUrl } of urlsToTest) {
            const resolvedUrl = await getFinalUrl(browser, initialUrl)
            expect(resolvedUrl).to.equal(finalUrl)
          }
        })
      })
    })
  }
})
