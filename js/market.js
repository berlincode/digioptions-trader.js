// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        './config',
        './utils'
      ], function (
        config,
        utils) {
        return factory(
          config,
          utils
        ).Market; } );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./config.js'),
      require('./utils.js')
    ).Market;
  } else {
    // Global (browser)
    root.Market = factory(
      root.config,
      root.utils
    ).Market;
  }
})(this, function(config, utils){

  /*
  Each market class should have following methods:
    * getContent()
    * getHeading()
    * isTerminated()
    * expire():
        This function is called if the market was instantiated with
        expired==false and meanwhile the market expired. It might be used to
        terminate the market.
    * updateBlockNumber()

  Terminated markets are unsubscribed from xmpp orderbook feed and may be
  removed from memory.

  The market should call contentUpdated() to signal that getContent()/getHeading()
  may return updated content.
  */

  function Market(
    contentUpdated,
    web3,
    network,
    chainId,
    marketsContract,
    marketFactHash,
    optionChain,
    expired,
    blockNumberInitial,
    orderBookPublish
  ){

  //var toBN = function(val){return new web3.utils.BN(val);}; // for web3 1.0
    var accounts = config.accounts[network];

    var gen_order = function(callbackBrowserOrder){
      var orders = [];
      var blockNumber = 100000;
      var cumulativeMatchSize = 0;
      var update = 5;
      var account = accounts[0];
      var order={
        addr: account.address, // TODO
        optionID: 0,
        price: 1,
        size: 1,
        orderID: 0, //utility.getRandomInt(0,Math.pow(2,32));  //  TODO
        blockExpires: blockNumber + update,
        marketsAddr: marketsContract.options.address,
        marketFactHash: '0xdb2852b3edf8820ebad17f6cdb67a1c234cd519105a6b0e935c8fe336e6b310c'
      };

      order = utils.signOrder(order, account.privateKey); // sign order (add r, s, v)
      console.log('signed order', order);
      console.log('verifyOrder', utils.verifyOrder(order));
      //var normalize_order = digioptionsTools.normalize_order;

      utils.call(web3, marketsContract, order.contractAddr, 'getFunds', [marketFactHash, order.addr, false], function(err, result) {

        // TODO check err
        console.log('toNumber', result);
        //var balance = result.toNumber();
        var balance = result;
        utils.call(web3, marketsContract, order.contractAddr, 'getMaxLossAfterTrade', [marketFactHash, order.addr, order.optionID, order.size, -order.size*order.price], function(err, result) {
          //balance = balance + result.toNumber();
          balance = balance + result;
          balance += 1000000;// TODO fake balance
          //console.log('hash', hash, order.hash );
          //callbackBrowserOrder();
          if (balance<=0) {
            console.log('You tried sending an order to the order book, but you do not have enough funds to place your order. You need to add '+(utils.weiToEth(-balance))+' eth to your account to cover this trade. ');
          } else if (blockNumber <= order.blockExpires) {
            orders.push(order);
            console.log('added 1 order ready to publish ' + orders.length);
            callbackBrowserOrder(orders);
          } else {
            console.log('invalid order');
            //callbackBrowserOrder();
          }
        });
      });
    };

    gen_order(function(orders){
      console.log(orders);
      //orderBookPublish(orders);
    });

    this.content = null;
    this.heading = null;
    this.counter = 0;
    this.timer = undefined;
    this.terminated = false; // terminated old Market may be removed from memory

    this.getContent = function(){
      if (this.content === null){
        this.content = (
          'marketAddr: <span>' + marketsContract.options.address + '</span><br/>' +
          'counter: <span>' + this.counter + '</span><br/>' +
          'expiration: <span>' + optionChain.expiration + '</span><br/>' +
          'terminated: <span>' + this.terminated + '</span>'
        );
      }
      return this.content;
    };

    this.getHeading = function(){
      if (this.heading === null) {
        this.heading = (
          '' + marketsContract.options.address.substr(0, 12) + '... | ' +
          '<span class="hidden-xs">network: </span>' + network + ' | ' +
          '<span class="hidden-xs">underlying: </span>' + optionChain.underlying + ' ' +
          (expired ?
            '<span key="market_open_close" class="label label-default">closed</span>'
            :
            '<span key="market_open_close" class="label label-success">open</span>'
          ) + ' ' +

          //'<span class="badge">0 / 0</span> ' +
          (this.isTerminated()? '<span class="label label-default">terminated</span>' : '<span class="label label-success">running</span>')
        );
      }
      return this.heading;
    };

    this.isTerminated = function(){
      return this.terminated;
    };

    this.updateUI = function(){
      // invalidate old content
      this.content = null;
      this.heading = null;
      // signal new content
      contentUpdated();
    };

    this.expire = function(){
      expired = true;
      this.terminate();
    };

    this.updateBlockNumber = function(blockNumber){

      if (blockNumber < blockNumberInitial + config.waitBlocks){
        this.content = 'remaining blocks ... ' + (blockNumberInitial + config.waitBlocks - blockNumber);
        contentUpdated();
      }else{
        console.log('starting ...');
        this.start();
      }
    };

    this.terminate = function(){
      if (typeof(this.timer) !== 'undefined'){
        clearInterval(this.timer);
        this.timer = undefined;
      }
      this.terminated = true;
      this.updateUI();
    };

    this.update = function(){
      this.counter ++;
      this.updateUI();
    };

    this.start = function(){
      if (! this.timer) {
        this.update();

        this.timer = setInterval(
          function(){
            //console.log('timer');
            this.update();
          }.bind(this),
          2000
        );
      }
    };

    // check if market should be started at all?
    if (expired){
      this.content = 'not started';
      this.terminated = true;
      return;
    }

    this.updateBlockNumber(blockNumberInitial);

  }

  return {'Market': Market};
});

