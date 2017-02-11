'use strict'
/* eslint-env browser, webextensions */
/* eslint no-use-before-define: 0 */

// without this shim unit tests fail -- sinon-chrome does not stub browser yet
var browser = browser || chrome
