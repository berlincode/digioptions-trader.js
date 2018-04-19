// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'web3'
      ], function (
        Web3
      ) {
        return factory(
          Web3
        ).config; } );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3')
    ).config;
  } else {
    // Global (browser)
    root.config = factory(
      root.Web3
    ).config;
  }
})(this, function(Web3){

  var web3 = new Web3(); // eslint-disable-line  no-unused-vars

  var config = {
    //pubsub_protocol: 'ws', /* websocket push */
    //pubsub_protocol: 'http', /* http bosh */
    //pubsub_host: 'ulf',
    // TODO
    pubsub_protocol: 'wss', /* websocket */
    pubsub_host: 'ropsten.xmpp.digioptions.com',


    /**************************/
    /* MarketMonitor settings */
    /**************************/

    /* list networks that should be monitored (e.g. 'main', 'ropsten', ...) */
    networks: ['ropsten'],

    /* list/try to start markets that are expired no more than 74 hours ago */
    marketsListExpiredSeconds: 74 * 60 * 60,

    /* unlist/remove markets that are expired more that 120 hours ago - this
    setting should be higher that 'marketsList' to prevent the restart of markets
    that are alreasy removed from memory */
    marketsDeleteExpiredSeconds: 120 * 60 * 60,

    /* keep at least 20 markets before deleting old markets */
    marketsKeepMin: 20,


    /*******************/
    /* Market settings */
    /*******************/

    /* wait some blockchain blocks before starting to trade. Immediately after
    a restart there might be some of our orders that are still valid, and we
    want to wait for expiration before starting again*/
    waitBlocks: 5,
    //waitBlocks: 0,

    /* Set account(s) for each network via the private key. */
    accounts: {
      'main': [
        //web3.eth.accounts.privateKeyToAccount(<your-private-key>)
      ],
      'ropsten': [
        //web3.eth.accounts.privateKeyToAccount(<your-private-key>)
      ],
      'kovan': [
        //web3.eth.accounts.privateKeyToAccount(<your-private-key>)
      ],
      'rinkeby': [
        //web3.eth.accounts.privateKeyToAccount(<your-private-key>)
      ]
    },


    /*******************/
    /* Nodejs settings */
    /*******************/

    /* optional basic authentication for nodejs server */
    basicAuth:{
      enabled: false,
      jwtSecret: null, /* if enabled is true you have to supply a secret */
      jwtExpiresIn: '30d', /* expiration time of javascript web token */
      users: { // username (key) and password (value)
        //'admin': 'options'
      },
    }

  };

  return {'config': config};
});
