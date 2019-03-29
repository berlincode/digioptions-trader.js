// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      './pubsub',
      './order_normalize',
      './data_networks',
      './data_networks_utils',
      './data_config',
      './quote_provider',
    ], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./pubsub'),
      require('./order_normalize'),
      require('./data_networks'),
      require('./data_networks_utils'),
      require('./data_config'),
      require('./quote_provider.js')
    );
  }else {
    // Global (browser)
    root.digioptionsTools = factory(
      root.PubSub,
      root.order_normalize,
      root.data_networks,
      root.data_networks_utils,
      root.data_config,
      root.quote_provider
    );
  }
}(this, function (PubSub, orderNormalize, dataNetworks, dataNetworksUtils, dataConfig, quoteProvider) {

  function typeDurationToString(typeDuration){
    var duration;
    switch (typeDuration) {
    case 0: duration = 'yearly'; break;
    case 1: duration = 'monthly'; break;
    case 2: duration = 'weekly'; break;
    case 3: duration = 'daily'; break;
    case 4: duration = 'hourly'; break;
    case 5: duration = 'short term'; break; // TODO better name
    default: duration = '-' ; break;
    }
    return duration;
  }

  return {
    PubSub: PubSub,
    orderNormalize: orderNormalize,
    dataNetworks: dataNetworks,
    dataNetworksUtils: dataNetworksUtils,
    dataConfig: dataConfig,
    quoteProvider: quoteProvider,
    typeDurationToString: typeDurationToString
  };
}));
