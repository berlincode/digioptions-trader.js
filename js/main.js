// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        './config',
        'factsigner',
        'digioptions-contracts.js',
        'digioptions-tools.js',
        'web3',
        './market'
        //'./db'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./config.js'),
      require('factsigner'),
      require('digioptions-contracts.js'),
      require('digioptions-tools.js'),
      require('web3'),
      require('./market.js'),
      require('./db.js')
    );
  } else {
    // Global (browser)
    root.main = factory(
      root.config,
      root.factsigner,
      root.digioptionsContracts,
      root.digioptionsTools,
      root.Web3,
      root.market
      //root.db
    );
  }
})(this, function(config, factsigner, digioptionsContracts, digioptionsTools, Web3, market, db){
  var PubSub = digioptionsTools.PubSub;
  var QuoteProvider = digioptionsTools.quoteProvider.QuoteProvider;
  //var KeyTimestampMs = digioptionsTools.quoteProvider.KeyTimestampMs;

  var addrZero = '0x0000000000000000000000000000000000000000';
  var startTime = new Date();

  function Monitor(contentUpdated, network, quoteProvider, versionString){

    this.contentUpdated = contentUpdated;
    this.network = network;
    this.quoteProvider = quoteProvider;
    this.versionString = versionString;
    this.web3 = null;
    this.errors = [];

    var web3 = new Web3();

    this.dataNetwork = digioptionsTools.dataNetworks[network];
    this.accounts = (config.privateKeys[this.network] || []).map(function (account){
      return web3.eth.accounts.privateKeyToAccount(account);
    });

    this.pubsubMessageCount = 0;
    this.pubsubFeedbackMsg = '???';
    this.pubsub_feedback_col = '#000000';
    this.pubsub_feedback_connection_ok = false;
    this.startTime = new Date();
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
    var self = this;

    var sortedMarketKeys = this.getSortedMarketKeys(this.markets);

    var marketProps = {};
    sortedMarketKeys.forEach(function (marketHash){
      marketProps[marketHash] = self.markets[marketHash].stateToProps();
    });

    return {
      errors: this.errors,
      network: this.network,
      sortedMarketKeys: this.getSortedMarketKeys(this.markets),
      web3Connected: Boolean(this.web3),
      pubsubFeedbackMsg: this.pubsubFeedbackMsg,
      pubsubMessageCount: this.pubsubMessageCount,
      accounts: this.accounts.map(function (account){
        // only send addresses (and not privateKeys) to UI!
        return {address: account.address};
      }),
      contractAddresses: config.contractAddresses[this.network],
      blockHeader: this.blockHeader && {
        // send only selected properties of blockHeader
        timestamp: this.blockHeader.timestamp,
        number: this.blockHeader.number
      },
      marketProps: marketProps,
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

  Monitor.prototype.setupMarket = function(contractDescription, marketHash){
    var self = this;

    var contract = contractDescription.contractMarkets;

    var key = marketHash.toLowerCase();

    contract.methods.getMarketDataByMarketHash(addrZero, marketHash).call()
      .then(function(result) {

        if (self.markets[key]){
          // market already exists
          //console.log('skip market');
          return null;
        }

        var data = {
          winningOptionID: Number(result.marketState.winningOptionID),
          settled: Boolean(result.marketState.settled),
          testMarket: Boolean(result.testMarket)
        };
        var expired = result.marketState.settled; // TODO duplicate (already in data.settled) TODO rename

        var marketBaseData = {
          baseUnitExp: Number(result.marketBaseData.baseUnitExp),
          expiration: Number(result.marketBaseData.expirationDatetime),
          underlyingString: result.marketBaseData.underlyingString,
          underlyingParts: factsigner.underlyingStringToUnderlyingParts(result.marketBaseData.underlyingString),
          transactionFee0StringPercent: factsigner.toUnitStringExact(self.web3.utils.toBN(result.marketBaseData.transactionFee0), 4-2),
          transactionFee1StringPercent: factsigner.toUnitStringExact(self.web3.utils.toBN(result.marketBaseData.transactionFee1), 4-2),
          transactionFeeSignerStringPercent: factsigner.toUnitStringExact(self.web3.utils.toBN(result.marketBaseData.transactionFeeSigner), 4-2),
          ndigit: Number(result.marketBaseData.ndigit),
          signerAddr: result.marketBaseData.signerAddr,
          // TODO parseFloat
          strikesFloat: result.marketBaseData.strikes.map(function(x){return parseFloat(factsigner.toUnitString(self.web3.utils.toBN(x), Number(result.marketBaseData.baseUnitExp), Number(result.marketBaseData.ndigit)));}),
          strikesStrings: result.marketBaseData.strikes.map(function(x){return factsigner.toUnitString(self.web3.utils.toBN(x), Number(result.marketBaseData.baseUnitExp), Number(result.marketBaseData.ndigit));}),
          marketInterval: Number(result.marketBaseData.marketInterval)
        };

        // constant market definition
        var marketDefinition = {
          network: self.network,
          chainID: self.dataNetwork.chainID,
          marketHash: marketHash,
          marketBaseData: marketBaseData
        };

        var contractDescriptionReduced = {
          // keep only JSON serializable parts that are from marketsContract

          atomicOptionPayoutWeiExpBN: contractDescription.atomicOptionPayoutWeiExpBN,
          atomicOptionPayoutWeiBN: contractDescription.atomicOptionPayoutWeiBN,
          atomicOptionsPerFullOptionBN: contractDescription.atomicOptionsPerFullOptionBN,
          blockCreatedMarkets: contractDescription.blockCreatedMarkets,
          marketsAddr: contractDescription.marketsAddr,
          offerMaxBlocksIntoFuture: contractDescription.offerMaxBlocksIntoFuture,
          timestampCreatedMarkets: contractDescription.timestampCreatedMarkets,
          versionMarkets: contractDescription.versionMarkets
        };

        //console.log('new market (real trigger)', key);
        var marketNew = new market.Market(
          self.updateUI.bind(self),
          self.web3.eth.accounts.wallet[0], // default is to take the first account
          marketDefinition,
          contractDescriptionReduced,
          data,
          expired,
          self.blockHeader,
          function(data_array) { // offersPublish
            if (config.offersPublish && self.pubsub && self.pubsub_feedback_connection_ok){ // TODO
              self.pubsub.publish(data_array, contractDescription.marketsAddr, marketHash);
            }
          },
          self.quoteProvider,
          self.versionString
        );

        self.markets[key] = marketNew;

        marketNew.web3Connected(self.web3);

        marketNew.setup()
          .then(function(){
            self.updateUI(); // to show the new market immediately

            if (! self.markets[key].isTerminated()){
              self.pubsub.subscribe(contractDescription.marketsAddr, marketHash);
            }
          });
      })
      .catch(function(error){
        console.log('promise catch market new / setup', error);
      });

  };

  Monitor.prototype.searchMarkets = function(){
    var self = this;

    config.contractAddresses[self.network].forEach(function (contractAddr){
      var marketSearch;
      var contractDescription;
      //var contractMarketListerDetails = null;

      digioptionsContracts.getContractInfo(self.web3, contractAddr)
        .then(function(contractInfo) {
          contractDescription = contractInfo;

          marketSearch = digioptionsContracts.marketSearchSetup(
            contractDescription,
            self.blockHeader.timestamp,
            self.blockHeader.number,
            //options
            {
              // TODO limit to open markets
              filterMarketIntervals: [ // TODO
                factsigner.constants.marketInterval.DAILY,
                factsigner.constants.marketInterval.WEEKLY,
                factsigner.constants.marketInterval.MONTHLY,
                //factsigner.constants.marketInterval.YEARLY
              ],
              limitPerFetch: 8,
            }
          );

          return digioptionsContracts.getMarketCreateEvents(marketSearch);
        })
        .then(function(result) {
          var events = result[0];
          //var marketSearchNew = result[1];
          //console.log('events', events);
          var marketKeys = events.map(function(evt){return evt.returnValues.marketKey;});
          //console.log('marketKeys', contractAddr, marketKeys);
          var contract = marketSearch.contract;
          return contract.methods.getMarketDataListByMarketKeys(addrZero, marketKeys)
            .call({});
        })
        .then(function(marketDataList) {
          //console.log('MarketList', contractAddr, marketDataList);
          for (var i=0 ; i < marketDataList.length ; i++){
            var marketHash = marketDataList[i].marketHash;
            var key = marketHash.toLowerCase();
            if (! self.markets[key]){
              //console.log('new market', contractAddr, contractDescription.marketsAddr, marketHash);
              self.setupMarket(contractDescription, marketHash);
            }
          }
        })
        .catch(function(error){
          console.log('promise catch searchMarkets()', error);
        });
    });
  };

  Monitor.prototype.setupPubsub = function(){
    var pubsub = new PubSub(this.network);
    //pubsub.debug = true;

    pubsub.on_data = function(data){
      var i;
      var offersValid = [];
      for (i=0 ; i < data.length ; i++){
        var offer = data[i];
        offer = digioptionsTools.offerNormalize(offer);
        if (offer) {
          var key0 = offer.marketHash.toLowerCase(); // TODO rename key
          var market = this.markets[key0];
          if (! market){
            // TODO log info
            //console.log('no such market', offer.contractAddr);
            continue;
          }

          offersValid.push(offer);
          //var key = digioptionsTools.orderUniqueKey(offer);

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
          //market.orderCache[key] = offer;
          //TODO
          //(this.markets[sortedMarketKeys[idx]].market.isTerminated())){

        }
      }
      market.receivedOrders(offersValid);
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
    var self = this;

    var sortedMarketKeys = this.getSortedMarketKeys(this.markets);
    sortedMarketKeys.forEach(function (marketHash){
      var market = self.markets[marketHash];
      // TODO rename marketDetails
      if (! market.isExpired()) {
        var contract = new self.web3.eth.Contract(digioptionsContracts.digioptionsMarketsAbi(), market.getMarketsAddr());
        contract.methods.getMarketDataByMarketHash(addrZero, marketHash).call() // TODO what if web3 had reconnected?
          .then(function(result) {
            var expired = result.marketState.settled;
            if (expired && (! market.isExpired())){
              // expire
              market.expire();
            }
          });
      }
    });
  };

  Monitor.prototype.updateBlockNumbers = function(blockHeader) {
    var self = this;
    // TODO remove
    if (!self.blockHeader){
      self.startSearchMarkets();
      self.searchMarkets();
    }

    else if (this.blockHeader.number !== blockHeader.number){
      // blockNumer has changed
      var sortedMarketKeys = this.getSortedMarketKeys(this.markets);
      sortedMarketKeys.forEach(function (marketHash){
        var market = self.markets[marketHash];
        if (! market.isTerminated())
          market.updateBlock(blockHeader);
      });
    }
    self.blockHeader = blockHeader;
    //console.log('blockNumber network', self.network, self.blockHeader);
    //self.pubsub = self.setupPubsub();
  };

  Monitor.prototype.startSearchMarkets = function(){
    var self = this;
    setInterval(
      function(){
        self.deleteOldTerminatedMarkets();
        self.searchMarkets();
        self.checkExpired();
      },
      5 * 60 * 1000 /* every 5 minutes */
    );
  };

  Monitor.prototype.start = function() {
    var self = this;

    var provider;
    try {
      provider = digioptionsTools.dataNetworksUtils.getProvider(self.network, config.providerArgs);
    } catch(err) {
      this.errors.push('please setup "providerArgs.infuraApiKey" in config.js');
      return;
    }

    function conn(callbackConnect, callbackDisconnect){
      var reconnectTimer = null;

      function disconnect(){
        if (!reconnectTimer){
          callbackDisconnect();
          console.log('Attempting to reconnect in some seconds to network ' + self.network);
          reconnectTimer = setTimeout(function(){
            reconnectTimer = null;
            connect();
          }, config.gethReconnectInterval);
        }
      }
      function connect(){
        var web3 = new Web3(provider); // one web3 object where just the provider ist updated on reconnect
        web3.currentProvider.on('ready;', function () {
          console.log('ready', self.network);
        });
        web3.currentProvider.on('close', function () {
          console.log('closing network', self.network, 'web3.connected:', web3.connected);
          disconnect();
        });
        web3.currentProvider.on('connect', function () {
          console.log('web3 provider (re-)connected', self.network);
          callbackConnect(web3);
        });
        web3.currentProvider.on('error', function(/* e */){
          console.log('WS Error', self.network/*, e*/);
          disconnect();
        });
        web3.currentProvider.on('end', function(/* e */){
          console.log('WS end', self.network);
          disconnect();
        });
      }
      connect();
    }

    function callbackConnect(w3){
      self.web3 = w3;

      // add accounts
      self.accounts.forEach(function (account){
        self.web3.eth.accounts.wallet.add(account);
      });

      this.pubsub = this.setupPubsub();

      self.web3.eth.getBlock('latest')
        .then(function(blockHeader){
          self.updateBlockNumbers(blockHeader);
        })
        .catch(function(error){
          console.log('error web3.eth.getBlock()', error);
        });

      // we want get get triggered if a new block was mined
      self.web3.eth.subscribe('newBlockHeaders')
        .on('data', function(blockHeader){
          // will return the block number.
          //console.log(blockHeader.number);
          //console.log(blockHeader.timestamp); // TODO use timestamp
          self.updateBlockNumbers(blockHeader);
        });

      for (var marketHash in self.markets){
        self.markets[marketHash].web3Connected(self.web3);
      }
    }

    function callbackDisconnect(){
      self.web3 = null;
      for (var marketHash in self.markets){
        self.markets[marketHash].web3Disconnected();
      }
    }

    conn(callbackConnect.bind(this), callbackDisconnect.bind(this));

    setInterval(
      function(){
        // this refreshes the 'uptime' field to show that everything is running
        self.updateUI();
      }.bind(this),
      10000
    );
  };

  function networkConfigured(network){
    network = network || config.networks[0];
    if (config.networks.indexOf(network) !== -1)
      return network;
    return undefined;
  }

  function Core(contentUpdated, versionString){
    this.contentUpdated = contentUpdated;
    this.versionString = versionString || 'unknonwn';
    this.monitors = {}; // one monitor instance for each network
    this.quoteProvider = new QuoteProvider(this.realtimeCallback.bind(this), null);
  }

  Core.prototype.realtimeCallback = function(underlyingString, quote){
    var self = this;
    config.networks.forEach(function (network){
      var monitor = self.monitors[network];

      for (var marketHash in monitor.markets){
        var market = monitor.markets[marketHash];
        if (
          (! market.isTerminated()) &&
          (market.getUnderlyingString() === underlyingString)
        ){
          market.trader.updateQuote(quote);
        }
      }
    });
  };

  Core.prototype.start = function(){
    var self = this;

    // start a network monitor for each network in config
    config.networks.forEach(function (network){
      self.monitors[network] = new Monitor(
        function(){self.contentUpdated(network);},
        network,
        self.quoteProvider,
        self.versionString
      );
      self.monitors[network].start();
      self.contentUpdated(network);// trigger first update
    });
  };

  Core.prototype.getMonitor = function(network){
    return this.monitors[network];
  };

  Core.prototype.stateToProps = function(){
    var self = this;
    var data = {
      uptime: Math.floor((new Date() - startTime) / 1000),
      dbIsRunning: db && db.isRunning(),
      networks: {}
    };
    Object.keys(this.monitors).forEach(function(network) {
      data.networks[network] = self.monitors[network].stateToProps();
    });

    return data;
  };

  return {
    'Core': Core,
    'Monitor': Monitor,
    'networkConfigured': networkConfigured
  };
});

