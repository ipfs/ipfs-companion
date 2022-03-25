import debug from "debug";
const log = debug("ipfs-companion:main");
log.error = debug("ipfs-companion:main:error");

import browser, { Runtime } from "webextension-polyfill";
import { create } from "ipfs-http-client";
import IsIpfs from "is-ipfs";
import QuickLRU from "quick-lru";
import createDnslinkResolver from "./dns-link";
import createNotifier from "./notifier";
import createRuntimeChecks from "./runtime-checks"
import createIpfsPathValidator, {
  safeHostname,
  isNewTabURL,
} from "./ipfs-path";
import createRequestModifier from "./request-modifier";
import initState, { PageInfo } from "./state";
import { optionDefaults, storeMissingOptions } from "./options";
import { offlinePeerCount } from "./constants";

export async function init() {
  // Cache for async URL2CID resolution used by browser action
  // (resolution happens off-band so UI render is not blocked with sometimes expensive DHT traversal)
  const resolveCache = new QuickLRU({ maxSize: 10, maxAge: 1000 * 30 });

  let lifeline: Runtime.Port;
  let browserActionPort;
  let apiStatusUpdateInterval;
  let notify;
  let client;
  let dnslinkResolver;
  let ipfsPathValidator;
  let runtime;
  let state;

  try {
    log("init");
    await storeMissingOptions(
      await browser.storage.local.get(),
      optionDefaults,
      browser.storage.local
    );
    const options = await browser.storage.local.get(optionDefaults);
    state = initState(options);
    console.log('initState', state, options);
    client = create({ url: `${state.apiURLString}api/v0` });
    ipfsPathValidator = createIpfsPathValidator(
      getState,
      client,
      dnslinkResolver
    );
    notify = createNotifier(getState);
    runtime = await createRuntimeChecks(browser);
    dnslinkResolver = createDnslinkResolver(getState, client);
  } catch (error) {
    console.log("Unable to initialize addon due to error", error);
    log.error("Unable to initialize addon due to error", error);
    if (notify) notify("notify_addonIssueTitle", "notify_addonIssueMsg");
    throw error;
  }

  function getState() {
    return state;
  }

  browser.runtime.onConnect.addListener((port: Runtime.Port) => {
    // This keepalive hack is required because wake up of webextension
    // worker in MV3 has been broken in Chromium for 2+ years
    // See: https://bugs.chromium.org/p/chromium/issues/detail?id=1024211
    if (port.name === "keepAlive") {
      lifeline = port;
      setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
      port.onDisconnect.addListener(keepAliveForced);
    }
  });

  // firefox specific requests
  const modifyRequest = createRequestModifier(getState, runtime);
  browser.webRequest.onBeforeSendHeaders.addListener(
    modifyRequest.onBeforeSendHeaders,
    { urls: ["<all_urls>"] },
    ["blocking", "requestHeaders"]
  );

  function keepAliveForced() {
    if (lifeline) lifeline.disconnect();
    lifeline = null;
    keepAlive();
  }

  async function keepAlive() {
    console.log('blah blah');
    if (lifeline) return;
    for (const tab of await browser.tabs.query({ url: "*://*/*" })) {
      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => browser.runtime.connect({ name: "keepAlive" }),
        });
        browser.tabs.onUpdated.removeListener(retryOnTabUpdate);
        return;
      } catch (e) {
        console.error(e);
      }
    }
    browser.tabs.onUpdated.addListener(retryOnTabUpdate);
  }

  async function clearDynamicRules() {
    browser.declarativeNetRequest.getDynamicRules((rules) => {
      browser.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map((r) => r.id),
      });
    });
  }

  async function retryOnTabUpdate(tabId, info) {
    state.currentTabId = tabId;
    if (isNewTabURL(info.url) || IsIpfs.url(info.url)) {
      state.showReloadNotification = false;
      return;
    }
    const currentUrl = new URL(info.url);
    const dnslinkURL = await dnslinkResolver.readAndCacheDnslink(
      currentUrl.host
    );
    if (dnslinkURL) state.showReloadNotification = true;
  }

  // chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
  //   (info) => {
  //     console.log('rule matched: ', info)
  //   }
  // )

  browser.runtime.onConnect.addListener(function (port) {
    browserActionPort = port;
    browserActionPort.onMessage.addListener(handleMessageFromBrowserAction);
    browserActionPort.onDisconnect.addListener(() => {
      browserActionPort = null;
    });
    sendStatusUpdateToBrowserAction();
  });

  function handleMessageFromBrowserAction(message) {
    if (message.title) {
      switch (message.title) {
        case "reload":
          chrome.tabs.reload(state.currentTabId, {}, () => {
            state.showReloadNotification = false;
          });
          break;
        case "notify":
          // eslint-disable-next-line no-case-declarations
          const { titleKey, messageKey, messageParam } = message.data;
          notify(titleKey, messageKey, messageParam);
          break;
        case "power:off":
          state.active = false;
          state.peerCount = offlinePeerCount;
          apiStatusUpdate();
          break;
        case "power:on":
          state.active = true;
          setApiStatusUpdateInterval(2500);
          break;
        default:
          console.warn("Unknown browser action message event", message);
          break;
      }
    } else {
      console.error("improper port message: ", message);
    }
  }

  // TODO continue hacking away at this method for current tab info.
  async function sendStatusUpdateToBrowserAction() {
    console.log('sendStatusUpdateToBrowserAction');
    if (!browserActionPort) return;
    const dropSlash = (url) => url.replace(/\/$/, "");
    const currentTab = await browser.tabs
      .query({
        active: true,
        // currentWindow: true
      })
      .then((tabs) => tabs[0]);
    const { version } = browser.runtime.getManifest();
    const info: PageInfo = {
      version,
      active: state.active,
      peerCount: state.peerCount,
      gwURLString: dropSlash(state.gwURLString),
      pubGwURLString: dropSlash(state.pubGwURLString),
      // webuiRootUrl: dropSlash(state.webuiRootUrl),
      // importDir: state.importDir,
      // openViaWebUI: state.openViaWebUI,
      apiURLString: dropSlash(state.apiURLString),
      // redirect: state.redirect,
      // enabledOn: state.enabledOn,
      // disabledOn: state.disabledOn,
      // newVersion: state.dismissedUpdate !== version ? version : null,
      currentTab,
      isIpfsContext: false,
      currentTabPublicUrl: null,
      currentTabContentPath: null,
      currentTabImmutablePath: "",
      currentTabPermalink: undefined,
      currentTabCid: "",
      currentDnslinkFqdn: undefined,
      currentFqdn: undefined,
      isRedirectContext: false,
      showReloadNotification: state.showReloadNotification,
    };
    // try {
    //   const v = await client.version()
    //   if (v) {
    //     info.gatewayVersion = v.commit ? v.version + '/' + v.commit : v.version
    //   }
    // } catch (error) {
    //   info.gatewayVersion = null
    // }
    if (state.active && info.currentTab) {
      const url = info.currentTab.url;
      info.isIpfsContext = await ipfsPathValidator.isIpfsPageActionsContext(
        url
      );
      if (info.isIpfsContext) {
        info.currentTabPublicUrl = ipfsPathValidator.resolveToPublicUrl(url);
        info.currentTabContentPath = ipfsPathValidator.resolveToIpfsPath(url);
        if (resolveCache.has(url)) {
          const [immutableIpfsPath, permalink, cid] = resolveCache.get(url);
          info.currentTabImmutablePath = immutableIpfsPath;
          info.currentTabPermalink = permalink;
          info.currentTabCid = cid;
        } else {
          // run async resolution in the next event loop so it does not block the UI
          setTimeout(async () => {
            resolveCache.set(url, [
              await ipfsPathValidator.resolveToImmutableIpfsPath(url),
              await ipfsPathValidator.resolveToPermalink(url),
              await ipfsPathValidator.resolveToCid(url),
            ]);
            await sendStatusUpdateToBrowserAction();
          }, 0);
        }
        // TODO: fix the typing on these
        info.currentDnslinkFqdn = dnslinkResolver.findDNSLinkHostname(url);
        info.currentFqdn = info.currentDnslinkFqdn || safeHostname(url);
        // info.currentTabIntegrationsOptOut = !state.activeIntegrations(info.currentFqdn)
        info.isRedirectContext =
          info.currentFqdn &&
          ipfsPathValidator.isRedirectPageActionsContext(url);
      }
    }
    // Still here?
    if (browserActionPort) {
      browserActionPort.postMessage({ statusUpdate: info });
    }
  }

  // API STATUS UPDATES
  // -------------------------------------------------------------------
  // API is polled for peer count every ipfsApiPollMs

  async function setApiStatusUpdateInterval(ipfsApiPollMs) {
    if (apiStatusUpdateInterval) {
      clearInterval(apiStatusUpdateInterval);
    }
    if (!state.active) return;
    apiStatusUpdateInterval = setInterval(
      () => apiStatusUpdate(),
      ipfsApiPollMs
    );
    await apiStatusUpdate();
  }

  setApiStatusUpdateInterval(2500);

  async function apiStatusUpdate() {
    console.log('apiStatusUpdate');
    state.peerCount = await getSwarmPeerCount();
    await Promise.all([
      // contextMenus.update(),
      sendStatusUpdateToBrowserAction(),
    ]);
  }

  async function getSwarmPeerCount() {
    if (!client || !state.active) return offlinePeerCount;
    try {
      const peerInfos = await client.swarm.peers({ timeout: 2500 });
      return peerInfos.length;
    } catch (error) {
      console.error(`Error while client.swarm.peers: ${error}`);
      return offlinePeerCount;
    }
  }

  clearDynamicRules();
  keepAlive();
}
