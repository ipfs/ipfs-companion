'use strict'
/* eslint-env browser, webextensions */

// without this shim unit tests fail -- sinon-chrome does not stub browser yet
var browser = browser || chrome
