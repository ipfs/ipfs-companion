import { Builder, By, Key } from 'selenium-webdriver'
import { describe, it, before } from 'mocha'
import { expect } from 'chai'
import fs from 'fs'
import chrome from 'selenium-webdriver/chrome.js'
import firefox from 'selenium-webdriver/firefox.js'

async function delay (ms) {
  return new Promise(res => setTimeout(res, ms), _ => {})
}

function getVersion () {
  return process.env.IPFS_COMPANION_VERSION || JSON.parse(fs.readFileSync('add-on/manifest.common.json')).version
}

async function openChromiumBrowser () {
  console.info('Opening Chromium browser')
  const extension = `build/ipfs_companion-${getVersion()}_chromium.zip`
  console.info(`Checking if ${extension} exists`)
  expect(fs.existsSync(extension)).to.be.true // eslint-disable-line no-unused-expressions
  const options = new chrome.Options()
  options.addExtensions(extension)
  options.addArguments('--lang=en-GB,en-US')
  if (process.env.TEST_HEADLESS === '1') {
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
  await delay(5000) // waiting for the browser/extension to load
  console.info('Chromium is ready')
  return browser
}

async function openFirefoxBrowser () {
  console.info('Opening Firefox browser')
  const extension = `build/ipfs_companion-${getVersion()}_firefox.zip`
  console.info(`Checking if ${extension} exists`)
  expect(fs.existsSync(extension)).to.be.true // eslint-disable-line no-unused-expressions
  const options = new firefox.Options()
  options.setPreference('intl.accept_languages', 'en-gb,en-us')
  options.setPreference('intl.locale.requested', 'en-GB,en-US')
  if (process.env.TEST_HEADLESS === '1') {
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
  const browser = builder.build()
  console.info('Installing the extension')
  await browser.installAddon(extension, true)
  await delay(5000) // waiting for the browser/extension to load
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
    const extensionURL = ExtensionURLRegex.exec(url)?.at(0)
    if (extensionURL !== undefined) {
      console.info(`Found the extension URL: ${extensionURL}`)
      return extensionURL
    }
  }
  console.error('No extension URL found')
}

async function updateExtensionSettings (browser, url, id, value) {
  console.info('Updating extension setting')
  console.info(`Going to: ${url}/dist/options/options.html`)
  await browser.get(`${url}/dist/options/options.html`)
  console.info(`Looking for an element: ${id}`)
  let element = browser.findElement(By.id(id))
  console.info(`Setting new value to: ${value}`)
  await element.sendKeys('')
  await delay(1000) // waiting for focus to be acquired
  await element.clear()
  await delay(1000) // waiting for input to be cleared
  await element.sendKeys(value)
  await element.sendKeys(Key.TAB)
  await delay(5000) // waiting for the setting to be applied
  console.info('Checking if the update worked')
  element = browser.findElement(By.id(id))
  const v = await element.getAttribute('value')
  expect(v).to.equal(value)
  console.info('The setting update is complete')
}

async function getNumberOfConnectedPeers (browser, url) {
  console.info('Checking the number of connected peers')
  console.info(`Going to: ${url}/dist/landing-pages/welcome/index.html`)
  await browser.get(`${url}/dist/landing-pages/welcome/index.html`)
  await delay(5000) // waiting for the connection number to appear
  const html = await browser.getPageSource()
  console.debug(html)
  console.info('Looking for an element with text: \'Your node is connected to ...\'')
  const p = browser.findElement(By.xpath("//p[text()='Your node is connected to ']"))
  const span = p.findElement(By.css('span'))
  const peers = await span.getText()
  console.info(`There are ${peers} connected peers`)
  return parseInt(peers)
}

async function runTest (browser) {
  const url = await findExtensionUrl(browser)
  expect(url).not.to.be.undefined // eslint-disable-line no-unused-expressions
  await updateExtensionSettings(browser, url, 'ipfsApiUrl', process.env.IPFS_API_URL || 'http://127.0.0.1:5001')
  await updateExtensionSettings(browser, url, 'customGatewayUrl', process.env.CUSTOM_GATEWAY_URL || 'http://localhost:8080')
  const peers = await getNumberOfConnectedPeers(browser, url)
  expect(peers).not.to.equal(0)
}

describe('ipfs-companion', function () {
  before(() => {
    if (process.env.TEST_E2E !== '1') {
      this.skip()
    }
  })
  it('should be able to discover peers in Chromium', async function () {
    const browser = await openChromiumBrowser()
    try {
      await runTest(browser)
    } finally {
      await browser.quit()
    }
  })
  it('should be able to discover peers in Firefox', async function () {
    const browser = await openFirefoxBrowser()
    try {
      await runTest(browser)
    } finally {
      await browser.quit()
    }
  })
})
