'use strict';

const protocols = require("./protocols.js");

protocols.register();

require("sdk/system/unload").when(() => {
  protocols.unregister();
});
