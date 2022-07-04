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

  var web3 = new Web3(); // eslint-disable-line no-unused-vars

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
    account,
    marketDefinition,
    contractDescription,
    data,
    expired,
    blockHeaderInitial,
    offersPublish,
    quoteProvider,
    versionString
  ){
    this.contentUpdated = contentUpdated;
    this.account = account;
    this.expired = expired;
    this.blockHeaderInitial = blockHeaderInitial;
    this.marketDefinition = marketDefinition;
    this.contractDescription = contractDescription;
    this.data = data;
    this.offersPublish = offersPublish;
    this.quoteProvider = quoteProvider;
    this.versionString = versionString;

    this.counter = 0;
    this.pubsubMessageCount = 0;
    //this.timer = undefined;
    this.terminated = false; // terminated old market may be removed from memory
    this.blockHeader = undefined;
    this.trader = null;
    this.marketMessages = {};

    this.contract = null;
    this.positionChanges = {};
    this.positions = Array.apply(null, {length: marketDefinition.marketBaseData.strikesStrings.length+1}).map(function(){return web3.utils.toBN('0');});
    this.cash = web3.utils.toBN('0');
    this.eventSubPositionChange0 = null;
    this.eventSubPositionChange1 = null;

    this.positionChangeCallback = false;
  }

  Market.prototype.isReady = function(){
    var self = this;

    return (
      self.contract &&
      self.positionChangeCallback
    );
  };

  Market.prototype.marketMessageSet = function(key, value){
    var self = this;

    if (self.marketMessages[key] === value)
      return; // do nothing

    self.marketMessages = Object.assign({}, self.marketMessages);
    self.marketMessages[key] = value;
  };

  Market.prototype.marketMessageRemove = function(key){
    var self = this;

    if (typeof(self.marketMessages[key]) === 'undefined')
      return; // do nothing
        
    self.marketMessages = Object.assign({}, self.marketMessages);
    delete self.marketMessages[key];
  };

  Market.prototype.updateState = function(){
    var self = this;

    if (! self.contract){
      self.marketMessageSet('state', 'web3 disconnected ....');
      return;
    }
    if (self.isReady()){
      self.marketMessageRemove('state');
    }
  };

  Market.prototype.web3Connected = function(web3){ // external
    var self = this;

    self.contract = new web3.eth.Contract(digioptionsContracts.digioptionsMarketsAbi(), self.contractDescription.marketsAddr);

    self.positionChangeCallback = false;

    function addEventPositionChange(evt, buy){
      if (self.positionChanges[evt.id])
        return;

      console.log('aaa evt', evt);
      var positionChange = {
        optionID: Number(evt.returnValues.optionID), // TODO Cannot read property 'optionID' of undefined
        size: web3.utils.toBN(evt.returnValues.size),
        pricePerOption: (
          buy?
            web3.utils.toBN(evt.returnValues.pricePerOption)
            :
            web3.utils.toBN(evt.returnValues.pricePerOption) //.neg()
        )
      };

      //console.log(positionChange);
      self.positions[positionChange.optionID] = self.positions[positionChange.optionID].add(positionChange.size);
      self.cash = self.cash.add(positionChange.size.mul(positionChange.pricePerOption));

      self.positionChanges[evt.id] = positionChange;
    }

    web3.eth.getBlock('latest')
      .then(function(blockHeader){
        return digioptionsContracts.getPastEvents(
          self.contract, // contract
          self.contractDescription.blockCreatedMarkets, // fromBlock
          blockHeader.number, // toBlock
          [
            [
              'PositionChange', // eventName
              {buyer: [self.account? self.account.address : '0x0'], marketHash: [self.marketDefinition.marketHash]}, // filter
            ],
            [
              'PositionChange', // eventName
              {seller: [self.account? self.account.address : '0x0'], marketHash: [self.marketDefinition.marketHash]}, // filter
            ]
          ],
          { // options
            timestampStop: self.marketDefinition.expiration - digioptionsContracts.marketStartMaxIntervalBeforeExpiration[self.marketDefinition.marketBaseData.marketInterval],
          }
        );
      })
      .then(function(eventsList){
        var eventsBuy = eventsList[0]; // result from the first eventNameAndFilter
        var eventsSell = eventsList[1]; // result from the second eventNameAndFilter

        var idx;
        for (idx in eventsBuy){
          addEventPositionChange(eventsBuy[idx], true);
        }
        for (idx in eventsSell){
          addEventPositionChange(eventsSell[idx], false);
        }
        self.positionChangeCallback = true;
        self.updateState();
      })
      .catch(function(error){
        console.log('promise catch getPastEvents PositionChange', error); // TODO handle
      });

    self.eventSubPositionChange0 = self.contract.events.PositionChange(
      {
        filter: {
          buyer: [self.account? self.account.address : '0x0'],
          marketHash: [self.marketDefinition.marketHash]
        }
      },
      function(error, evt){
        console.log('eventSubPositionChange0', evt);
        if (!error) {
          addEventPositionChange(evt, true);
        } else {
          console.log('Error eventSubPositionChange0:', error);
        }
      });

    self.eventSubPositionChange1 = self.contract.events.PositionChange(
      {
        filter: {
          seller: [self.account? self.account.address : '0x0'],
          marketHash: [self.marketDefinition.marketHash]
        }
      },
      function(error, evt){
        console.log('eventSubPositionChange1', evt);
        if (!error) {
          addEventPositionChange(evt, false);
        } else {
          console.log('Error eventSubPositionChange1:', error);
        }
      });
  };

  Market.prototype.unsubscribe = function(){
    var self = this;

    if (self.eventSubPositionChange0){
      self.eventSubPositionChange0.unsubscribe()
        .catch(function(/*err*/){console.log('eventSubPositionChange0.unsubscribe() failure - maybe network connection is already closed?');});
    }
    self.eventSubPositionChange0 = null;

    if (self.eventSubPositionChange1){
      self.eventSubPositionChange1.unsubscribe()
        .catch(function(/*err*/){console.log('eventSubPositionChange1.unsubscribe() failure - maybe network connection is already closed?');});
    }
    self.eventSubPositionChange1 = null;
  };

  Market.prototype.web3Disconnected = function(){ // external
    var self = this;

    self.unsubscribe();
    self.contract = null;
    self.updateState();
  };

  Market.prototype.setup = function(){ // returns Promise // external
    var self = this;
    // check if market should be started at all?
    if (this.expired){
      self.marketMessageSet('notStarted', 'not started (already expired)');
      this.terminated = true;
      return Promise.resolve();
    }

    var providerData = digioptionsTools.quoteProvider.getProviderDataFromUnderlyingParts(
      this.marketDefinition.marketBaseData.underlyingParts,
      this.marketDefinition.marketBaseData.underlyingString // TODO is this required anymore
    );
    if (!providerData){
      self.marketMessageSet('notStarted', 'not started: no quotes available for ' + this.marketDefinition.marketBaseData.underlyingString);
      this.terminated = true;
      return Promise.resolve();
    }
    self.quoteProvider.setup(providerData);

    try {
      this.trader = new trader.Trader(
        this.marketDefinition,
        this.contractDescription,
        this.genOrder.bind(this),
        this.versionString
      );
    }catch(err) {
      //console.log('Market "' + this.marketDefinition.marketBaseData.underlyingString.replace(/\0/g,'/') + '" / ' + this.marketDefinition.marketHash + ' not started:', err);
      self.marketMessageSet('notStarted', 'not started: ' + err);
      this.terminated = true;
      return Promise.resolve();
    }

    self.marketMessageSet('state', 'loading ...'); // initial message
    if (! self.account){
      self.marketMessageSet('noAccount', 'warn: please enter your account in config.js to allow trading');
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
    return this.contractDescription.marketsAddr;
  };

  // TODO rename ...Offer
  Market.prototype.genOrder = function(orders){
    var self = this;

    if (! this.account){
      //self.marketMessageSet('notAccount', 'Error: No account defined. Please configure an ethereum account in config.js!');
      return;
    }

    var ordersSigned = []; // TODO rename offersSigned
    for (var i=0 ; i < orders.length ; i ++){
      var order = Object.assign(
        {
          // use default values if not excplicitly set
          offerOwner: self.account.address,
          marketsAddr: self.contractDescription.marketsAddr,
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
    this.pubsubMessageCount += offers.length;
    this.updateUI();
  };

  Market.prototype.stateToProps = function(){
    return {
      traderProps: this.trader && this.trader.stateToProps(),
      expired: this.expired,
      data: this.data,
      marketDefinition: this.marketDefinition,
      terminated: this.terminated,
      contractDescription: {
        marketsAddr: this.contractDescription.marketsAddr,
        contractAddr: this.contractDescription.contractAddr
      },
      counter: this.counter,
      pubsubMessageCount: this.pubsubMessageCount,
      marketMessages: this.marketMessages,
      marketHash: this.marketDefinition.marketHash
    };
  };

  Market.prototype.updateUI = function(){
    // signal new content
    this.contentUpdated();
  };

  Market.prototype.expire = function(){
    this.expired = true;
    this.terminate();
  };

  Market.prototype.updateBlock = function(blockHeader){
    var self = this;

    self.blockHeader = blockHeader;

    var blockNumber = blockHeader.number;
    // TODO move to isReady()?
    if (blockNumber < self.blockHeaderInitial.number + config.waitBlocks){
      self.marketMessageSet('startupBlocks', 'remaining blocks ... ' + (self.blockHeaderInitial.number + config.waitBlocks - blockNumber));
      self.contentUpdated();
    }else{
      self.marketMessageRemove('startupBlocks');
      //console.log('starting ...');
      //self.start();
      self.update();
    }
  };

  Market.prototype.terminate = function(){
    var self = this;

    /*
    if (typeof(self.timer) !== 'undefined'){
      clearInterval(self.timer);
      self.timer = undefined;
    }
    */
    if (self.trader){
      self.trader.close();
    }
    self.terminated = true;
    self.updateUI();
  };

  Market.prototype.update = function(){
    var self = this;
    self.counter ++;

    if (! self.isReady()){
      // TODO print message
      return;
    }

    self.contract.methods.getLiquidityAndPositions(self.marketDefinition.marketHash).call({from: self.account? self.account.address: null}) // (bytes32 marketHash)
      .then(function(liquidityAndPositions){
        //console.log('x', liquidityAndPositions);
        self.trader.exec(
          {
            number: self.blockHeader.number,
            timestamp: self.blockHeader.timestamp
          },
          self.cash,
          liquidityAndPositions.liquidity, // liquidity
          liquidityAndPositions.positions
        );
      })
      .catch(function(error){
        console.log('getLiquidityAndPositions error for ' + self.marketDefinition.marketBaseData.underlyingString + ':', error);
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
