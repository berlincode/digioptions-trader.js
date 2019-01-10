// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'web3',
        'factsigner',
        'digioptions-tools.js',
        'digioptions-contracts.js',
        './config',
        './trader'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3'),
      require('factsigner'),
      require('digioptions-tools.js'),
      require('digioptions-contracts.js'),
      require('./config.js'),
      require('./trader.js')
    );
  } else {
    // Global (browser)
    root.market = factory(
      root.Web3,
      root.factsigner,
      root.digioptionsTools,
      root.digioptionsContracts,
      root.config,
      root.trader
    );
  }
})(this, function(Web3, factsigner, digioptionsTools, digioptionsContracts, config, trader){

  /*
  Each market class should have following methods:
    * stateToProps()
    * getHeading()
    * isTerminated()
    * expire():
        This function is called if the market was instantiated with
        expired==false and meanwhile the market expired. It might be used to
        terminate the market.
    * updateBlock()
    * receivedOrder()

  Terminated markets are unsubscribed from xmpp orderbook feed and may be
  removed from memory.

  The market should call contentUpdated() to signal that stateToProps()/getHeading()
  may return updated content.
  */

  function Market(
    contentUpdated,
    web3,
    marketDefinition,
    data,
    expired,
    blockHeaderInitial,
    orderBookPublish,
    quoteProvider
  ){
    this.contentUpdated = contentUpdated;
    this.web3 = web3;
    this.expired = expired;
    this.blockHeaderInitial = blockHeaderInitial;
    this.marketDefinition = marketDefinition;
    this.data = data;
    this.orderBookPublish = orderBookPublish;
    this.quoteProvider = quoteProvider;

    this.content = null;
    this.counter = 0;
    this.pubsub_message_count = 0;
    this.timer = undefined;
    this.terminated = false; // terminated old Market may be removed from memory
    this.blockNumber = undefined;
    this.trader = null;
    this.traderInfo = null;

    this.account = web3.eth.accounts.wallet[0]; // default is to take the first account
    var that = this;

    // check if market should be started at all?
    if (this.expired){
      this.traderInfo = 'not started (already expired)';
      this.terminated = true;
      return;
    }

    var providerData = this.quoteProvider.getProviderDataFromSymbol(this.marketDefinition.marketBaseData.underlyingString);
    if (!providerData){
      this.traderInfo = 'not started: no quotes available for ' + this.marketDefinition.marketBaseData.underlyingString;
      this.terminated = true;
      return;
    }
    that.quoteProvider.setup(providerData);

    try {
      this.trader = new trader.Trader(
        this.marketDefinition
      );
    }catch(err) {
      this.traderInfo = 'not started: ' + err;
      this.terminated = true;
      return;
    }

    this.updateBlock(this.blockHeaderInitial);
  }

  Market.prototype.getExpiration = function(){
    return this.marketDefinition.marketBaseData.expiration;
  };

  Market.prototype.getUnderlyingString = function(){
    return this.marketDefinition.marketBaseData.underlyingString;
  };

  Market.prototype.getContractAddr = function(){
    return this.marketDefinition.contractAddr;
  };

  Market.prototype.genOrder = function(callbackBrowserOrder){
    var that = this;

    var traderResults = this.trader.exec(
      this.blockNumber
    );
    var orders=traderResults.orders;

    if (! this.account){
      this.traderInfo = 'Error: No account defined. Please configure an ethereum account in config.js!';
      return;
    }

    if (! orders){
      this.traderInfo = 'No orders';
      return;
    }

    var ordersSigned = [];
    (function loop(i) {
      // TODO make a promise chain here !
      //console.log('loop', i);
      if (i < orders.length) {
        var order = Object.assign(
          { // use default values if not excplicitly set
            offerOwner: that.account.address,
            marketsAddr: that.marketDefinition.contractAddr,
            marketFactHash: that.marketDefinition.marketFactHash
          },
          orders[i]
        );
        digioptionsContracts.signOrder(that.web3, order, that.account.address)
          .then(function(orderSigned){
            //console.log('then', i);
            ordersSigned.push(orderSigned);
            loop(i+1); // go on with next index
          }).catch(function (error) {
            console.log(error);
          });
      } else {
        that.orderBookPublish(ordersSigned);
      }
    })(0); // start at index 0

    return;
    //var normalize_order = digioptionsTools.normalize_order;

    //utils.call(this.web3, this.marketsContract, order.contractAddr, 'getFunds', [this.marketFactHash, order.offerOwner, false], function(err, result) {
    utils.call(this.web3, this.marketDefinition.contractAddr, order.contractAddr, 'getFunds', [this.marketDefinition.marketFactHash, order.offerOwner, false], function(err, result) {

      // TODO check err
      //console.log('toNumber', result);
      var balance = result;
      //utils.call(web3, this.marketsContract, order.contractAddr, 'getMaxLossAfterTrade', [this.marketFactHash, order.offerOwner, order.optionID, order.size, -order.size*order.price], function(err, result) {
      utils.call(web3, this.marketDefinition.contractAddr, order.contractAddr, 'getMaxLossAfterTrade', [this.marketDefinition.marketFactHash, order.offerOwner, order.optionID, order.size, -order.size*order.price], function(err, result) {
        //balance = balance + result.toNumber();
        balance = balance + result;
        balance += 1000000;// TODO fake balance
        //console.log('hash', hash, order.hash );
        //callbackBrowserOrder();
        if (balance <= 0) { // TODO
          // TODO should there be an error log to browser and disk (if running as daemon)?
          console.log('You tried sending an order to the order book, but you do not have enough funds to place your order. You need to add '+(utils.weiToEth(-balance))+' eth to your account to cover this trade. ');
        } else if (that.blockNumber <= order.blockExpires) {
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

  Market.prototype.receivedOrder = function(order){
    this.pubsub_message_count ++;
    this.updateUI();
  };

  Market.prototype.stateToProps = function(){
    return {
      traderProps: this.trader && this.trader.stateToProps(),
      expired: this.expired,
      data: this.data,
      marketDefinition: this.marketDefinition,
      terminated: this.terminated,
      contractAddr: this.marketDefinition.contractAddr,
      counter: this.counter,
      pubsub_message_count: this.pubsub_message_count,
      traderInfo: this.traderInfo,
      marketFactHash: this.marketDefinition.marketFactHash
    };
  };

  Market.prototype.updateUI = function(){
    // invalidate old content
    this.content = null;
    // signal new content
    this.contentUpdated();
  };

  Market.prototype.expire = function(){
    this.expired = true;
    this.terminate();
  };

  Market.prototype.updateBlock = function(blockHeader){
    var blockNumber = blockHeader.number;
    this.blockNumber = blockNumber;
    if (blockNumber < this.blockHeaderInitial.number + config.waitBlocks){
      this.content = 'remaining blocks ... ' + (this.blockHeaderInitial.number + config.waitBlocks - blockNumber);
      this.contentUpdated();
    }else{
      //console.log('starting ...');
      //this.start();
      this.update();
    }
  };

  Market.prototype.terminate = function(){
    if (typeof(this.timer) !== 'undefined'){
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.terminated = true;
    this.updateUI();
  };

  Market.prototype.update = function(){
    this.counter ++;
    this.genOrder(function(orders){
      //console.log(orders);
      ordersPublish(orders);
    });

    this.updateUI();
  };

  Market.prototype.isTerminated = function(){
    return this.terminated;
  };

  Market.prototype.isExpired = function(){
    return this.expired;
  };

  return {
    Market: Market
  };
});
