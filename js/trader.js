// vim: sts=2:ts=2:sw=2

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'digioptions-tools.js',
        './db',
        './gaussian'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('digioptions-tools.js'),
      require('./db.js'),
      require('./gaussian.js')
    );
  } else {
    // Global (browser)
    root.trader = factory(
      root.digioptionsTools,
      root.db,
      root.gaussian
    );
  }
})(this, function(digioptionsTools, db, gaussian){

  var quoteProvider = digioptionsTools.quoteProvider;

  var calcOptionIDToProbability = function(volatility, secondsUntilExpiration, currentSpotPrice, strikes){
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
  };

  var underlyingToVolatility = {
    // volatility per year - Please adjust!
    'ETH/USDT': 0.31,
    'BTC/USDT': 0.31,
    'XRP/USDT': 0.31
  };

  var Trader = function(
    marketDefinition
  ){
    //var self = this;
    this.marketDefinition = marketDefinition;

    //console.log(underlyingString, strikes);
    this.volatility = underlyingToVolatility[this.marketDefinition.marketBaseData.underlyingString]; // per year

    if (! this.volatility)
      throw 'unknown volatility for ' + this.marketDefinition.marketBaseData.underlyingString;

    this.offerID = 0; //utility.getRandomInt(0,Math.pow(2,32));  //  TODO
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

    return db.dbTables['market'].insertOrIgnore('main', {marketDefinition: self.marketDefinition})
      .then(function(){
        // TODO move
        var filename = db.basedirGet() + '/' + self.marketDefinition.marketBaseData.expiration + '-' + self.marketDefinition.network + '-' + self.marketDefinition.marketsAddr + '-' + self.marketDefinition.marketHash + '-' + self.marketDefinition.marketBaseData.underlying + '-' + self.marketDefinition.marketBaseData.typeDuration + '-trader.db';
        console.log('filename:', filename);

        return db.run('attach database "' + filename + '" as ' + dbname + ';'); // TODO escape?
      })
      .then(function(){
        return db.setupSchema(dbname); // TODO
      })
      .then(function(){
        return db.dbTables['market'].insertOrIgnore(dbname, {marketDefinition: self.marketDefinition});
      })
      .then(function(){
        return db.get(
          'SELECT marketID from ' + db.quote(dbname, 'market') + ' WHERE "marketDefinition_network"=(?) and "marketDefinition_marketsAddr"=(?) and "marketDefinition_marketHash"=(?);',
          [
            self.marketDefinition.network,
            self.marketDefinition.marketsAddr,
            self.marketDefinition.marketHash
          ]
        );
      })
      .then(function(result){
        //console.log('marketID', result);
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

  Trader.prototype.exec = function(/*blockHeader*/){
    // TODO callback if finished
    //var self = this;

    var infoStrings = [];
    var errorStrings = [];

    if (
      (! this.quote) ||
      (this.quote[quoteProvider.KeyTimestampMs] + 100000 < (new Date()).getTime())
    ){
      infoStrings.push('no (or no recent) quote');
      this.infoStrings = infoStrings;
      return {
        orders: []
      };
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

    this.data = {
      dateMs: (new Date()).getTime(),
      volatility: this.volatility,
    };

    this.infoStrings = infoStrings;
    this.errorStrings = errorStrings;

    if ((! db.isRunning()) || (! this.dbname))
      return;

    db.dbTables['trader'].insertOrIgnore(
      this.dbname,
      {
        marketID: this.marketID, // database unique index
        // log everything that is required to render TraderView()
        traderProps: this.stateToProps()
      }
    ).catch(function(/*err*/){
      // ignore
    });
  };

  return {
    Trader: Trader,
    // export for testing purposes
    underlyingToVolatility: underlyingToVolatility,
    calcOptionIDToProbability: calcOptionIDToProbability
  };
});

