// vim: sts=2:ts=2:sw=2

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'web3',
        'digioptions-tools.js',
        './db',
        './gaussian',
        './config'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3'),
      require('digioptions-tools.js'),
      require('./db.js'),
      require('./gaussian.js'),
      require('./config.js')
    );
  } else {
    // Global (browser)
    root.trader = factory(
      root.web3,
      root.digioptionsTools,
      root.db,
      root.gaussian,
      root.config,
      root.gaussian
    );
  }
})(this, function(Web3, digioptionsTools, db, gaussian, config){

  var web3 = new Web3();
  var quoteProvider = digioptionsTools.quoteProvider;

  function calcOptionIDToProbability(volatility, secondsUntilExpiration, currentSpotPrice, strikes){
    var secondsPerYear = 60*60*24 * 365;

    var stdDeviation = volatility * Math.sqrt(secondsUntilExpiration/secondsPerYear);
    var variance = stdDeviation * stdDeviation;

    var mean = 0.0;
    var distribution = gaussian(mean, variance);

    var probability_comulated_last = 0.0;
    var optionIDToProbability=[];
    for (var optionID=0; optionID < strikes.length ; optionID ++){
      var probability_comulated = distribution.cdf(Math.log(strikes[optionID]/currentSpotPrice));
      var probability_range = probability_comulated - probability_comulated_last;
      probability_comulated_last = probability_comulated;
      optionIDToProbability[optionID] = probability_range;
    }
    // add the last optionID (we always have one more optionIDs that strikes)
    optionIDToProbability.push(1-probability_comulated_last);

    return optionIDToProbability;
  }

  var underlyingCoreData = {
    // volatility per year - Please adjust!
    'ETH\0USD': 0.31,
    'BTC\0USD': 0.31,
    'XRP\0USD': 0.31
  };

  var Trader = function(
    marketDefinition,
    contractDescription
  ){
    this.marketDefinition = marketDefinition;
    this.contractDescription = contractDescription;

    this.volatility = underlyingCoreData[ // per year
      this.marketDefinition.marketBaseData.underlyingParts.name + '\0' +
      this.marketDefinition.marketBaseData.underlyingParts.unit
    ];

    if (! this.volatility)
      throw new Error('unknown volatility for "' + this.marketDefinition.marketBaseData.underlyingString + '"');

    this.offerID = 0; //utility.getRandomInt(0,Math.pow(2,32)); // TODO
    this.offerStoreTmp = []; // TODO remove
    this.quote = null;

    this.data = null;
    this.infoStrings = [];
    this.errorStrings = [];

    this.marketID = null; // database unique index
    this.dbname = null;
  };

  Trader.prototype.setup = function(){ // returns Promise
    var self = this;
    var dbname = db.uniqueNameGet();

    if (! db.isRunning())
      return Promise.resolve();

    return db.dbTables['market'].insertOrIgnore('main', {marketDefinition: self.marketDefinition, contractDescription: self.contractDescription})
      .then(function(){
        // TODO move/duplicate
        var underlyingStringHex = web3.utils.utf8ToHex(self.marketDefinition.marketBaseData.underlyingString);
        var filename = db.basedirGet() + '/' + self.marketDefinition.marketBaseData.expiration + '-' + self.marketDefinition.network + '-' + self.contractDescription.marketsAddr + '-' + self.marketDefinition.marketHash + '-' + underlyingStringHex + '-' + self.marketDefinition.marketBaseData.marketInterval + '-trader.db';

        return db.run('attach database "' + filename + '" as ' + dbname + ';'); // TODO escape?
      })
      .then(function(){
        return db.setupSchema(dbname); // TODO
      })
      .then(function(){
        return db.dbTables['market'].insertOrIgnore(dbname, {marketDefinition: self.marketDefinition, contractDescription: self.contractDescription});
      })
      .then(function(){
        return db.get(
          'SELECT marketID from ' + db.quote(dbname, 'market') + ' WHERE "marketDefinition_network"=(?) and "contractDescription_marketsAddr"=(?) and "marketDefinition_marketHash"=(?);',
          [
            self.marketDefinition.network,
            self.contractDescription.marketsAddr,
            self.marketDefinition.marketHash
          ]
        );
      })
      .then(function(result){
        // finally set self.dbname and self.marketID
        self.marketID = result.marketID;
        self.dbname = dbname;
      }).catch(function(err){
        console.log('db error (' + dbname + '):', err);
      });
  };

  Trader.prototype.stateToProps = function(){
    return {
      infoStrings: this.infoStrings,
      errorStrings: this.errorStrings,
      quote: this.quote,
      data: this.data
    };
  };

  Trader.prototype.updateQuote = function(quote){
    // this function is called if a new quote is available
    this.quote = quote;
  };

  Trader.prototype.exec = function(blockHeader, cash, liquidity/*, positions*/){
    var self = this;
    // TODO callback if finished
    //var self = this;

    var infoStrings = [];
    var errorStrings = [];

    // TODO additional check against real 'now' (e.g 'var epochMilliSeconds = new Date().getTime();')
    if (
      (! this.quote) ||
      //(config.maxQuoteAge && (this.quote[quoteProvider.KeyTimestampMs] + config.maxQuoteAge *1000 < (new Date()).getTime()))
      (config.maxQuoteAge && (this.quote[quoteProvider.KeyTimestampMs] + config.maxQuoteAge *1000 < blockHeader.timestamp*1000))
    ){
      infoStrings.push('no (or no recent) quote');
      this.infoStrings = infoStrings;
      return; // TODO no insert
    }
    var currentSpotPrice = this.quote[quoteProvider.KeyValue];
    var secondsUntilExpiration = this.marketDefinition.marketBaseData.expiration - this.quote[quoteProvider.KeyTimestampMs]/1000;

    if (secondsUntilExpiration < 60) {
      infoStrings.push('market is expiring');
      this.infoStrings = infoStrings;
      return; // TODO no insert
    }

    var optionIDToProbability = calcOptionIDToProbability(
      this.volatility,
      secondsUntilExpiration,
      currentSpotPrice,
      this.marketDefinition.marketBaseData.strikesFloat
    );

    /*
    var update = 4; // TODO
    var orders = [];
    var optionWin = 1000000000; // TODO global (and rename)

    var blockExpires = blockNumber + update;
    */

    var cashEth = parseInt(cash) / Math.pow(10, 18);
    var liquidityEth = parseInt(liquidity) / Math.pow(10, 18);

    this.data = {
      dateMs: (new Date()).getTime(),
      volatility: this.volatility,
      cashEth: cashEth,
      liquidityEth: liquidityEth
    };

    this.infoStrings = infoStrings;
    this.errorStrings = errorStrings;

    if ((! db.isRunning()) || (!self.dbname))
      return;

    db.dbTables['trader'].insertOrIgnore(
      this.dbname,
      {
        marketID: this.marketID, // database unique index
        // log everything that is required to render TraderView()
        traderProps: this.stateToProps()
      }
    ).catch(function(err){
      console.log('failed to write to db:' + err);
    });
  };

  return {
    Trader: Trader,
    // export for testing purposes
    underlyingCoreData: underlyingCoreData,
    calcOptionIDToProbability: calcOptionIDToProbability
  };
});

