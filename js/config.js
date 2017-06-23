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
          //root.Web3 /* TODO: quick hack for web3 before 1.0 - we use global Web3, because require("web3") returns BigNumber - see https://github.com/ethereum/web3.js/issues/280 */
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
  var web3 = new Web3();

  var config = {
    // list networks that should be monitored (e.g. mainnet, ropsten, ...)
    'networks': ['ropsten'],

    accounts: {
      'mainnet': [
        //web3.eth.accounts.privateToAccount(<your-private-key>)
      ],
      'ropsten': [
        //web3.eth.accounts.privateToAccount(<your-private-key>)
      ],
      'kovan': [
        //web3.eth.accounts.privateToAccount(<your-private-key>)
      ],
      'rinkeby': [
        //web3.eth.accounts.privateToAccount(<your-private-key>)
      ]
    },

    //pubsub_protocol: 'ws', /* websocket push */
    //pubsub_protocol: 'http', /* http bosh */
    //pubsub_host: 'ulf',
    // TODO
    pubsub_protocol: 'wss', /* websocket */
    pubsub_host: 'ropsten.xmpp.digioptions.com',


    // optional basic authentication for nodejs server
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
