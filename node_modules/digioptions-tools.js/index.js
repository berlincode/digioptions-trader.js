// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      './pubsub',
      './normalize_order',
      './data_networks',
      './data_config'
    ], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./pubsub'),
      require('./normalize_order'),
      require('./data_networks'),
      require('./data_config')
    );
  }else {
    // Global (browser)
    root.digioptions_tools = factory(
      root.PubSub,
      root.normalize_order,
      root.data_networks,
      root.data_config
    );
  }
}(this, function (PubSub, normalize_order, data_networks, data_config) {
  return {
    PubSub: PubSub,
    normalize_order: normalize_order,
    data_networks: data_networks,
    data_config: data_config
  };
}));
