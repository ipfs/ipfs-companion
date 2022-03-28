"use strict";
/* eslint-env browser, webextensions */

import { offlinePeerCount } from "./constants";
import { safeURL } from "./options";

export type PageInfo = {
  version: string;
  active: boolean;
  // ipfsNodeType: state.ipfsNodeType,
  peerCount: number;
  gwURLString: string;
  pubGwURLString: string;
  // webuiRootUrl: URL;
  // importDir: string;
  // openViaWebUI: state.openViaWebUI,
  apiURLString: string;
  // redirect: boolean,
  // enabledOn: boolean,
  // disabledOn: boolean,
  // newVersion: boolean,
  currentTab: unknown;
  isIpfsContext: boolean;
  currentTabPublicUrl: null | URL;
  currentTabContentPath: null | string;
  currentTabImmutablePath: null | string;
  currentTabPermalink: null | URL;
  currentTabCid: null | string;
  currentDnslinkFqdn: null | URL;
  currentFqdn: null | URL;
  // currentTabIntegrationsOptOut: boolean;
  isRedirectContext: boolean;
  showReloadNotification: boolean;
};

export default function initState(options, overrides?) {
  // we store options and some pregenerated values to avoid async storage
  // reads and minimize performance impact on overall browsing experience
  const state = Object.assign({}, options);
  // generate some additional values
  state.online = true;
  state.active = true;
  state.peerCount = offlinePeerCount;
  state.pubGwURL = safeURL(options.publicGatewayUrl);
  state.pubGwURLString = state.pubGwURL.toString();
  delete state.publicGatewayUrl;
  state.pubSubdomainGwURL = safeURL(options.publicSubdomainGatewayUrl);
  state.pubSubdomainGwURLString = state.pubSubdomainGwURL.toString();
  delete state.publicSubdomainGatewayUrl;
  state.redirect = options.useCustomGateway;
  delete state.useCustomGateway;
  state.apiURL = safeURL(options.ipfsApiUrl, { useLocalhostName: false }); // go-ipfs returns 403 if IP is beautified to 'localhost'
  state.apiURLString = state.apiURL.toString();
  delete state.ipfsApiUrl;
  state.gwURL = safeURL(options.customGatewayUrl, {
    useLocalhostName: state.useSubdomains,
  });
  state.gwURLString = state.gwURL.toString();
  delete state.customGatewayUrl;
  state.currentTabId = 0;

  // TODO state.connected ~= state.peerCount > 0
  // TODO state.nodeActive ~= API is online,eg. state.peerCount > offlinePeerCount
  Object.defineProperty(state, "webuiRootUrl", {
    get: function () {
      // Did user opt-in for rolling release published on DNSLink?
      if (state.useLatestWebUI)
        return `${state.gwURLString}ipns/webui.ipfs.io/`;
      return `${state.apiURLString}webui`;
    },
  });
  // apply optional overrides
  if (overrides) Object.assign(state, overrides);
  return state;
}
