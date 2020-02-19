// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      './pubsub',
      './offer_normalize',
      './data_networks',
      './data_networks_utils',
      './data_config',
      './quote_provider',
    ], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./pubsub'),
      require('./offer_normalize'),
      require('./data_networks'),
      require('./data_networks_utils'),
      require('./data_config'),
      require('./quote_provider.js')
    );
  }else {
    // Global (browser)
    root.digioptionsTools = factory(
      root.PubSub,
      root.offer_normalize,
      root.data_networks,
      root.data_networks_utils,
      root.data_config,
      root.quote_provider
    );
  }
}(this, function (PubSub, offerNormalize, dataNetworks, dataNetworksUtils, dataConfig, quoteProvider) {

  function padZero(i) {
    if (i < 10) {
      i = '0' + i;
    }
    return i;
  }

  function dateStringUTCTOD(date) {
    return (
      padZero(date.getUTCHours()) +
      ':' +
      padZero(date.getUTCMinutes()) +
      ':' +
      padZero(date.getUTCSeconds())
    );
  }

  function dateStringUTC(date) {
    return (
      date.getUTCFullYear() +
      '-' +
      padZero(date.getUTCMonth() + 1) +
      '-' +
      padZero(date.getUTCDate()) +
      ' ' +
      dateStringUTCTOD(date)
    );
  }

  function dateStringUTCTZ(date) {
    return dateStringUTC(date) + '+00';
  }

  function dateStringLocalTOD(date) {
    return (
      padZero(date.getHours()) +
      ':' +
      padZero(date.getMinutes()) +
      ':' +
      padZero(date.getSeconds())
    );
  }

  function dateStringLocal(date) {
    return (
      date.getFullYear() +
      '-' +
      padZero(date.getMonth() + 1) +
      '-' +
      padZero(date.getDate()) +
      ' ' +
      dateStringLocalTOD(date)
    );
  }

  function dateStringLocalTZ(date) {
    var tzOffset = -date.getTimezoneOffset()/60;
    return dateStringLocal(date) + (tzOffset < 0 ? '-' : '+') + padZero(Math.abs(tzOffset));
  }

  return {
    PubSub: PubSub,
    offerNormalize: offerNormalize,
    dataNetworks: dataNetworks,
    dataNetworksUtils: dataNetworksUtils,
    dataConfig: dataConfig,
    quoteProvider: quoteProvider,
    dateStringUTCTOD: dateStringUTCTOD,
    dateStringUTC: dateStringUTC,
    dateStringUTCTZ: dateStringUTCTZ,
    dateStringLocalTOD: dateStringLocalTOD,
    dateStringLocal: dateStringLocal,
    dateStringLocalTZ: dateStringLocalTZ
  };
}));
