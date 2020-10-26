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

  // supported networks (see also: https://chainid.network/):
  // * 'ethereum-mainnet'
  // * 'ethereum-testnet-ropsten'
  // * 'ethereum-testnet-kovan'
  // * 'ethereum-testnet-rinkeby'
  // * 'ethereum-testnet-goerli'
  // * 'thundercore-mainnet'
  // * 'thundercore-testnet'

  return {

    'ethereum-mainnet': {
      name: 'Ethereum Mainnet',
      description: 'Main network',
      currencyNameFull: 'Ether',
      currencyNameShort: 'Eth',
      testnet: false,
      public: true,
      blockTimeApproxMs: 13500,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'Etherscan',
          urlAddress: 'https://etherscan.io/address/{contractAddr}',
          urlTx: 'https://etherscan.io/tx/{tx}'
        }
      ],
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
        {
          addr: '0xaf15cB5c8c2a73e8C5161f3b8066502188B239CC', // points to 0xE9809c4a9f2926CF5276d4EfdF492F9f543E39
          name: 'Preview',
          foreign: false
        },
      ],
      xmppUrlWebsocket: 'wss://ethereum-mainnet.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ethereum-mainnet.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ethereum-mainnet/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@ethereum-mainnet.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ethereum-mainnet&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://mainnet.infura.io/v3/{infuraApiKey}',
      ethProviderWs: 'wss://mainnet.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 1,
      chainId: null
    },

    'ethereum-testnet-ropsten': {
      name: 'Ethereum Testnet Ropsten',
      description: 'Test network',
      currencyNameFull: 'Ether',
      currencyNameShort: 'Eth',
      testnet: true,
      public: true,
      blockTimeApproxMs: 13500,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'Etherscan',
          urlAddress: 'https://ropsten.etherscan.io/address/{contractAddr}',
          urlTx: 'https://ropsten.etherscan.io/tx/{tx}'
        }
      ],
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
        {
          addr: '0xA01DdAfE79342E8A98b7f972DF1C87ADd426DbfE', // points to 0x612CCe54Fb350739363F4F050A113E80427B881C
          name: 'Test contract',
          foreign: false
        },
      ],
      xmppUrlWebsocket: 'wss://ethereum-testnet-ropsten.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ethereum-testnet-ropsten.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ethereum-testnet-ropsten/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@ethereum-testnet-ropsten.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ethereum-testnet-ropsten&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://ropsten.infura.io/v3/{infuraApiKey}',
      ethProviderWs: 'wss://ropsten.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 3,
      chainId: null
    },

    'ethereum-testnet-kovan': {
      name: 'Ethereum Testnet Kovan',
      description: 'Proof-of-authority test network',
      currencyNameFull: 'Ether',
      currencyNameShort: 'Eth',
      testnet: true,
      public: true,
      blockTimeApproxMs: 8000,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'Etherscan',
          urlAddress: 'https://kovan.etherscan.io/address/{contractAddr}',
          urlTx: 'https://kovan.etherscan.io/tx/{tx}'
        }
      ],
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
      ],
      xmppUrlWebsocket: 'wss://ethereum-testnet-kovan.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ethereum-testnet-kovan.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ethereum-testnet-kovan/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@ethereum-testnet-kovan.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ethereum-testnet-kovan&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://kovan.infura.io/v3/{infuraApiKey}',
      ethProviderWs: 'wss://kovan.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 42,
      chainId: null
    },

    'ethereum-testnet-rinkeby': {
      name: 'Ethereum Testnet Rinkeby',
      description: 'Clique-consensus test network',
      currencyNameFull: 'Ether',
      currencyNameShort: 'Eth',
      testnet: true,
      public: true,
      blockTimeApproxMs: 15000,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'Etherscan',
          urlAddress: 'https://rinkeby.etherscan.io/address/{contractAddr}',
          urlTx: 'https://rinkeby.etherscan.io/tx/{tx}'
        }
      ],
      contractDescriptions: [
        //e.g. {addr: '0x0000000000000000000000000000000000000000', name: '<your contract name>', foreign: false},
      ],
      xmppUrlWebsocket: 'wss://ethereum-testnet-rinkeby.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ethereum-testnet-rinkeby.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ethereum-testnet-rinkeby/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@ethereum-testnet-rinkeby.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ethereum-testnet-rinkeby&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://rinkeby.infura.io/v3/{infuraApiKey}',
      ethProviderWs: 'wss://rinkeby.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 4,
      chainId: null
    },

    'ethereum-testnet-goerli': {
      name: 'Ethereum Testnet Goerli',
      description: 'Cross-client proof-of-authority test network',
      currencyNameFull: 'Ether',
      currencyNameShort: 'Eth',
      testnet: true,
      public: true,
      blockTimeApproxMs: 15000,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'Etherscan',
          urlAddress: 'https://goerli.etherscan.io/address/{contractAddr}',
          urlTx: 'https://goerli.etherscan.io/tx/{tx}'
        }
      ],
      contractDescriptions: [
        //{addr: '0x0000000000000000000000000000000000000000', name: 'Test Contract', foreign: false}
      ],
      xmppUrlWebsocket: 'wss://ethereum-testnet-goerli.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://ethereum-testnet-goerli.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/ethereum-testnet-goerli/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@ethereum-testnet-goerli.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=ethereum-testnet-goerli&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://goerli.infura.io/v3/{infuraApiKey}',
      ethProviderWs: 'wss://goerli.infura.io/ws/v3/{infuraApiKey}', // for WebsocketProvider
      netId: 5,
      chainId: null
    },

    'thundercore-mainnet': {
      name: 'ThunderCore Mainnet',
      description: 'ThunderCore Mainnet', // TODO
      currencyNameFull: 'Thunder Token',
      currencyNameShort: 'TT',
      testnet: false,
      public: true,
      blockTimeApproxMs: 1000,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'ThunderScan',
          urlAddress: 'https://scan.thundercore.com/address/{contractAddr}',
          urlTx: 'https://scan.thundercore.com/transactions/{tx}'
        }
      ],
      contractDescriptions: [
        //{addr: '0x0000000000000000000000000000000000000000', name: 'Test Contract', foreign: false}
        {
          addr: '0xdb7CefB91b543f89DecA87F298baB42f53b3D437', // points to 0x9c4bA36f769C17e0eA4B76918e9D972b25Ce33f7
          name: 'Preview',
          foreign: false
        },
      ],
      xmppUrlWebsocket: 'wss://thundercore-mainnet.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://thundercore-mainnet.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/thundercore-mainnet/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@thundercore-mainnet.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=thundercore-mainnet&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://mainnet-rpc.thundercore.com',
      ethProviderWs: 'wss://mainnet-ws.thundercore.com', // for WebsocketProvider
      netId: 108,
      chainId: null
    },

    'thundercore-testnet': {
      name: 'ThunderCore Testnet',
      description: 'ThunderCore Testnet', // TODO
      currencyNameFull: 'Thunder Token',
      currencyNameShort: 'TT',
      testnet: true,
      public: true,
      blockTimeApproxMs: 1000,
      digioptionsBaseUrl: 'https://www.digioptions.com/redirect.html',
      explorer: [
        {
          name: 'ThunderScan',
          urlAddress: 'https://scan-testnet.thundercore.com/address/{contractAddr}',
          urlTx: 'https://scan-testnet.thundercore.com/transactions/{tx}'
        }
      ],
      contractDescriptions: [
        {addr: '0xdb543a208d6446550f469a79d497751f54b83455', name: 'ThunderCore Test Contract', foreign: false}
      ],
      xmppUrlWebsocket: 'wss://thundercore-testnet.xmpp.digioptions.com:{port}/websocket',
      xmppUrlHttpBind: 'https://thundercore-testnet.xmpp.digioptions.com:{port}/http-bind',
      xmppPortsWebsocket: [5280],
      xmppPortsHttpBind: [5280],
      xmppPubsubNodePath: '/v1/thundercore-testnet/{marketsAddr}/{marketHash}',
      xmppJidPassword: ['anon@thundercore-testnet.xmpp.digioptions.com', 'password'],
      xmppPubsubViewer: 'https://berlincode.github.io/digioptions-tools.js/pubsub.html?network=thundercore-testnet&marketsAddr={marketsAddr}&marketHash={marketHash}',
      ethProviderRPC: 'https://testnet-rpc.thundercore.com',
      ethProviderWs: 'wss://testnet-ws.thundercore.com', // for WebsocketProvider
      netId: 18,
      chainId: null
    }
  };
});
