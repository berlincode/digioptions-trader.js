// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        './config',
        'factsigner',
        'digioptions-tools.js',
        'digioptions-contracts.js',
        'web3',
        './market',
        './db'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./config.js'),
      require('factsigner'),
      require('digioptions-tools.js'),
      require('digioptions-contracts.js'),
      require('web3'),
      require('./market.js'),
      require('./db.js')
    );
  } else {
    // Global (browser)
    root.main = factory(
      root.config,
      root.factsigner,
      root.digioptionsTools,
      root.digioptionsContracts,
      root.Web3,
      root.market,
      root.db
    );
  }
})(this, function(config, factsigner, digioptionsTools, digioptionsContracts, Web3, market, db){
  var PubSub = digioptionsTools.PubSub;
  var QuoteProvider = digioptionsTools.quoteProvider.QuoteProvider;
  //var KeyTimestampMs = digioptionsTools.quoteProvider.KeyTimestampMs;

  function Monitor(contentUpdated, network, quoteProvider){

    this.contentUpdated = contentUpdated;
    this.network = network;
    this.quoteProvider = quoteProvider;
    this.web3 = null;

    this.dataNetwork = digioptionsTools.dataNetworks[network];

    this.pubsubMessageCount = 0;
    this.pubsubFeedbackMsg = '???';
    this.pubsub_feedback_col = '#000000';
    this.pubsub_feedback_connection_ok = false;
    this.start_time = new Date();
    this.markets = {};
    this.blockHeader = undefined;
    this.pubsub = undefined;
  }

  Monitor.prototype.getSortedMarketKeys = function(markets){
    var sortable = [];
    for (var key in markets) {
      sortable.push(key);
    }

    sortable.sort(function(a, b) {
      return markets[b].getExpiration() - markets[a].getExpiration();
    });
    return sortable;
  };

  Monitor.prototype.updateUI = function(){
    // signal new content
    this.contentUpdated();
  };

  Monitor.prototype.stateToProps = function(){
    var that = this;

    var sortedMarketKeys = that.getSortedMarketKeys(that.markets);

    var marketProps = {};
    sortedMarketKeys.forEach(function (marketFactHash){
      marketProps[marketFactHash] = that.markets[marketFactHash].stateToProps();
    });

    return {
      network: this.network,
      sortedMarketKeys: that.getSortedMarketKeys(that.markets),
      web3Connected: Boolean(this.web3),
      pubsubFeedbackMsg: this.pubsubFeedbackMsg,
      pubsubMessageCount: this.pubsubMessageCount,
      accounts: config.accounts[this.network],
      contractAddresses: this.dataNetwork.contractDescriptions.map(function(x){return x.addr;}),
      uptime: Math.floor((new Date() - this.start_time) / 1000),
      blockHeader: this.blockHeader && {
        // send only selected properties of blockHeader
        timestamp: this.blockHeader.timestamp,
        number: this.blockHeader.number
      },
      marketProps: marketProps,
      dbIsRunning: db.isRunning()
    };
  };

  Monitor.prototype.deleteOldTerminatedMarkets = function(){
    // remove old terminated markets to free memory
    var now = Math.floor(Date.now() / 1000);

    // try to delete old markets
    var sortedMarketKeys = this.getSortedMarketKeys(this.markets);
    for (var idx in sortedMarketKeys){
      // if number is too low a delete market might be restarted
      var market_key = sortedMarketKeys[idx];
      var market = this.markets[market_key]; // TODO marketinfo
      if (
        (idx >= config.marketsKeepMin) &&
        market.isTerminated() &&
        (market.getExpiration() < now - config.marketsDeleteExpiredSeconds) &&
        market.expired
      ){
        delete this.markets[market_key];
      }
    }
  };

  Monitor.prototype.setupMarket = function(contractAddr, marketFactHash){
    var that = this;
    var contract = new this.web3.eth.Contract(digioptionsContracts.digioptionsMarketsAbi, contractAddr);

    contract.methods.getMarketData(marketFactHash).call()
      .then(function(result) {
        var key = marketFactHash.toLowerCase();
        if (that.markets[key]){
          // market already exists
          return;
        }

        var data = {
          winningOptionID: Number(result.data.winningOptionID),
          settled: Boolean(result.data.settled),
          testMarket: Boolean(result.data.testMarket)
        };
        var expired = result.data.settled;

        var marketBaseData = {
          baseUnitExp: Number(result.marketBaseData.baseUnitExp),
          expiration: Number(result.marketBaseData.expirationDatetime),
          underlying: result.marketBaseData.underlying,
          underlyingString: factsigner.hexToString(result.marketBaseData.underlying),
          transactionFeeStringPercent: factsigner.toUnitStringExact(Web3.utils.toBN(result.marketBaseData.transactionFee).mul(Web3.utils.toBN('100')), Number(result.marketBaseData.baseUnitExp)),
          ndigit: Number(result.marketBaseData.ndigit),
          signerAddr: result.marketBaseData.signerAddr,
          // TODO parseFloat
          strikesFloat: result.marketBaseData.strikes.map(function(x){return parseFloat(factsigner.toUnitString(Web3.utils.toBN(x), Number(result.marketBaseData.baseUnitExp), Number(result.marketBaseData.ndigit)));}),
          strikesStrings: result.marketBaseData.strikes.map(function(x){return factsigner.toUnitString(Web3.utils.toBN(x), Number(result.marketBaseData.baseUnitExp), Number(result.marketBaseData.ndigit));})
        };

        var marketDefinition = { // constant market definition
          network: that.network,
          chainID: that.dataNetwork.chainID,
          contractAddr: contractAddr,
          marketFactHash: marketFactHash,
          marketBaseData: marketBaseData,
          typeDuration: Number(result.data.typeDuration)
        };

        //console.log('new market (real trigger)', key);
        that.markets[key] = new market.Market(
          that.updateUI.bind(that),
          that.web3,
          //config.accounts[network],
          marketDefinition,
          data,
          expired,
          that.blockHeader,
          function(data_array) { // ordersPublish
            if ((that.pubsub) && (that.pubsub_feedback_connection_ok)){ // TODO
              that.pubsub.publish(data_array, contractAddr, marketFactHash);
            }
          },
          that.quoteProvider
        );
        that.updateUI(); // to show the new market immediately

        if (! that.markets[key].isTerminated()){
          that.pubsub.subscribe(contractAddr, marketFactHash);
        }
      });
  };

  Monitor.prototype.searchMarkets = function(){
    var that = this;
    var now = Math.floor(Date.now() / 1000);

    this.dataNetwork.contractDescriptions.forEach(function (marketsDescription){
      var contractAddr = marketsDescription.addr;

      // check for new markets
      var contract = new that.web3.eth.Contract(digioptionsContracts.digioptionsMarketsAbi, contractAddr);
      // TODO 20 (create config variable)
      //console.log("getMarketDataList", contractAddr)
      /* set the seconds so that even on sunday evening  we would see some (closed markets) */
      contract.methods.getMarketDataList(false, false, now - config.marketsListExpiredSeconds, 20, []).call()
        .then(function(marketDataList) {
          marketDataList = marketDataList.filter(function(marketData){return marketData.marketBaseData.expirationDatetime > 0;});
          //console.log("MarketList",result)
          for (var i=0 ; i < marketDataList.length ; i++){
            var marketFactHash = marketDataList[i].marketFactHash;
            var key = marketFactHash.toLowerCase();
            if (! that.markets[key]){
              //console.log('new market (getMarketData)', key);
              that.setupMarket(contractAddr, marketFactHash);
            }
          }
        });
    });
  };

  Monitor.prototype.setupPubsub = function(){
    var pubsub = new PubSub(this.network);
    //pubsub.debug = true;

    pubsub.on_data = function(data){
      var i;
      for (i=0 ; i < data.length ; i++){
        var order = data[i];
        order = digioptionsTools.orderNormalize(order);
        if (order) {
          var key0 = order.marketFactHash.toLowerCase(); // TODO rename key
          var market = this.markets[key0];
          if (! market){
            // TODO log info
            //console.log('no such market', order.contractAddr);
            continue;
          }

          market.receivedOrder(order);
          //var key = digioptionsTools.orderUniqueKey(order);

          this.pubsubMessageCount++; // TODO increment after orderCache check
          //this.updateUI(); // to show the new market immediately
          // TODO filter dupliated offers and offers that are too old
          // TODO maybe reuse for digioptions-web
          /*
          if (key in market.orderCache){
            console.log('already chached');
            continue;
          }
          */
          //market.orderCache[key] = order;
          //TODO
          //(this.markets[sortedMarketKeys[idx]].market.isTerminated())){

        }
      }
      this.updateUI();
    }.bind(this);

    pubsub.feedback = function(msg, col, connection_ok){
      this.pubsubFeedbackMsg = msg;
      this.pubsub_feedback_col = col;
      this.pubsub_feedback_connection_ok = connection_ok;
      this.updateUI();
    }.bind(this);
    //pubsub.disconnect = function(){
    //  this.pubsub = undefined;
    //}.bind(this);

    pubsub.connect();
    return pubsub;
  };

  Monitor.prototype.checkExpired = function() {
    //console.log('checkExpired');
    var that = this;

    var sortedMarketKeys = this.getSortedMarketKeys(this.markets);
    sortedMarketKeys.forEach(function (marketFactHash){
      var market = that.markets[marketFactHash];
      // TODO rename marketDetails
      if (! market.isExpired()) {
        var contract = new that.web3.eth.Contract(digioptionsContracts.digioptionsMarketsAbi, market.getContractAddr());
        contract.methods.getMarketData(marketFactHash).call() // TODO what if web3 had reconnected?
          .then(function(result) {
            var expired = result.data.settled;
            if (expired && (! market.isExpired())){
              // expire
              market.expire();
            }
          });
      }
    });
  };

  Monitor.prototype.updateBlockNumbers = function(blockHeader) {
    var that = this;
    // TODO remove
    if (!this.blockHeader)
      this.startSearchMarkets();

    else if (this.blockHeader.number !== blockHeader.number){
      // blockNumer has changed
      var sortedMarketKeys = this.getSortedMarketKeys(this.markets);
      sortedMarketKeys.forEach(function (marketFactHash){
        var market = that.markets[marketFactHash];
        if (! market.isTerminated())
          market.updateBlock(blockHeader);
      });
    }
    that.blockHeader = blockHeader;
    //console.log('blockNumber network', network, blockNumber);
    //that.pubsub = that.setupPubsub();
  };

  Monitor.prototype.startSearchMarkets = function(){
    this.searchMarkets();
    setInterval(
      function(){
        this.deleteOldTerminatedMarkets();
        this.searchMarkets();
        this.checkExpired();
      }.bind(this),
      5 * 60 * 1000 /* every 5 minutes */
    );
  };

  Monitor.prototype.start = function() {
    var that = this;
    var conn = function(callbackConnect, callbackDisconnect){
      //var reconnectTimer = null;
      var reconnectInterval = 3000;
      var web3 = new Web3(); // one web3 object where just the provider ist updated on reconnect
      var connect = function(){
        console.log('connect web3 provider');
        var provider = digioptionsTools.dataNetworksUtils.getProvider(Web3, that.network);
        web3.setProvider(provider);
        provider.on('error', function(e){console.log('WS Error', e);});
        provider.on('connect', function () {
          console.log('web3 provider (re-)connected');
          callbackConnect(web3);
        });
        provider.on('end', function(/* e */){
          callbackDisconnect();
          console.log('WS closed');
          console.log('Attempting to reconnect in some seconds...');
          /* reconnectTimer = */
          setTimeout(function(){
            connect();

          }, reconnectInterval);

          web3.setProvider(provider);
        });
      };
      connect();
    };

    var callbackConnect = function(w3){
      that.web3 = w3;

      // add accounts
      config.accounts[that.network].forEach(function (account){
        that.web3.eth.accounts.wallet.add(account);
      });

      this.pubsub = this.setupPubsub();

      that.web3.eth.getBlock('latest', function (e, blockHeader){
        that.updateBlockNumbers(blockHeader);
      });

      // we want get get triggered if a new block was mined
      that.web3.eth.subscribe('newBlockHeaders')
        .on('data', function(blockHeader){
          // will return the block number.
          //console.log(blockHeader.number);
          //console.log(blockHeader.timestamp); // TODO use timestamp
          that.updateBlockNumbers(blockHeader);
        });

      setInterval(
        function(){
          // this refreshes the 'uptime' field to show that everything is running
          that.updateUI();
        }.bind(this),
        10000
      );
    };
    var callbackDisconnect = function(){
      that.web3 = null;
      console.log('callbackDisconnect');
    };

    conn(callbackConnect.bind(this), callbackDisconnect.bind(this));
  };

  function networkConfigured(network){
    network = network || config.networks[0];
    if (config.networks.indexOf(network) !== -1)
      return network;
    return undefined;
  }

  function Core(contentUpdated){
    this.contentUpdated = contentUpdated;
    this.monitors = {}; // one monitor instance for each network
    this.quoteProvider = new QuoteProvider(this.realtimeCallback.bind(this), null);
  }

  Core.prototype.realtimeCallback = function(symbol, quote){
    var that = this;
    config.networks.forEach(function (network){
      var monitor = that.monitors[network];

      for (var marketFactHash in monitor.markets){
        var market = monitor.markets[marketFactHash];
        if (
          (! market.isTerminated()) &&
          (market.getUnderlyingString() === symbol)
        ){
          market.trader.updateQuote(quote);
        }
      }
    });
  };

  Core.prototype.start = function(){
    var that = this;

    // start a network monitor for each network in config
    config.networks.forEach(function (network){
      that.monitors[network] = new Monitor(function(){that.contentUpdated(network);}, network, that.quoteProvider);
      that.monitors[network].start();
      that.contentUpdated(network);// trigger first update
    });
  };

  Core.prototype.getMonitor = function(network){
    return this.monitors[network];
  };

  return {
    'Core': Core,
    'Monitor': Monitor,
    'networkConfigured': networkConfigured
  };
});

