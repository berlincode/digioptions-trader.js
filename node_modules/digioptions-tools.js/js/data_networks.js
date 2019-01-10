// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(function () {return factory();});
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory();
  } else {
    // Global (browser)
    root.data_networks = factory();
  }
})(this, function(){

  return {

    /* we use the network names from web3/getNetworkType() as keys */
    'main': {
      description: 'Main network',
      testnet: false,
      digioptionsBaseUrl: 'https://www.digioptions.com/',
      etherscanAddressUrl: 'https://etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://etherscan.io/address/{tx}',
      contractDescriptions: [],
      xmppUrlWebsocket: 'wss://mainnet.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://mainnet.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/mainnet/{marketsAddr}/{marketFactHash}',
      xmppJidPassword: ['anon@mainnet.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=main&marketsAddr={marketsAddr}&marketFactHash={marketFactHash}',
      ethProvider: 'wss://mainnet.infura.io/ws', // for WebsocketProvider
      ethProviderType: 'WebsocketProvider', // 'HttpProvider' / 'WebsocketProvider'
      chainId: 0 // TODO
    },

    'ropsten': {
      description: 'Test network',
      testnet: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/',
      etherscanAddressUrl: 'https://ropsten.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://ropsten.etherscan.io/address/{tx}',
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
        {addr: '0x8a9c968c1fdddfc89b816c909d9b0da109261e35', name: 'Test Contract', foreign: false},
      ],
      xmppUrlWebsocket: 'wss://ropsten.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ropsten.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ropsten/{marketsAddr}/{marketFactHash}',
      xmppJidPassword: ['anon@ropsten.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ropsten&marketsAddr={marketsAddr}&marketFactHash={marketFactHash}',
      ethProvider: 'wss://ropsten.infura.io/ws', // for WebsocketProvider
      ethProviderType: 'WebsocketProvider', // 'HttpProvider' / 'WebsocketProvider'
      chainId: 0 // TODO
    },

    'kovan': {
      description: 'Proof-of-authority test network',
      testnet: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/',
      etherscanAddressUrl: 'https://kovan.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://kovan.etherscan.io/address/{tx}',
      contractDescriptions: [],
      xmppUrlWebsocket: 'wss://kovan.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://kovan.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/kovan/{marketsAddr}/{marketFactHash}',
      xmppJidPassword: ['anon@kovan.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=kovan&marketsAddr={marketsAddr}&marketFactHash={marketFactHash}',
      ethProvider: 'wss://kovan.infura.io/ws', // for WebsocketProvider
      ethProviderType: 'WebsocketProvider', // 'HttpProvider' / 'WebsocketProvider'
      chainId: 0 // TODO
    },

    'rinkeby': {
      description: 'Clique-consensus test network',
      testnet: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/',
      //etherscanApiUrl: 'https://rinkeby.etherscan.io/api',
      etherscanAddressUrl: 'https://rinkeby.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://rinkeby.etherscan.io/address/{tx}',
      contractDescriptions: [],
      xmppUrlWebsocket: 'wss://rinkeby.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://rinkeby.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/rinkeby/{marketsAddr}/{marketFactHash}',
      xmppJidPassword: ['anon@rinkeby.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=rinkeby&marketsAddr={marketsAddr}&marketFactHash={marketFactHash}',
      ethProvider: 'wss://rinkeby.infura.io/ws', // for WebsocketProvider
      ethProviderType: 'WebsocketProvider', // 'HttpProvider' / 'WebsocketProvider'
      chainId: 0 // TODO
    }

  };
});
