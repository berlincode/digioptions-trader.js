// vim: sts=2:ts=2:sw=2
/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright (c) digioptions.com (https://www.digioptions.com)
*/

(function (global, factory) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define(
      [
        './data_networks',
      ], function (
        data_networks
      ) {
        return factory(
          data_networks
        );
      });

  } else if ( typeof module != 'undefined' && module.exports ) {
    // Node and other environments that support module.exports
    module.exports = factory(
      require('./data_networks')
    );

  } else {
    // Browser
    global.data_networks_utils = factory(
      global.data_networks
    );
  }
})(this, function(dataNetworks){

  function normalizeHexValue(value, bytes){
    value = value.replace(/^0x/, '').toLowerCase();
    while (value.length < bytes*2) value = '0' + value; // pad leading zeros
    return '0x' + value;
  }

  function normalizeMarketsAddr(addr){
    return normalizeHexValue(addr, 20);
  }

  function normalizeMarketFactHash(addr){
    return normalizeHexValue(addr, 32);
  }

  var digioptionsUrlNameToData = {
    pageStart: {
      baseUrl: '#',
      args: []
    },
    pageNetwork: {
      baseUrl: '#/{network}',
      args: ['network']
    },
    pageMarketList: {
      baseUrl: '#/{network}/{marketsAddr}/list',
      args: ['network', 'marketsAddr']
    },
    pageMarketListSelected: { // same as 'pageMarketList', but with marketFactHash selected
      baseUrl: '#/{network}/{marketsAddr}/{marketFactHash}/list',
      args: ['network', 'marketsAddr', 'marketFactHash']
    },
    pageHistory: { /* contract deposits and withdrawals */
      baseUrl: '#/{network}/{marketsAddr}/depositwithdraw',
      args: ['network', 'marketsAddr']
    },
    pageMarket: {
      baseUrl: '#/{network}/{marketsAddr}/{marketFactHash}',
      args: ['network', 'marketsAddr', 'marketFactHash']
    },
    pageTransactions: {
      baseUrl: '#/{network}/{marketsAddr}/{marketFactHash}/transactions',
      args: ['network', 'marketsAddr', 'marketFactHash']
    }//,
    /* static files */
    //pageImprint: {
    //  baseUrl: 'imprint.html',
    //  args: []
    //}
  };

  function getDigioptionsUrl(urlName, args, relativeUrl){
    var dataNetwork = dataNetworks[args.network]; // valid argument network is always required
    var data = digioptionsUrlNameToData[urlName];
    var url = data.baseUrl;
    for (var i=0; i < data.args.length ; i++){
      var argName = data.args[i];
      if (argName == 'marketsAddr') {
        url = url.replace('{marketsAddr}', normalizeMarketsAddr(args.marketsAddr));
      } else if (argName == 'marketFactHash') {
        url = url.replace('{marketFactHash}', normalizeMarketFactHash(args.marketFactHash));
      } else {
        url = url.replace('{' + argName + '}', args[argName]);
      }
    }
    if (relativeUrl)
      return url;
    return dataNetwork.digioptionsBaseUrl + url;
  }

  function getXmppPubsubViewerUrl(network, marketsAddr, marketFactHash){
    var dataNetwork = dataNetworks[network];
    if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.xmppPubsubViewer) === 'undefined'))
      return null;
    var url = dataNetwork.xmppPubsubViewer.
      replace('{marketsAddr}', normalizeMarketsAddr(marketsAddr)).
      replace('{marketFactHash}', normalizeMarketFactHash(marketFactHash));
    return url;
  }

  function getEtherscanUrlContract(network, contractAddr){
    var dataNetwork = dataNetworks[network];
    if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.etherscanAddressUrl) === 'undefined'))
      return null;
    return dataNetwork.etherscanAddressUrl.
      replace('{contractAddr}', normalizeMarketsAddr(contractAddr));
  }

  function getEtherscanUrlTx(network, tx){
    var dataNetwork = dataNetworks[network];
    if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.etherscanTxUrl) === 'undefined'))
      return null;
    return dataNetwork.etherscanTxUrl.replace('{tx}', tx);
  }

  function getXmppUrlsWebsocket(network){
    var dataNetwork = dataNetworks[network];
    if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.xmppUrlWebsocket) === 'undefined') || (! dataNetwork.xmppPortsWebsocket))
      return null;
    var urls = [];
    for (var i = 0; i < dataNetwork.xmppPortsWebsocket.length; i++) {
      urls.push(dataNetwork.xmppUrlWebsocket.replace('{port}', dataNetwork.xmppPortsWebsocket[i]));
    }
    return urls;
  }

  function getXmppUrlsHttpBind(network){
    var dataNetwork = dataNetworks[network];
    if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.xmppUrlHttpBind) === 'undefined') || (! dataNetwork.xmppPortsHttpBind))
      return null;
    var urls = [];
    for (var i = 0; i < dataNetwork.xmppPortsHttpBind.length; i++) {
      urls.push(dataNetwork.xmppUrlHttpBind.replace('{port}', dataNetwork.xmppPortsHttpBind[i]));
    }
    return urls;
  }

  function getXmppPubsubNodePath(network, marketsAddr, marketFactHash){
    var dataNetwork = dataNetworks[network];
    //if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.xmppPubsubNodePath) === 'undefined'))
    //  return null;
    return dataNetwork.xmppPubsubNodePath.
      replace('{marketsAddr}', normalizeMarketsAddr(marketsAddr)).
      replace('{marketFactHash}', normalizeMarketFactHash(marketFactHash));
  }

  function getXmppJidPassword(network){
    var dataNetwork = dataNetworks[network];
    if ((typeof(dataNetwork) === 'undefined') || (typeof(dataNetwork.xmppJidPassword) === 'undefined'))
      return [null, null];
    return dataNetwork.xmppJidPassword;
  }

  function getProvider(network){
    var dataNetwork = dataNetworks[network];
    return dataNetwork.ethProvider;
  }

  return {
    normalizeMarketsAddr: normalizeMarketsAddr,
    normalizeMarketFactHash: normalizeMarketFactHash,
    digioptionsUrlNameToData: digioptionsUrlNameToData,
    getDigioptionsUrl: getDigioptionsUrl,
    getXmppPubsubViewerUrl: getXmppPubsubViewerUrl,
    getEtherscanUrlContract: getEtherscanUrlContract,
    getEtherscanUrlTx: getEtherscanUrlTx,
    getXmppUrlsWebsocket: getXmppUrlsWebsocket,
    getXmppUrlsHttpBind: getXmppUrlsHttpBind,
    getXmppPubsubNodePath: getXmppPubsubNodePath,
    getXmppJidPassword: getXmppJidPassword,
    getProvider: getProvider
  };
});
