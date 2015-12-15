'use strict';

const proto = require("./protocols.js");

proto.fs.register();
proto.ipfs.register();
proto.ipns.register();

require("sdk/system/unload").when(() => {
  proto.fs.unregister();
  proto.ipfs.unregister();
  proto.ipns.unregister();
});
