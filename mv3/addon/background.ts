import browser, { Runtime } from "webextension-polyfill";

import { create } from "ipfs-http-client";
import IsIpfs from "is-ipfs";
const check = String.fromCodePoint(0x2714);

let lifeline: Runtime.Port;
const client = create({ url: "http://localhost:5001/api/v0" });

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

function keepAliveForced() {
  if (lifeline) lifeline.disconnect();
  lifeline = null;
  keepAlive();
}

async function keepAlive() {
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

function isNewTabURL(url) {
  if (!url) return true;
  return url.includes("chrome://");
}

async function resolveDNSAndAddRule(domain) {
  const contentPath = await client.resolve(`/ipns/${domain}`);
  if (!contentPath) return;

  const id = Math.floor(Math.random() * 29999);
  browser.declarativeNetRequest.updateDynamicRules(
    {
      addRules: [
        {
          id: id,
          priority: 1,
          action: {
            type: "redirect",
            redirect: { url: `https://dweb.link${contentPath}` },
          },
          condition: { urlFilter: domain, resourceTypes: ["main_frame"] },
        },
      ],
    },
    () => {
      console.log(
        `Added rule ${id}, contentPath: ${contentPath}, domain: ${domain}. Will redirect to ipfs gateway on next page load ${check}`
      );
    }
  );
}

async function clearDynamicRules() {
  browser.declarativeNetRequest.getDynamicRules((rules) => {
    browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
    });
  });
}

async function retryOnTabUpdate(tabId, info) {
  if (isNewTabURL(info.url) || IsIpfs.url(info.url)) return;

  const currentUrl = new URL(info.url);
  await resolveDNSAndAddRule(currentUrl.host);
}

clearDynamicRules();
keepAlive();
