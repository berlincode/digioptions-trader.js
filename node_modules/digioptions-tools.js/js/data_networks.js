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
      public: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      etherscanAddressUrl: 'https://etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://etherscan.io/tx/{tx}',
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
        {
          addr: '0x78aba7dfF4719046B1619FC4EF48E6b1026CB459', // points to 0xE9809c4a9f2926CF5276d4EfdF492F9f543E39
          name: 'Preview',
          foreign: false
        },
      ],
      xmppUrlWebsocket: 'wss://mainnet.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://mainnet.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/mainnet/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@mainnet.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=main&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProvider: 'wss://mainnet.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 1,
      chainId: null
    },

    'ropsten': {
      description: 'Test network',
      testnet: true,
      public: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      etherscanAddressUrl: 'https://ropsten.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://ropsten.etherscan.io/tx/{tx}',
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
        {
          addr: '0x37e8C2D1B5ccaAC1b1B54e94560cF42B7beDeb03', // points to 0x612CCe54Fb350739363F4F050A113E80427B881C
          name: 'Test contract',
          foreign: false
        },
      ],
      xmppUrlWebsocket: 'wss://ropsten.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ropsten.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ropsten/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@ropsten.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ropsten&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProvider: 'wss://ropsten.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 3,
      chainId: null
    },

    'kovan': {
      description: 'Proof-of-authority test network',
      testnet: true,
      public: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      etherscanAddressUrl: 'https://kovan.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://kovan.etherscan.io/tx/{tx}',
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
      ],
      xmppUrlWebsocket: 'wss://kovan.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://kovan.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/kovan/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@kovan.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=kovan&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProvider: 'wss://kovan.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 42,
      chainId: null
    },

    'rinkeby': {
      description: 'Clique-consensus test network',
      testnet: true,
      public: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      //etherscanApiUrl: 'https://rinkeby.etherscan.io/api',
      etherscanAddressUrl: 'https://rinkeby.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://rinkeby.etherscan.io/tx/{tx}',
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
      ],
      xmppUrlWebsocket: 'wss://rinkeby.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://rinkeby.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/rinkeby/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@rinkeby.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=rinkeby&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProvider: 'wss://rinkeby.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 4,
      chainId: null
    },

    /* commented out - seems not to be supported by web3/getNetworkType() */
    /*
    'goerli': {
      description: 'Cross-client proof-of-authority test network',
      testnet: true,
      public: true,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      //etherscanApiUrl: 'https://goerli.etherscan.io/api',
      etherscanAddressUrl: 'https://goerli.etherscan.io/address/{contractAddr}',
      etherscanTxUrl: 'https://goerli.etherscan.io/tx/{tx}',
      contractDescriptions: [
        //{addr: '0x0943DBC42CB14dE4BEc0b53d1016070e7Dbf85CC', name: 'Test Contract', foreign: false}
      ],
      xmppUrlWebsocket: 'wss://goerli.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://goerli.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/goerli/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@goerli.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=goerli&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProvider: 'wss://goerli.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 5,
      chainId: null
    }
    */
  };
});
