// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      'js/utils'
    ], function (utils) { return factory(utils).Market; } );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./utils.js')
    ).Market;
  } else {
    // Global (browser)
    root.Market = factory(
      root.utils
    ).Market;
  }
})(this, function(utils){

  /* each market should have a getContent(), getHeading() and isTerminated() method.
    * Terminated markets do not have a xmpp connection to ther order book and may be
    * removed from memory.
    * The market should call contentUpdated() to signal that getContent()
    * may return updated content.
    */
  function Market(contentUpdated, web3, network, chainId, accounts, marketContract, optionChain, orderBookPublish){

    var that = this;

    this.content = null;
    this.heading = null;
    this.counter = 0;
    this.timer = undefined;
    this.terminated = false; // terminated old Market may be removed from memory
    this.renderContent = function(){
      this.content = (
        'marketAddr: <span>' + marketContract.options.address + '</span><br/>' +
        'counter: <span>' + this.counter + '</span><br/>' +
        'expiration: <span>' + optionChain.expiration + '</span><br/>' +
        'terminated: <span>' + this.terminated + '</span>'
      );
    };
    this.renderHeading = function(){
      this.heading = (
        '' + marketContract.options.address.substr(0, 12) + '... | ' +
        '<span class="hidden-xs">network: </span>' + network + ' | ' +
        '<span class="hidden-xs">underlying: </span>' + optionChain.underlying + ' ' +
        //'<span class="badge">0 / 0</span> ' +
        (this.isTerminated()? '<span class="label label-default">terminated</span>' : '<span class="label label-success">running</span>')
      );
    };

    this.isTerminated = function(){
      return this.terminated;
    };

    this.getContent = function(){
      if (this.content === null)
        this.renderContent();
      return this.content;
    };
    this.getHeading = function(){
      if (this.heading === null)
        this.renderHeading();
      return this.heading;
    };
        

    this.updateUI = function(){
      // invalidate old content
      this.content = null;
      this.heading = null;
      // signal new content
      contentUpdated();
    };

    this.terminate = function(){
      if (typeof(that.timer) !== 'undefined'){
        clearInterval(that.timer);
        that.timer = undefined;
      }
      this.terminated = true;
      this.updateUI();
    };

    this.update = function(){
      that.counter ++;
      that.updateUI();
      if (that.counter > 10){
        that.terminate();
      }
    };

    // check if market should be started at all?
    /*
    if (marketContract.options.address === '0x834767fd1d12c50a48e9b0a8e78f93c3bb24ca6d') {
      this.content = 'not started';
      this.terminated = true;
      //contentUpdated();
      return;
    }
    */

    this.timer = setInterval(
      function(){
        //console.log('timer');
        orderBookPublish([{
          'addr': '0x9A6c7D4c70A5Cf88778E1A8bd743F17cba5D6f29',
          'blockExpires': 1632546,
          'contractAddr': '0xcabbae1fb9fe07f9af97620ab7e368ebc3352d50',
          'hash': '0x6aad0237dd1db69c6b378fcbc227e103e4e8fade64490af0ce53a67ae8d18cb0',
          'optionID' :0,
          'orderID' :4190210034,
          'price' :0,
          'r': '0x0fba2017675927ed6355050b560ab5d4041dc665b3079d7c669566af9afeb123',
          's': '0x627877e17eb112e75a4f4e03985b33817e558444ea0ee17104a5f197a4426c3a',
          'size': 1000000000000000000,
          'v': 27
        }]);
        that.update();
      },
      2000
    );
  }

  return {'Market': Market};
});

