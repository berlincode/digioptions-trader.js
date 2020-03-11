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
    * receivedsOrder()

  Terminated markets are unsubscribed from xmpp orderbook feed and may be
  removed from memory.

  The market should call contentUpdated() to signal that stateToProps()/getHeading()
  may return updated content.
  */

  function Market(
    contentUpdated,
    web3,
    contract,
    marketDefinition,
    data,
    expired,
    blockHeaderInitial,
    offersPublish,
    quoteProvider
  ){
    this.contentUpdated = contentUpdated;
    this.web3 = web3;
    this.contract = contract;
    this.expired = expired;
    this.blockHeaderInitial = blockHeaderInitial;
    this.marketDefinition = marketDefinition;
    this.data = data;
    this.offersPublish = offersPublish;
    this.quoteProvider = quoteProvider;

    this.content = null;
    this.counter = 0;
    this.pubsub_message_count = 0;
    this.timer = undefined;
    this.terminated = false; // terminated old market may be removed from memory
    this.blockHeader = undefined;
    this.trader = null;
    this.traderInfo = null;

    this.account = web3.eth.accounts.wallet.accounts[0]; // default is to take the first account
  }

  Market.prototype.setup = function(){ // returns Promise
    var self = this;
    // check if market should be started at all?
    if (this.expired){
      this.traderInfo = 'not started (already expired)';
      this.terminated = true;
      return Promise.resolve();
    }

    var providerData = digioptionsTools.quoteProvider.getProviderDataFromUnderlyingParts(
      this.marketDefinition.marketBaseData.underlyingParts,
      this.marketDefinition.marketBaseData.underlyingString
    );
    if (!providerData){
      this.traderInfo = 'not started: no quotes available for ' + this.marketDefinition.marketBaseData.underlyingString;
      this.terminated = true;
      return Promise.resolve();
    }
    self.quoteProvider.setup(providerData);

    try {
      this.trader = new trader.Trader(
        this.marketDefinition,
        this.genOrder.bind(this)
      );
    }catch(err) {
      console.log('Market "' + this.marketDefinition.marketBaseData.underlyingString.replace(/\0/g,'/') + '" not started:', err);
      this.traderInfo = 'not started: ' + err;
      this.terminated = true;
      return Promise.resolve();
    }

    return this.trader.setup()
      .then(function(){
        self.updateBlock(self.blockHeaderInitial);
      });
  };

  Market.prototype.getExpiration = function(){
    return this.marketDefinition.marketBaseData.expiration;
  };

  Market.prototype.getUnderlyingString = function(){
    return this.marketDefinition.marketBaseData.underlyingString;
  };

  Market.prototype.getMarketsAddr = function(){
    return this.marketDefinition.marketsAddr;
  };

  // TODO rename ...Offer
  Market.prototype.genOrder = function(orders){
    var self = this;

    if (! this.account){
      this.traderInfo = 'Error: No account defined. Please configure an ethereum account in config.js!';
      return;
    }

    if (! orders){
      this.traderInfo = 'No orders';
      return;
    }

    var ordersSigned = []; // TODO rename offersSigned
    for (var i=0 ; i < orders.length ; i ++){
      var order = Object.assign(
        {
          // use default values if not excplicitly set
          offerOwner: self.account.address,
          marketsAddr: self.marketDefinition.marketsAddr,
          marketHash: self.marketDefinition.marketHash
        },
        orders[i]
      );
      var orderSigned = Object.assign({}, order, digioptionsContracts.signOrderOffer(order, this.account.privateKey));
      ordersSigned.push(orderSigned);
    }
    this.offersPublish(ordersSigned);
  };

  Market.prototype.receivedOrders = function(offers){
    this.pubsub_message_count += offers.length;
    this.updateUI();
  };

  Market.prototype.stateToProps = function(){
    return {
      traderProps: this.trader && this.trader.stateToProps(),
      expired: this.expired,
      data: this.data,
      marketDefinition: this.marketDefinition,
      terminated: this.terminated,
      marketsAddr: this.marketDefinition.marketsAddr,
      counter: this.counter,
      pubsub_message_count: this.pubsub_message_count,
      traderInfo: this.traderInfo,
      marketHash: this.marketDefinition.marketHash
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
    this.blockHeader = blockHeader;

    var blockNumber = blockHeader.number;
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
    var self = this;
    self.counter ++;
    self.contract.methods.getLiquidityAndPositions(self.marketDefinition.marketHash).call({from: self.account.address}) // (bytes32 marketHash)
      .then(function(liquidityAndPositions){
        self.trader.exec(
          self.blockHeader,
          liquidityAndPositions
        );
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
