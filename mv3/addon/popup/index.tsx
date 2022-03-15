/* eslint quotes: 0 */
/* eslint jsx-quotes: ["error", "prefer-double"] */

import { h, render } from "preact";
import browser from "webextension-polyfill";

import copyTextToClipboard from "./utils";

let popupState = {
  peerCount: 0,
  online: false,
  on: false,
  apiURL: "localhost:5000",
  version: "ALPHA",
  newVersionAvailable: false,
  webviewURL: "WEBVIEW URL NOT PRESENT",
};

const port = browser.runtime.connect({
  name: "port-2-background",
});
port.onMessage.addListener((msg) => {
  console.log("message received", msg);
  if (msg.statusUpdate) {
    console.log(msg.statusUpdate);
    popupState = Object.assign({}, popupState, msg.statusUpdate);
    App = <NewTab props={popupState} />;
    render(App, document.getElementById("root"));
  }
});

function notify(titleKey, messageKey, messageParam) {
  port.postMessage({
    title: "notify",
    data: {
      titleKey,
      messageKey,
      messageParam,
    },
  });
}

const NewTab = (props) => {
  // console.log('NEW TAB PROPS', props)
  const {
    isIpfsContext = false,
    currentTabPublicUrl,
    // currentTabContentPath,
    // currentTabImmutablePath,
    currentTabCid,
    // currentDnslinkFqdn,
    // currentFqdn,
    peerCount,
    online,
    active,
    apiURLString,
    // version,
    // newVersionAvailable,
    // webviewURL,
    gatewayUrl,
  } = props.props;
  let { showReloadNotification } = props.props;
  const openOptionPage = () => {
    browser.runtime
      .openOptionsPage()
      .then(() => window.close())
      .catch((err) => {
        console.error(
          "runtime.openOptionsPage() failed, opening options page in tab instead.",
          err
        );
        // brave: fallback to opening options page as a tab.
        browser.tabs.create({
          url: browser.runtime.getURL("/options/options.html"),
        });
      });
  };

  const companionPowerBtn = () => {
    console.log("companionPowerBtn called");
    if (!active) {
      port.postMessage({
        title: "power:on",
      });
    } else {
      port.postMessage({
        title: "power:off",
      });
    }
  };

  const reloadTab = () => {
    showReloadNotification = false;
    port.postMessage({
      title: "reload",
    });
  };

  // const contextMenuCopyCanonicalAddress = () => {
  //   copyTextToClipboard(currentDnslinkFqdn, notify);
  // };

  // const contextMenuCopyCidAddress = () => {
  //   copyTextToClipboard(currentTabImmutablePath, notify);
  // };

  const contextMenuCopyRawCid = () => {
    copyTextToClipboard(currentTabCid, notify);
  };

  const contextMenuCopyAddressAtPublicGw = () => {
    copyTextToClipboard(currentTabPublicUrl, notify);
  };

  // const update = () => {
  //   console.log("update called");
  // };
  // const openWebview = () => {
  //   console.log("openWebview called");
  // };
  const openAboutPage = () => {
    console.log("openAboutPage called");
  };
  const openImportPage = () => {
    console.log("openImportPage called");
  };
  const pinToNode = () => {
    console.log("pinToNode called");
  };
  return (
    <div>
      {/* <!-- global popup --> */}
      <div className="ipfs-gradient-0">
        <header className="flex justify-between">
          {/* <!-- branding section --> */}
          <div className="flex">
            <div className="pa3" onClick={openAboutPage}>
              <img
                alt="IPFS"
                width={56}
                height={56}
                src={browser.runtime.getURL("/icons/ipfs-logo-on.svg")}
              />
            </div>
            <div className="flex flex-column">
              <div>
                <h1 className="pt3 ma0">IPFS</h1>
              </div>
              <span>
                <div title="version" className="tc">
                  {online ? (
                    <span title="The version of IPFS your local node is using">
                      0.11.0
                    </span>
                  ) : (
                    <span title="Your local node is offline">Offline</span>
                  )}
                </div>
              </span>
            </div>
          </div>

          {/* <!-- control section --> */}
          <div className="flex pa3">
            {/* <!-- power button --> */}
            <div className="button-icon" onClick={companionPowerBtn}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 86 86"
                className="fill-current-color"
                style="width:22px; height:22px"
              >
                <path d="M50 20.11A29.89 29.89 0 1 0 79.89 50 29.89 29.89 0 0 0 50 20.11zm-3.22 17a3.22 3.22 0 0 1 6.44 0v6.43a3.22 3.22 0 0 1-6.44 0zM50 66.08a16.14 16.14 0 0 1-11.41-27.49 3.28 3.28 0 0 1 1.76-.65 2.48 2.48 0 0 1 2.42 2.41 2.58 2.58 0 0 1-.77 1.77A10.81 10.81 0 0 0 38.59 50a11.25 11.25 0 0 0 22.5 0 10.93 10.93 0 0 0-3.21-7.88 3.37 3.37 0 0 1-.65-1.77 2.48 2.48 0 0 1 2.42-2.41 2.16 2.16 0 0 1 1.76.65A16.14 16.14 0 0 1 50 66.08z" />
              </svg>
            </div>

            {/* <!-- options button --> */}
            <div className="button-icon" onClick={openOptionPage}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 86 86"
                class="fill-current-color"
                style="width:22px; height:22px"
              >
                <path d="M74.05 50.23c-.07-3.58 1.86-5.85 5.11-7.1-.2-2-2.48-7.45-3.63-8.76-3.11 1.46-6.06 1.23-8.54-1.22s-2.72-5.46-1.26-8.64a29.24 29.24 0 0 0-8.8-3.63c-1.06 3.08-3.12 5-6.35 5.25-3.82.29-6.29-1.69-7.61-5.22a30.11 30.11 0 0 0-8.77 3.67c1.5 3.16 1.3 6.1-1.15 8.6s-5.45 2.76-8.64 1.29a29.33 29.33 0 0 0-3.58 8.79C24 44.43 25.94 46.62 26 50s-1.82 5.84-5.1 7.12a29.21 29.21 0 0 0 3.68 8.71c3.09-1.38 6-1.15 8.42 1.22s2.79 5.33 1.41 8.49a29.72 29.72 0 0 0 8.76 3.57 1.46 1.46 0 0 0 .11-.21 7.19 7.19 0 0 1 13.53-.16c.13.33.28.32.55.25a29.64 29.64 0 0 0 8-3.3 4 4 0 0 0 .37-.25c-1.27-2.86-1.15-5.57.88-7.94 2.44-2.84 5.5-3.26 8.91-1.8a29.23 29.23 0 0 0 3.65-8.7c-3.17-1.22-5.05-3.38-5.12-6.77zM50 59.54a8.57 8.57 0 1 1 8.59-8.31A8.58 8.58 0 0 1 50 59.54z" />
              </svg>
            </div>
          </div>
        </header>

        {/* <!-- global info --> */}
        <div class="flex flex-column f6">
          <div
            class="flex flex-row justify-between ph2 pv1 cursor-help"
            title="The number of other IPFS nodes you can connect to"
          >
            <div>
              <span class="">Peers</span>
            </div>
            <div>
              <span title={peerCount} class="">
                {peerCount}
              </span>
            </div>
          </div>

          <div
            class="flex flex-row justify-between ph2 pv1 cursor-help"
            title="The URL of the gateway, either public or local, you are using to fetch content (change this in Preferences)"
          >
            <div>
              <span class="">Gateway</span>
            </div>
            <div>
              <span title={gatewayUrl} class="">
                {gatewayUrl}
              </span>
            </div>
          </div>

          <div
            class="flex flex-row justify-between ph2 pv1 cursor-help"
            title="The URL of the gateway, either public or local, you are using to fetch content (change this in Preferences)"
          >
            <div>
              <span class="">API</span>
            </div>
            <div>
              <span title={apiURLString} class="">
                {apiURLString}
              </span>
            </div>
          </div>
        </div>

        {/* <!-- global buttons --> */}
        <div class="flex justify-between">
          <div class="pa3" onClick={openImportPage}>
            <a class="f6 link dim ba ph3 pv2 mb2 dib black" href="#0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                class="nb2"
                width="22px"
                height="22px"
              >
                <path
                  fill="currentColor"
                  d="M71.13 28.87a29.88 29.88 0 100 42.26 29.86 29.86 0 000-42.26zm-18.39 37.6h-5.48V52.74H33.53v-5.48h13.73V33.53h5.48v13.73h13.73v5.48H52.74z"
                />
              </svg>
              Import
            </a>
          </div>

          <div class="pa3" onClick={pinToNode}>
            <a class="f6 link dim ba ph3 pv2 mb2 dib black" href="#0">
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 100 100"
                  class="nb2"
                  width="22px"
                  height="22px"
                >
                  <path
                    fill="currentColor"
                    d="M69.69 20.57c-.51-.51-1.06-1-1.62-1.47l-.16-.1c-.56-.46-1.15-.9-1.76-1.32l-.5-.35c-.25-.17-.52-.32-.79-.48A28.27 28.27 0 0050 12.23h-.69a28.33 28.33 0 00-27.52 28.36c0 13.54 19.06 37.68 26 46a3.21 3.21 0 005 0c6.82-8.32 25.46-32.25 25.46-45.84a28.13 28.13 0 00-8.56-20.18zM51.07 49.51a9.12 9.12 0 119.13-9.12 9.12 9.12 0 01-9.13 9.12z"
                  />
                </svg>
              </span>
              My node
            </a>
          </div>
        </div>

        {/* <!-- global notification --> */}

        {showReloadNotification && (
          <div class="center mw7" onClick={reloadTab}>
            <aside class="refresh-button f6 link dim ba ph3 pv2 mb2 dib black tc">
              <span class="f7" style="color: #8f8b8b;">
                IPFS version detected
              </span>
              <p class="ma0 pa0">Click to load current page on IPFS</p>
            </aside>
          </div>
        )}
      </div>

      {/* <!--==================================================== -->
      <!-- page context items --> */}

      {isIpfsContext ? (
        <div>
          <h4 class="current-tab-heading ph2">Current tab</h4>
          <div class="flex flex-column tc">
            <div>
              <a
                class="f5 dib pb2 black flex flex-column current-tab-button"
                onClick={contextMenuCopyAddressAtPublicGw}
              >
                <p class="mb1 mt2 pa1">Copy sharable link</p>
                <span class="f7 truncate ph2">{currentTabPublicUrl}</span>
              </a>
            </div>

            <div>
              <a
                class="f5 dib pb2 black flex flex-column current-tab-button"
                onClick={contextMenuCopyRawCid}
              >
                <p class="mb1 mt2 pa1">Copy CID</p>
                <span class="f7 truncate ph2">{currentTabCid}</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

let App = <NewTab props={popupState} />;

render(App, document.getElementById("root"));
