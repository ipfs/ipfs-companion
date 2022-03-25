(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e2) {
          reject(e2);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e2) {
          reject(e2);
        }
      };
      var step = (x2) => x2.done ? resolve(x2.value) : Promise.resolve(x2.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // node_modules/webextension-polyfill/dist/browser-polyfill.js
  var require_browser_polyfill = __commonJS({
    "node_modules/webextension-polyfill/dist/browser-polyfill.js"(exports, module) {
      (function(global, factory) {
        if (typeof define === "function" && define.amd) {
          define("webextension-polyfill", ["module"], factory);
        } else if (typeof exports !== "undefined") {
          factory(module);
        } else {
          var mod = {
            exports: {}
          };
          factory(mod);
          global.browser = mod.exports;
        }
      })(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : exports, function(module2) {
        "use strict";
        if (typeof browser === "undefined" || Object.getPrototypeOf(browser) !== Object.prototype) {
          const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = "The message port closed before a response was received.";
          const SEND_RESPONSE_DEPRECATION_WARNING = "Returning a Promise is the preferred way to send a reply from an onMessage/onMessageExternal listener, as the sendResponse will be removed from the specs (See https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage)";
          const wrapAPIs = (extensionAPIs) => {
            const apiMetadata = {
              "alarms": {
                "clear": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "clearAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "get": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "bookmarks": {
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getChildren": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getRecent": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getSubTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTree": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeTree": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "browserAction": {
                "disable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "enable": {
                  "minArgs": 0,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "getBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "openPopup": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setBadgeBackgroundColor": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setBadgeText": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "browsingData": {
                "remove": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "removeCache": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCookies": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeDownloads": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFormData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeHistory": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeLocalStorage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePasswords": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removePluginData": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "settings": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "commands": {
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "contextMenus": {
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "cookies": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAllCookieStores": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "set": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "devtools": {
                "inspectedWindow": {
                  "eval": {
                    "minArgs": 1,
                    "maxArgs": 2,
                    "singleCallbackArg": false
                  }
                },
                "panels": {
                  "create": {
                    "minArgs": 3,
                    "maxArgs": 3,
                    "singleCallbackArg": true
                  },
                  "elements": {
                    "createSidebarPane": {
                      "minArgs": 1,
                      "maxArgs": 1
                    }
                  }
                }
              },
              "downloads": {
                "cancel": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "download": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "erase": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFileIcon": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "open": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "pause": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeFile": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "resume": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "extension": {
                "isAllowedFileSchemeAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "isAllowedIncognitoAccess": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "history": {
                "addUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "deleteRange": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "deleteUrl": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getVisits": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "search": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "i18n": {
                "detectLanguage": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAcceptLanguages": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "identity": {
                "launchWebAuthFlow": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "idle": {
                "queryState": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "management": {
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getSelf": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "setEnabled": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "uninstallSelf": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "notifications": {
                "clear": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPermissionLevel": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              },
              "pageAction": {
                "getPopup": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getTitle": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "hide": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setIcon": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "setPopup": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "setTitle": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                },
                "show": {
                  "minArgs": 1,
                  "maxArgs": 1,
                  "fallbackToNoCallback": true
                }
              },
              "permissions": {
                "contains": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "request": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "runtime": {
                "getBackgroundPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getPlatformInfo": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "openOptionsPage": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "requestUpdateCheck": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "sendMessage": {
                  "minArgs": 1,
                  "maxArgs": 3
                },
                "sendNativeMessage": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "setUninstallURL": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "sessions": {
                "getDevices": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getRecentlyClosed": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "restore": {
                  "minArgs": 0,
                  "maxArgs": 1
                }
              },
              "storage": {
                "local": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                },
                "managed": {
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  }
                },
                "sync": {
                  "clear": {
                    "minArgs": 0,
                    "maxArgs": 0
                  },
                  "get": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "getBytesInUse": {
                    "minArgs": 0,
                    "maxArgs": 1
                  },
                  "remove": {
                    "minArgs": 1,
                    "maxArgs": 1
                  },
                  "set": {
                    "minArgs": 1,
                    "maxArgs": 1
                  }
                }
              },
              "tabs": {
                "captureVisibleTab": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "create": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "detectLanguage": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "discard": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "duplicate": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "executeScript": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 0
                },
                "getZoom": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getZoomSettings": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goBack": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "goForward": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "highlight": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "insertCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "move": {
                  "minArgs": 2,
                  "maxArgs": 2
                },
                "query": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "reload": {
                  "minArgs": 0,
                  "maxArgs": 2
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "removeCSS": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "sendMessage": {
                  "minArgs": 2,
                  "maxArgs": 3
                },
                "setZoom": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "setZoomSettings": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "update": {
                  "minArgs": 1,
                  "maxArgs": 2
                }
              },
              "topSites": {
                "get": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "webNavigation": {
                "getAllFrames": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "getFrame": {
                  "minArgs": 1,
                  "maxArgs": 1
                }
              },
              "webRequest": {
                "handlerBehaviorChanged": {
                  "minArgs": 0,
                  "maxArgs": 0
                }
              },
              "windows": {
                "create": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "get": {
                  "minArgs": 1,
                  "maxArgs": 2
                },
                "getAll": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getCurrent": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "getLastFocused": {
                  "minArgs": 0,
                  "maxArgs": 1
                },
                "remove": {
                  "minArgs": 1,
                  "maxArgs": 1
                },
                "update": {
                  "minArgs": 2,
                  "maxArgs": 2
                }
              }
            };
            if (Object.keys(apiMetadata).length === 0) {
              throw new Error("api-metadata.json has not been included in browser-polyfill");
            }
            class DefaultWeakMap extends WeakMap {
              constructor(createItem, items = void 0) {
                super(items);
                this.createItem = createItem;
              }
              get(key) {
                if (!this.has(key)) {
                  this.set(key, this.createItem(key));
                }
                return super.get(key);
              }
            }
            const isThenable = (value) => {
              return value && typeof value === "object" && typeof value.then === "function";
            };
            const makeCallback = (promise, metadata) => {
              return (...callbackArgs) => {
                if (extensionAPIs.runtime.lastError) {
                  promise.reject(new Error(extensionAPIs.runtime.lastError.message));
                } else if (metadata.singleCallbackArg || callbackArgs.length <= 1 && metadata.singleCallbackArg !== false) {
                  promise.resolve(callbackArgs[0]);
                } else {
                  promise.resolve(callbackArgs);
                }
              };
            };
            const pluralizeArguments = (numArgs) => numArgs == 1 ? "argument" : "arguments";
            const wrapAsyncFunction = (name, metadata) => {
              return function asyncFunctionWrapper(target, ...args) {
                if (args.length < metadata.minArgs) {
                  throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
                }
                if (args.length > metadata.maxArgs) {
                  throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
                }
                return new Promise((resolve, reject) => {
                  if (metadata.fallbackToNoCallback) {
                    try {
                      target[name](...args, makeCallback({
                        resolve,
                        reject
                      }, metadata));
                    } catch (cbError) {
                      console.warn(`${name} API method doesn't seem to support the callback parameter, falling back to call it without a callback: `, cbError);
                      target[name](...args);
                      metadata.fallbackToNoCallback = false;
                      metadata.noCallback = true;
                      resolve();
                    }
                  } else if (metadata.noCallback) {
                    target[name](...args);
                    resolve();
                  } else {
                    target[name](...args, makeCallback({
                      resolve,
                      reject
                    }, metadata));
                  }
                });
              };
            };
            const wrapMethod = (target, method, wrapper) => {
              return new Proxy(method, {
                apply(targetMethod, thisObj, args) {
                  return wrapper.call(thisObj, target, ...args);
                }
              });
            };
            let hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);
            const wrapObject = (target, wrappers = {}, metadata = {}) => {
              let cache = /* @__PURE__ */ Object.create(null);
              let handlers = {
                has(proxyTarget2, prop) {
                  return prop in target || prop in cache;
                },
                get(proxyTarget2, prop, receiver) {
                  if (prop in cache) {
                    return cache[prop];
                  }
                  if (!(prop in target)) {
                    return void 0;
                  }
                  let value = target[prop];
                  if (typeof value === "function") {
                    if (typeof wrappers[prop] === "function") {
                      value = wrapMethod(target, target[prop], wrappers[prop]);
                    } else if (hasOwnProperty(metadata, prop)) {
                      let wrapper = wrapAsyncFunction(prop, metadata[prop]);
                      value = wrapMethod(target, target[prop], wrapper);
                    } else {
                      value = value.bind(target);
                    }
                  } else if (typeof value === "object" && value !== null && (hasOwnProperty(wrappers, prop) || hasOwnProperty(metadata, prop))) {
                    value = wrapObject(value, wrappers[prop], metadata[prop]);
                  } else if (hasOwnProperty(metadata, "*")) {
                    value = wrapObject(value, wrappers[prop], metadata["*"]);
                  } else {
                    Object.defineProperty(cache, prop, {
                      configurable: true,
                      enumerable: true,
                      get() {
                        return target[prop];
                      },
                      set(value2) {
                        target[prop] = value2;
                      }
                    });
                    return value;
                  }
                  cache[prop] = value;
                  return value;
                },
                set(proxyTarget2, prop, value, receiver) {
                  if (prop in cache) {
                    cache[prop] = value;
                  } else {
                    target[prop] = value;
                  }
                  return true;
                },
                defineProperty(proxyTarget2, prop, desc) {
                  return Reflect.defineProperty(cache, prop, desc);
                },
                deleteProperty(proxyTarget2, prop) {
                  return Reflect.deleteProperty(cache, prop);
                }
              };
              let proxyTarget = Object.create(target);
              return new Proxy(proxyTarget, handlers);
            };
            const wrapEvent = (wrapperMap) => ({
              addListener(target, listener, ...args) {
                target.addListener(wrapperMap.get(listener), ...args);
              },
              hasListener(target, listener) {
                return target.hasListener(wrapperMap.get(listener));
              },
              removeListener(target, listener) {
                target.removeListener(wrapperMap.get(listener));
              }
            });
            const onRequestFinishedWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onRequestFinished(req) {
                const wrappedReq = wrapObject(req, {}, {
                  getContent: {
                    minArgs: 0,
                    maxArgs: 0
                  }
                });
                listener(wrappedReq);
              };
            });
            let loggedSendResponseDeprecationWarning = false;
            const onMessageWrappers = new DefaultWeakMap((listener) => {
              if (typeof listener !== "function") {
                return listener;
              }
              return function onMessage(message, sender, sendResponse) {
                let didCallSendResponse = false;
                let wrappedSendResponse;
                let sendResponsePromise = new Promise((resolve) => {
                  wrappedSendResponse = function(response) {
                    if (!loggedSendResponseDeprecationWarning) {
                      console.warn(SEND_RESPONSE_DEPRECATION_WARNING, new Error().stack);
                      loggedSendResponseDeprecationWarning = true;
                    }
                    didCallSendResponse = true;
                    resolve(response);
                  };
                });
                let result;
                try {
                  result = listener(message, sender, wrappedSendResponse);
                } catch (err) {
                  result = Promise.reject(err);
                }
                const isResultThenable = result !== true && isThenable(result);
                if (result !== true && !isResultThenable && !didCallSendResponse) {
                  return false;
                }
                const sendPromisedResult = (promise) => {
                  promise.then((msg) => {
                    sendResponse(msg);
                  }, (error) => {
                    let message2;
                    if (error && (error instanceof Error || typeof error.message === "string")) {
                      message2 = error.message;
                    } else {
                      message2 = "An unexpected error occurred";
                    }
                    sendResponse({
                      __mozWebExtensionPolyfillReject__: true,
                      message: message2
                    });
                  }).catch((err) => {
                    console.error("Failed to send onMessage rejected reply", err);
                  });
                };
                if (isResultThenable) {
                  sendPromisedResult(result);
                } else {
                  sendPromisedResult(sendResponsePromise);
                }
                return true;
              };
            });
            const wrappedSendMessageCallback = ({
              reject,
              resolve
            }, reply) => {
              if (extensionAPIs.runtime.lastError) {
                if (extensionAPIs.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
                  resolve();
                } else {
                  reject(new Error(extensionAPIs.runtime.lastError.message));
                }
              } else if (reply && reply.__mozWebExtensionPolyfillReject__) {
                reject(new Error(reply.message));
              } else {
                resolve(reply);
              }
            };
            const wrappedSendMessage = (name, metadata, apiNamespaceObj, ...args) => {
              if (args.length < metadata.minArgs) {
                throw new Error(`Expected at least ${metadata.minArgs} ${pluralizeArguments(metadata.minArgs)} for ${name}(), got ${args.length}`);
              }
              if (args.length > metadata.maxArgs) {
                throw new Error(`Expected at most ${metadata.maxArgs} ${pluralizeArguments(metadata.maxArgs)} for ${name}(), got ${args.length}`);
              }
              return new Promise((resolve, reject) => {
                const wrappedCb = wrappedSendMessageCallback.bind(null, {
                  resolve,
                  reject
                });
                args.push(wrappedCb);
                apiNamespaceObj.sendMessage(...args);
              });
            };
            const staticWrappers = {
              devtools: {
                network: {
                  onRequestFinished: wrapEvent(onRequestFinishedWrappers)
                }
              },
              runtime: {
                onMessage: wrapEvent(onMessageWrappers),
                onMessageExternal: wrapEvent(onMessageWrappers),
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 1,
                  maxArgs: 3
                })
              },
              tabs: {
                sendMessage: wrappedSendMessage.bind(null, "sendMessage", {
                  minArgs: 2,
                  maxArgs: 3
                })
              }
            };
            const settingMetadata = {
              clear: {
                minArgs: 1,
                maxArgs: 1
              },
              get: {
                minArgs: 1,
                maxArgs: 1
              },
              set: {
                minArgs: 1,
                maxArgs: 1
              }
            };
            apiMetadata.privacy = {
              network: {
                "*": settingMetadata
              },
              services: {
                "*": settingMetadata
              },
              websites: {
                "*": settingMetadata
              }
            };
            return wrapObject(extensionAPIs, staticWrappers, apiMetadata);
          };
          if (typeof chrome != "object" || !chrome || !chrome.runtime || !chrome.runtime.id) {
            throw new Error("This script should only be loaded in a browser extension.");
          }
          module2.exports = wrapAPIs(chrome);
        } else {
          module2.exports = browser;
        }
      });
    }
  });

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var i;
  var t;
  var o;
  var r;
  var f;
  var e = {};
  var c = [];
  var s = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  function a(n2, l2) {
    for (var u2 in l2)
      n2[u2] = l2[u2];
    return n2;
  }
  function h(n2) {
    var l2 = n2.parentNode;
    l2 && l2.removeChild(n2);
  }
  function v(l2, u2, i2) {
    var t2, o2, r2, f2 = {};
    for (r2 in u2)
      r2 == "key" ? t2 = u2[r2] : r2 == "ref" ? o2 = u2[r2] : f2[r2] = u2[r2];
    if (arguments.length > 2 && (f2.children = arguments.length > 3 ? n.call(arguments, 2) : i2), typeof l2 == "function" && l2.defaultProps != null)
      for (r2 in l2.defaultProps)
        f2[r2] === void 0 && (f2[r2] = l2.defaultProps[r2]);
    return y(l2, f2, t2, o2, null);
  }
  function y(n2, i2, t2, o2, r2) {
    var f2 = { type: n2, props: i2, key: t2, ref: o2, __k: null, __: null, __b: 0, __e: null, __d: void 0, __c: null, __h: null, constructor: void 0, __v: r2 == null ? ++u : r2 };
    return r2 == null && l.vnode != null && l.vnode(f2), f2;
  }
  function d(n2) {
    return n2.children;
  }
  function _(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function k(n2, l2) {
    if (l2 == null)
      return n2.__ ? k(n2.__, n2.__.__k.indexOf(n2) + 1) : null;
    for (var u2; l2 < n2.__k.length; l2++)
      if ((u2 = n2.__k[l2]) != null && u2.__e != null)
        return u2.__e;
    return typeof n2.type == "function" ? k(n2) : null;
  }
  function b(n2) {
    var l2, u2;
    if ((n2 = n2.__) != null && n2.__c != null) {
      for (n2.__e = n2.__c.base = null, l2 = 0; l2 < n2.__k.length; l2++)
        if ((u2 = n2.__k[l2]) != null && u2.__e != null) {
          n2.__e = n2.__c.base = u2.__e;
          break;
        }
      return b(n2);
    }
  }
  function m(n2) {
    (!n2.__d && (n2.__d = true) && t.push(n2) && !g.__r++ || r !== l.debounceRendering) && ((r = l.debounceRendering) || o)(g);
  }
  function g() {
    for (var n2; g.__r = t.length; )
      n2 = t.sort(function(n3, l2) {
        return n3.__v.__b - l2.__v.__b;
      }), t = [], n2.some(function(n3) {
        var l2, u2, i2, t2, o2, r2;
        n3.__d && (o2 = (t2 = (l2 = n3).__v).__e, (r2 = l2.__P) && (u2 = [], (i2 = a({}, t2)).__v = t2.__v + 1, j(r2, t2, i2, l2.__n, r2.ownerSVGElement !== void 0, t2.__h != null ? [o2] : null, u2, o2 == null ? k(t2) : o2, t2.__h), z(u2, t2), t2.__e != o2 && b(t2)));
      });
  }
  function w(n2, l2, u2, i2, t2, o2, r2, f2, s2, a2) {
    var h2, v2, p, _2, b2, m2, g2, w2 = i2 && i2.__k || c, A = w2.length;
    for (u2.__k = [], h2 = 0; h2 < l2.length; h2++)
      if ((_2 = u2.__k[h2] = (_2 = l2[h2]) == null || typeof _2 == "boolean" ? null : typeof _2 == "string" || typeof _2 == "number" || typeof _2 == "bigint" ? y(null, _2, null, null, _2) : Array.isArray(_2) ? y(d, { children: _2 }, null, null, null) : _2.__b > 0 ? y(_2.type, _2.props, _2.key, null, _2.__v) : _2) != null) {
        if (_2.__ = u2, _2.__b = u2.__b + 1, (p = w2[h2]) === null || p && _2.key == p.key && _2.type === p.type)
          w2[h2] = void 0;
        else
          for (v2 = 0; v2 < A; v2++) {
            if ((p = w2[v2]) && _2.key == p.key && _2.type === p.type) {
              w2[v2] = void 0;
              break;
            }
            p = null;
          }
        j(n2, _2, p = p || e, t2, o2, r2, f2, s2, a2), b2 = _2.__e, (v2 = _2.ref) && p.ref != v2 && (g2 || (g2 = []), p.ref && g2.push(p.ref, null, _2), g2.push(v2, _2.__c || b2, _2)), b2 != null ? (m2 == null && (m2 = b2), typeof _2.type == "function" && _2.__k === p.__k ? _2.__d = s2 = x(_2, s2, n2) : s2 = P(n2, _2, p, w2, b2, s2), typeof u2.type == "function" && (u2.__d = s2)) : s2 && p.__e == s2 && s2.parentNode != n2 && (s2 = k(p));
      }
    for (u2.__e = m2, h2 = A; h2--; )
      w2[h2] != null && (typeof u2.type == "function" && w2[h2].__e != null && w2[h2].__e == u2.__d && (u2.__d = k(i2, h2 + 1)), N(w2[h2], w2[h2]));
    if (g2)
      for (h2 = 0; h2 < g2.length; h2++)
        M(g2[h2], g2[++h2], g2[++h2]);
  }
  function x(n2, l2, u2) {
    for (var i2, t2 = n2.__k, o2 = 0; t2 && o2 < t2.length; o2++)
      (i2 = t2[o2]) && (i2.__ = n2, l2 = typeof i2.type == "function" ? x(i2, l2, u2) : P(u2, i2, i2, t2, i2.__e, l2));
    return l2;
  }
  function P(n2, l2, u2, i2, t2, o2) {
    var r2, f2, e2;
    if (l2.__d !== void 0)
      r2 = l2.__d, l2.__d = void 0;
    else if (u2 == null || t2 != o2 || t2.parentNode == null)
      n:
        if (o2 == null || o2.parentNode !== n2)
          n2.appendChild(t2), r2 = null;
        else {
          for (f2 = o2, e2 = 0; (f2 = f2.nextSibling) && e2 < i2.length; e2 += 2)
            if (f2 == t2)
              break n;
          n2.insertBefore(t2, o2), r2 = o2;
        }
    return r2 !== void 0 ? r2 : t2.nextSibling;
  }
  function C(n2, l2, u2, i2, t2) {
    var o2;
    for (o2 in u2)
      o2 === "children" || o2 === "key" || o2 in l2 || H(n2, o2, null, u2[o2], i2);
    for (o2 in l2)
      t2 && typeof l2[o2] != "function" || o2 === "children" || o2 === "key" || o2 === "value" || o2 === "checked" || u2[o2] === l2[o2] || H(n2, o2, l2[o2], u2[o2], i2);
  }
  function $(n2, l2, u2) {
    l2[0] === "-" ? n2.setProperty(l2, u2) : n2[l2] = u2 == null ? "" : typeof u2 != "number" || s.test(l2) ? u2 : u2 + "px";
  }
  function H(n2, l2, u2, i2, t2) {
    var o2;
    n:
      if (l2 === "style")
        if (typeof u2 == "string")
          n2.style.cssText = u2;
        else {
          if (typeof i2 == "string" && (n2.style.cssText = i2 = ""), i2)
            for (l2 in i2)
              u2 && l2 in u2 || $(n2.style, l2, "");
          if (u2)
            for (l2 in u2)
              i2 && u2[l2] === i2[l2] || $(n2.style, l2, u2[l2]);
        }
      else if (l2[0] === "o" && l2[1] === "n")
        o2 = l2 !== (l2 = l2.replace(/Capture$/, "")), l2 = l2.toLowerCase() in n2 ? l2.toLowerCase().slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + o2] = u2, u2 ? i2 || n2.addEventListener(l2, o2 ? T : I, o2) : n2.removeEventListener(l2, o2 ? T : I, o2);
      else if (l2 !== "dangerouslySetInnerHTML") {
        if (t2)
          l2 = l2.replace(/xlink[H:h]/, "h").replace(/sName$/, "s");
        else if (l2 !== "href" && l2 !== "list" && l2 !== "form" && l2 !== "tabIndex" && l2 !== "download" && l2 in n2)
          try {
            n2[l2] = u2 == null ? "" : u2;
            break n;
          } catch (n3) {
          }
        typeof u2 == "function" || (u2 != null && (u2 !== false || l2[0] === "a" && l2[1] === "r") ? n2.setAttribute(l2, u2) : n2.removeAttribute(l2));
      }
  }
  function I(n2) {
    this.l[n2.type + false](l.event ? l.event(n2) : n2);
  }
  function T(n2) {
    this.l[n2.type + true](l.event ? l.event(n2) : n2);
  }
  function j(n2, u2, i2, t2, o2, r2, f2, e2, c2) {
    var s2, h2, v2, y2, p, k2, b2, m2, g2, x2, A, P2 = u2.type;
    if (u2.constructor !== void 0)
      return null;
    i2.__h != null && (c2 = i2.__h, e2 = u2.__e = i2.__e, u2.__h = null, r2 = [e2]), (s2 = l.__b) && s2(u2);
    try {
      n:
        if (typeof P2 == "function") {
          if (m2 = u2.props, g2 = (s2 = P2.contextType) && t2[s2.__c], x2 = s2 ? g2 ? g2.props.value : s2.__ : t2, i2.__c ? b2 = (h2 = u2.__c = i2.__c).__ = h2.__E : ("prototype" in P2 && P2.prototype.render ? u2.__c = h2 = new P2(m2, x2) : (u2.__c = h2 = new _(m2, x2), h2.constructor = P2, h2.render = O), g2 && g2.sub(h2), h2.props = m2, h2.state || (h2.state = {}), h2.context = x2, h2.__n = t2, v2 = h2.__d = true, h2.__h = []), h2.__s == null && (h2.__s = h2.state), P2.getDerivedStateFromProps != null && (h2.__s == h2.state && (h2.__s = a({}, h2.__s)), a(h2.__s, P2.getDerivedStateFromProps(m2, h2.__s))), y2 = h2.props, p = h2.state, v2)
            P2.getDerivedStateFromProps == null && h2.componentWillMount != null && h2.componentWillMount(), h2.componentDidMount != null && h2.__h.push(h2.componentDidMount);
          else {
            if (P2.getDerivedStateFromProps == null && m2 !== y2 && h2.componentWillReceiveProps != null && h2.componentWillReceiveProps(m2, x2), !h2.__e && h2.shouldComponentUpdate != null && h2.shouldComponentUpdate(m2, h2.__s, x2) === false || u2.__v === i2.__v) {
              h2.props = m2, h2.state = h2.__s, u2.__v !== i2.__v && (h2.__d = false), h2.__v = u2, u2.__e = i2.__e, u2.__k = i2.__k, u2.__k.forEach(function(n3) {
                n3 && (n3.__ = u2);
              }), h2.__h.length && f2.push(h2);
              break n;
            }
            h2.componentWillUpdate != null && h2.componentWillUpdate(m2, h2.__s, x2), h2.componentDidUpdate != null && h2.__h.push(function() {
              h2.componentDidUpdate(y2, p, k2);
            });
          }
          h2.context = x2, h2.props = m2, h2.state = h2.__s, (s2 = l.__r) && s2(u2), h2.__d = false, h2.__v = u2, h2.__P = n2, s2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s, h2.getChildContext != null && (t2 = a(a({}, t2), h2.getChildContext())), v2 || h2.getSnapshotBeforeUpdate == null || (k2 = h2.getSnapshotBeforeUpdate(y2, p)), A = s2 != null && s2.type === d && s2.key == null ? s2.props.children : s2, w(n2, Array.isArray(A) ? A : [A], u2, i2, t2, o2, r2, f2, e2, c2), h2.base = u2.__e, u2.__h = null, h2.__h.length && f2.push(h2), b2 && (h2.__E = h2.__ = null), h2.__e = false;
        } else
          r2 == null && u2.__v === i2.__v ? (u2.__k = i2.__k, u2.__e = i2.__e) : u2.__e = L(i2.__e, u2, i2, t2, o2, r2, f2, c2);
      (s2 = l.diffed) && s2(u2);
    } catch (n3) {
      u2.__v = null, (c2 || r2 != null) && (u2.__e = e2, u2.__h = !!c2, r2[r2.indexOf(e2)] = null), l.__e(n3, u2, i2);
    }
  }
  function z(n2, u2) {
    l.__c && l.__c(u2, n2), n2.some(function(u3) {
      try {
        n2 = u3.__h, u3.__h = [], n2.some(function(n3) {
          n3.call(u3);
        });
      } catch (n3) {
        l.__e(n3, u3.__v);
      }
    });
  }
  function L(l2, u2, i2, t2, o2, r2, f2, c2) {
    var s2, a2, v2, y2 = i2.props, p = u2.props, d2 = u2.type, _2 = 0;
    if (d2 === "svg" && (o2 = true), r2 != null) {
      for (; _2 < r2.length; _2++)
        if ((s2 = r2[_2]) && "setAttribute" in s2 == !!d2 && (d2 ? s2.localName === d2 : s2.nodeType === 3)) {
          l2 = s2, r2[_2] = null;
          break;
        }
    }
    if (l2 == null) {
      if (d2 === null)
        return document.createTextNode(p);
      l2 = o2 ? document.createElementNS("http://www.w3.org/2000/svg", d2) : document.createElement(d2, p.is && p), r2 = null, c2 = false;
    }
    if (d2 === null)
      y2 === p || c2 && l2.data === p || (l2.data = p);
    else {
      if (r2 = r2 && n.call(l2.childNodes), a2 = (y2 = i2.props || e).dangerouslySetInnerHTML, v2 = p.dangerouslySetInnerHTML, !c2) {
        if (r2 != null)
          for (y2 = {}, _2 = 0; _2 < l2.attributes.length; _2++)
            y2[l2.attributes[_2].name] = l2.attributes[_2].value;
        (v2 || a2) && (v2 && (a2 && v2.__html == a2.__html || v2.__html === l2.innerHTML) || (l2.innerHTML = v2 && v2.__html || ""));
      }
      if (C(l2, p, y2, o2, c2), v2)
        u2.__k = [];
      else if (_2 = u2.props.children, w(l2, Array.isArray(_2) ? _2 : [_2], u2, i2, t2, o2 && d2 !== "foreignObject", r2, f2, r2 ? r2[0] : i2.__k && k(i2, 0), c2), r2 != null)
        for (_2 = r2.length; _2--; )
          r2[_2] != null && h(r2[_2]);
      c2 || ("value" in p && (_2 = p.value) !== void 0 && (_2 !== l2.value || d2 === "progress" && !_2 || d2 === "option" && _2 !== y2.value) && H(l2, "value", _2, y2.value, false), "checked" in p && (_2 = p.checked) !== void 0 && _2 !== l2.checked && H(l2, "checked", _2, y2.checked, false));
    }
    return l2;
  }
  function M(n2, u2, i2) {
    try {
      typeof n2 == "function" ? n2(u2) : n2.current = u2;
    } catch (n3) {
      l.__e(n3, i2);
    }
  }
  function N(n2, u2, i2) {
    var t2, o2;
    if (l.unmount && l.unmount(n2), (t2 = n2.ref) && (t2.current && t2.current !== n2.__e || M(t2, null, u2)), (t2 = n2.__c) != null) {
      if (t2.componentWillUnmount)
        try {
          t2.componentWillUnmount();
        } catch (n3) {
          l.__e(n3, u2);
        }
      t2.base = t2.__P = null;
    }
    if (t2 = n2.__k)
      for (o2 = 0; o2 < t2.length; o2++)
        t2[o2] && N(t2[o2], u2, typeof n2.type != "function");
    i2 || n2.__e == null || h(n2.__e), n2.__e = n2.__d = void 0;
  }
  function O(n2, l2, u2) {
    return this.constructor(n2, u2);
  }
  function S(u2, i2, t2) {
    var o2, r2, f2;
    l.__ && l.__(u2, i2), r2 = (o2 = typeof t2 == "function") ? null : t2 && t2.__k || i2.__k, f2 = [], j(i2, u2 = (!o2 && t2 || i2).__k = v(d, null, [u2]), r2 || e, e, i2.ownerSVGElement !== void 0, !o2 && t2 ? [t2] : r2 ? null : i2.firstChild ? n.call(i2.childNodes) : null, f2, !o2 && t2 ? t2 : r2 ? r2.__e : i2.firstChild, o2), z(f2, u2);
  }
  n = c.slice, l = { __e: function(n2, l2) {
    for (var u2, i2, t2; l2 = l2.__; )
      if ((u2 = l2.__c) && !u2.__)
        try {
          if ((i2 = u2.constructor) && i2.getDerivedStateFromError != null && (u2.setState(i2.getDerivedStateFromError(n2)), t2 = u2.__d), u2.componentDidCatch != null && (u2.componentDidCatch(n2), t2 = u2.__d), t2)
            return u2.__E = u2;
        } catch (l3) {
          n2 = l3;
        }
    throw n2;
  } }, u = 0, i = function(n2) {
    return n2 != null && n2.constructor === void 0;
  }, _.prototype.setState = function(n2, l2) {
    var u2;
    u2 = this.__s != null && this.__s !== this.state ? this.__s : this.__s = a({}, this.state), typeof n2 == "function" && (n2 = n2(a({}, u2), this.props)), n2 && a(u2, n2), n2 != null && this.__v && (l2 && this.__h.push(l2), m(this));
  }, _.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), m(this));
  }, _.prototype.render = d, t = [], o = typeof Promise == "function" ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, g.__r = 0, f = 0;

  // addon/popup/index.tsx
  var import_webextension_polyfill = __toESM(require_browser_polyfill());

  // addon/popup/utils.tsx
  function copyTextToClipboard(text, notify2) {
    return __async(this, null, function* () {
      try {
        try {
          yield navigator.clipboard.writeText(text);
        } catch (e2) {
          let oncopy = function(event) {
            document.removeEventListener("copy", oncopy, true);
            event.stopImmediatePropagation();
            event.preventDefault();
            event.clipboardData.setData("text/plain", text);
          };
          document.addEventListener("copy", oncopy, true);
          document.execCommand("copy");
        }
        notify2("notify_copiedTitle", text);
      } catch (error) {
        console.error("[ipfs-companion] Failed to copy text", error);
        notify2("notify_addonIssueTitle", "Unable to copy");
      }
    });
  }

  // addon/popup/index.tsx
  var popupState = {
    peerCount: 0,
    online: false,
    on: false,
    apiURL: "localhost:5000",
    version: "ALPHA",
    newVersionAvailable: false,
    webviewURL: "WEBVIEW URL NOT PRESENT"
  };
  var port = import_webextension_polyfill.default.runtime.connect({
    name: "port-2-background"
  });
  port.onMessage.addListener((msg) => {
    console.log("message received", msg);
    if (msg.statusUpdate) {
      console.log(msg.statusUpdate);
      popupState = Object.assign({}, popupState, msg.statusUpdate);
      App = /* @__PURE__ */ v(NewTab, {
        props: popupState
      });
      S(App, document.getElementById("root"));
    }
  });
  function notify(titleKey, messageKey, messageParam) {
    port.postMessage({
      title: "notify",
      data: {
        titleKey,
        messageKey,
        messageParam
      }
    });
  }
  var NewTab = (props) => {
    const {
      isIpfsContext = false,
      currentTabPublicUrl,
      currentTabCid,
      peerCount,
      online,
      active,
      apiURLString,
      gatewayUrl
    } = props.props;
    let { showReloadNotification } = props.props;
    const openOptionPage = () => {
      import_webextension_polyfill.default.runtime.openOptionsPage().then(() => window.close()).catch((err) => {
        console.error("runtime.openOptionsPage() failed, opening options page in tab instead.", err);
        import_webextension_polyfill.default.tabs.create({
          url: import_webextension_polyfill.default.runtime.getURL("/options/options.html")
        });
      });
    };
    const companionPowerBtn = () => {
      console.log("companionPowerBtn called");
      if (!active) {
        port.postMessage({
          title: "power:on"
        });
      } else {
        port.postMessage({
          title: "power:off"
        });
      }
    };
    const reloadTab = () => {
      showReloadNotification = false;
      port.postMessage({
        title: "reload"
      });
    };
    const contextMenuCopyRawCid = () => {
      copyTextToClipboard(currentTabCid, notify);
    };
    const contextMenuCopyAddressAtPublicGw = () => {
      copyTextToClipboard(currentTabPublicUrl, notify);
    };
    const openAboutPage = () => {
      console.log("openAboutPage called");
    };
    const openImportPage = () => {
      console.log("openImportPage called");
    };
    const pinToNode = () => {
      console.log("pinToNode called");
    };
    return /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("div", {
      className: "ipfs-gradient-0"
    }, /* @__PURE__ */ v("header", {
      className: "flex justify-between"
    }, /* @__PURE__ */ v("div", {
      className: "flex"
    }, /* @__PURE__ */ v("div", {
      className: "pa3",
      onClick: openAboutPage
    }, /* @__PURE__ */ v("img", {
      alt: "IPFS",
      width: 56,
      height: 56,
      src: import_webextension_polyfill.default.runtime.getURL("/icons/ipfs-logo-on.svg")
    })), /* @__PURE__ */ v("div", {
      className: "flex flex-column"
    }, /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("h1", {
      className: "pt3 ma0"
    }, "IPFS")), /* @__PURE__ */ v("span", null, /* @__PURE__ */ v("div", {
      title: "version",
      className: "tc"
    }, online ? /* @__PURE__ */ v("span", {
      title: "The version of IPFS your local node is using"
    }, "0.11.0") : /* @__PURE__ */ v("span", {
      title: "Your local node is offline"
    }, "Offline"))))), /* @__PURE__ */ v("div", {
      className: "flex pa3"
    }, /* @__PURE__ */ v("div", {
      className: "button-icon",
      onClick: companionPowerBtn
    }, /* @__PURE__ */ v("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 86 86",
      className: "fill-current-color",
      style: "width:22px; height:22px"
    }, /* @__PURE__ */ v("path", {
      d: "M50 20.11A29.89 29.89 0 1 0 79.89 50 29.89 29.89 0 0 0 50 20.11zm-3.22 17a3.22 3.22 0 0 1 6.44 0v6.43a3.22 3.22 0 0 1-6.44 0zM50 66.08a16.14 16.14 0 0 1-11.41-27.49 3.28 3.28 0 0 1 1.76-.65 2.48 2.48 0 0 1 2.42 2.41 2.58 2.58 0 0 1-.77 1.77A10.81 10.81 0 0 0 38.59 50a11.25 11.25 0 0 0 22.5 0 10.93 10.93 0 0 0-3.21-7.88 3.37 3.37 0 0 1-.65-1.77 2.48 2.48 0 0 1 2.42-2.41 2.16 2.16 0 0 1 1.76.65A16.14 16.14 0 0 1 50 66.08z"
    }))), /* @__PURE__ */ v("div", {
      className: "button-icon",
      onClick: openOptionPage
    }, /* @__PURE__ */ v("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 86 86",
      class: "fill-current-color",
      style: "width:22px; height:22px"
    }, /* @__PURE__ */ v("path", {
      d: "M74.05 50.23c-.07-3.58 1.86-5.85 5.11-7.1-.2-2-2.48-7.45-3.63-8.76-3.11 1.46-6.06 1.23-8.54-1.22s-2.72-5.46-1.26-8.64a29.24 29.24 0 0 0-8.8-3.63c-1.06 3.08-3.12 5-6.35 5.25-3.82.29-6.29-1.69-7.61-5.22a30.11 30.11 0 0 0-8.77 3.67c1.5 3.16 1.3 6.1-1.15 8.6s-5.45 2.76-8.64 1.29a29.33 29.33 0 0 0-3.58 8.79C24 44.43 25.94 46.62 26 50s-1.82 5.84-5.1 7.12a29.21 29.21 0 0 0 3.68 8.71c3.09-1.38 6-1.15 8.42 1.22s2.79 5.33 1.41 8.49a29.72 29.72 0 0 0 8.76 3.57 1.46 1.46 0 0 0 .11-.21 7.19 7.19 0 0 1 13.53-.16c.13.33.28.32.55.25a29.64 29.64 0 0 0 8-3.3 4 4 0 0 0 .37-.25c-1.27-2.86-1.15-5.57.88-7.94 2.44-2.84 5.5-3.26 8.91-1.8a29.23 29.23 0 0 0 3.65-8.7c-3.17-1.22-5.05-3.38-5.12-6.77zM50 59.54a8.57 8.57 0 1 1 8.59-8.31A8.58 8.58 0 0 1 50 59.54z"
    }))))), /* @__PURE__ */ v("div", {
      class: "flex flex-column f6"
    }, /* @__PURE__ */ v("div", {
      class: "flex flex-row justify-between ph2 pv1 cursor-help",
      title: "The number of other IPFS nodes you can connect to"
    }, /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("span", {
      class: ""
    }, "Peers")), /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("span", {
      title: peerCount,
      class: ""
    }, peerCount))), /* @__PURE__ */ v("div", {
      class: "flex flex-row justify-between ph2 pv1 cursor-help",
      title: "The URL of the gateway, either public or local, you are using to fetch content (change this in Preferences)"
    }, /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("span", {
      class: ""
    }, "Gateway")), /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("span", {
      title: gatewayUrl,
      class: ""
    }, gatewayUrl))), /* @__PURE__ */ v("div", {
      class: "flex flex-row justify-between ph2 pv1 cursor-help",
      title: "The URL of the gateway, either public or local, you are using to fetch content (change this in Preferences)"
    }, /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("span", {
      class: ""
    }, "API")), /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("span", {
      title: apiURLString,
      class: ""
    }, apiURLString)))), /* @__PURE__ */ v("div", {
      class: "flex justify-between"
    }, /* @__PURE__ */ v("div", {
      class: "pa3",
      onClick: openImportPage
    }, /* @__PURE__ */ v("a", {
      class: "f6 link dim ba ph3 pv2 mb2 dib black",
      href: "#0"
    }, /* @__PURE__ */ v("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 100 100",
      class: "nb2",
      width: "22px",
      height: "22px"
    }, /* @__PURE__ */ v("path", {
      fill: "currentColor",
      d: "M71.13 28.87a29.88 29.88 0 100 42.26 29.86 29.86 0 000-42.26zm-18.39 37.6h-5.48V52.74H33.53v-5.48h13.73V33.53h5.48v13.73h13.73v5.48H52.74z"
    })), "Import")), /* @__PURE__ */ v("div", {
      class: "pa3",
      onClick: pinToNode
    }, /* @__PURE__ */ v("a", {
      class: "f6 link dim ba ph3 pv2 mb2 dib black",
      href: "#0"
    }, /* @__PURE__ */ v("span", null, /* @__PURE__ */ v("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 100 100",
      class: "nb2",
      width: "22px",
      height: "22px"
    }, /* @__PURE__ */ v("path", {
      fill: "currentColor",
      d: "M69.69 20.57c-.51-.51-1.06-1-1.62-1.47l-.16-.1c-.56-.46-1.15-.9-1.76-1.32l-.5-.35c-.25-.17-.52-.32-.79-.48A28.27 28.27 0 0050 12.23h-.69a28.33 28.33 0 00-27.52 28.36c0 13.54 19.06 37.68 26 46a3.21 3.21 0 005 0c6.82-8.32 25.46-32.25 25.46-45.84a28.13 28.13 0 00-8.56-20.18zM51.07 49.51a9.12 9.12 0 119.13-9.12 9.12 9.12 0 01-9.13 9.12z"
    }))), "My node"))), showReloadNotification && /* @__PURE__ */ v("div", {
      class: "center mw7",
      onClick: reloadTab
    }, /* @__PURE__ */ v("aside", {
      class: "refresh-button f6 link dim ba ph3 pv2 mb2 dib black tc"
    }, /* @__PURE__ */ v("span", {
      class: "f7",
      style: "color: #8f8b8b;"
    }, "IPFS version detected"), /* @__PURE__ */ v("p", {
      class: "ma0 pa0"
    }, "Click to load current page on IPFS")))), isIpfsContext ? /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("h4", {
      class: "current-tab-heading ph2"
    }, "Current tab"), /* @__PURE__ */ v("div", {
      class: "flex flex-column tc"
    }, /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("a", {
      class: "f5 dib pb2 black flex flex-column current-tab-button",
      onClick: contextMenuCopyAddressAtPublicGw
    }, /* @__PURE__ */ v("p", {
      class: "mb1 mt2 pa1"
    }, "Copy sharable link"), /* @__PURE__ */ v("span", {
      class: "f7 truncate ph2"
    }, currentTabPublicUrl))), /* @__PURE__ */ v("div", null, /* @__PURE__ */ v("a", {
      class: "f5 dib pb2 black flex flex-column current-tab-button",
      onClick: contextMenuCopyRawCid
    }, /* @__PURE__ */ v("p", {
      class: "mb1 mt2 pa1"
    }, "Copy CID"), /* @__PURE__ */ v("span", {
      class: "f7 truncate ph2"
    }, currentTabCid))))) : null);
  };
  var App = /* @__PURE__ */ v(NewTab, {
    props: popupState
  });
  S(App, document.getElementById("root"));
})();
