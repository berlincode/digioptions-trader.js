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
    root.data_digioptions = factory();
  }
})(this, function(){

  return {
    pageStart: {
      baseUrl: '#',
      args: []
    },
    pageNetwork: {
      baseUrl: '#/{network}',
      args: ['network']
    },
    pageMarketList: {
      baseUrl: '#/{network}/{contractAddr}/list',
      args: ['network', 'contractAddr']
    },
    pageMarketListSelected: { // same as 'pageMarketList', but with marketHash selected
      baseUrl: '#/{network}/{contractAddr}/{marketHash}/list',
      args: ['network', 'contractAddr', 'marketHash']
    },
    pageHistory: { /* contract deposits and withdrawals */
      baseUrl: '#/{network}/{contractAddr}/depositwithdraw',
      args: ['network', 'contractAddr']
    },
    pageMarket: {
      baseUrl: '#/{network}/{contractAddr}/{marketHash}',
      args: ['network', 'contractAddr', 'marketHash']
    },
    pageTransactions: {
      baseUrl: '#/{network}/{contractAddr}/{marketHash}/transactions',
      args: ['network', 'contractAddr', 'marketHash']
    }//,
    /* static files */
    //pageImprint: {
    //  baseUrl: 'imprint.html',
    //  args: []
    //}
  };
});
