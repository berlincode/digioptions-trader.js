// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'web3',
        'digioptions-tools.js'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3'),
      require('digioptions-tools.js')
    );
  } else {
    // Global (browser)
    root.config = factory(
      root.Web3,
      root.digioptionsTools
    );
  }
})(this, function(Web3, digioptionsTools){

  var web3 = new Web3(); // eslint-disable-line no-unused-vars

  function contractAddressesDefault(dataNetwork){
    return dataNetwork.contractDescriptions.map(function(x){return x.addr;});
  }

  var config = {

    /**************************/
    /* MarketMonitor settings */
    /**************************/

    /* list networks that should be monitored (e.g. 'ethereum-mainnet', 'ethereum-testnet-goerli', ...) */
    networks: ['thundercore-mainnet', 'thundercore-testnet'],

    /* list/try to start markets that are expired no more than 74 hours ago */
    marketsListExpiredSeconds: 74 * 60 * 60,

    /* unlist/remove markets that are expired more that 120 hours ago - this
    setting should be higher that 'marketsList' to prevent the restart of markets
    that are alreasy removed from memory */
    marketsDeleteExpiredSeconds: 120 * 60 * 60,

    /* keep at least 20 markets before deleting old markets */
    marketsKeepMin: 20,

    /* no trading if date of quote is older than <maxQuoteAge> seconds to the system clock */
    maxQuoteAge: 100,

    /* try to reconnect to geth provider after ~ ms */
    gethReconnectInterval: 3000,

    /*******************/
    /* Market settings */
    /*******************/

    /* wait some blockchain blocks before starting to trade. Immediately after
    a restart there might be some of our offers that are still valid, and we
    want to wait for expiration before starting again*/
    //waitBlocks: 5,
    waitBlocks: 0,

    /* Set account(s) for each network via the private key. */
    privateKeys: {
      'ethereum-mainnet': [
        //'0x<your-private-key>',
      ],
      'ethereum-testnet-goerli': [
        //'0x<your-private-key>',
      ],
      'ethereum-testnet-kovan': [
        //'0x<your-private-key>',
      ],
      'ethereum-testnet-rinkeby': [
        //'0x<your-private-key>',
      ],
      'thundercore-mainnet': [
        //'0x<your-private-key>',
      ],
      'thundercore-testnet': [
        //'0x<your-private-key>',
      ]
    },

    providerArgs: {
      /* fill in here the your api key (something like 'c57a2f1bef85450b897b08839e9026cc') 
       * without leading xxx.infura.io/v3/
       */  
      infuraApiKey: ''
    },

    contractAddresses: {
      // a list of contracts which are monitored
      'ethereum-mainnet': contractAddressesDefault(digioptionsTools.dataNetworks['ethereum-mainnet']),
      'ethereum-testnet-goerli': contractAddressesDefault(digioptionsTools.dataNetworks['ethereum-testnet-goerli']),
      'ethereum-testnet-kovan': contractAddressesDefault(digioptionsTools.dataNetworks['ethereum-testnet-kovan']),
      'ethereum-testnet-rinkeby': contractAddressesDefault(digioptionsTools.dataNetworks['ethereum-testnet-rinkeby']),
      'thundercore-mainnet': contractAddressesDefault(digioptionsTools.dataNetworks['thundercore-mainnet']),
      'thundercore-testnet': contractAddressesDefault(digioptionsTools.dataNetworks['thundercore-testnet']),
      'celo-alfajores': contractAddressesDefault(digioptionsTools.dataNetworks['celo-alfajores'])
    },

    /* debug setting */
    offersPublish: true,

    /*******************/
    /* Nodejs settings */
    /*******************/

    /* optional basic authentication for nodejs server */
    basicAuth:{
      enabled: false,
      realm: 'digioptions-trader.js',
      jwtSecret: null, /* if enabled is true you have to supply a secret (a long random string) */
      jwtExpiresIn: '30d', /* expiration time of javascript web token */
      users: { // username (key) and password (value)
        //'admin': 'options'
      },
    }

  };

  if ((typeof(window) != 'undefined') && window.location && (window.location.hostname == 'berlincode.github.io') && (config.providerArgs.infuraApiKey == '')) {
    // whitelisted only for berlincode.github.io
    config.providerArgs.infuraApiKey = 'c57a2f1bef85450b897b08839e9026cc';
  }

  return config;
});
