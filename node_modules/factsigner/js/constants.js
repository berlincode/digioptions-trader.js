// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
    ], factory);
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
    );
  }else {
    // Global (browser)
    root.factsignerConstants = factory(
    );
  }
}(this, function () {

  function reverseDict(json){
    var ret = {};
    for(var key in json){
      ret[json[key]] = key;
    }
    return ret;
  }

  var marketInterval = {
    NONE: 0,
    // the following constants are just proposed assignments
    YEARLY: 1,
    QUATERLY: 2,
    MONTHLY: 3,
    WEEKLY: 4,
    DAILY: 5,
    HOURLY: 6,
    SHORT_TERM: 7
  };

  var marketCategory = {
    CRYPTO: 0,
    FINANCE: 1,
    SPORTS: 2,
    POLITICS: 3,
    SOCIETY: 4,
    WEATHER: 5,
    OTHER: 6
    // TODO build groups
    //Financials: Stocks, (non-listed) Companies, Forex, Cryptocurrencies, Credit Defaults
    //Politics
    //Society
    //Sports: Football, Rugby, Horse Racing, Tennis, Golf
    //Weather
  };

  return {

    configMarketTypeIsStrikedMask: 1,
    configMarketType: {
      /* market striked or named */
      NAMED: 0,
      STRIKED: 1
    },

    configIntervalTypeIsUsedMask: 4,
    configIntervalType: {
      /* market striked or named */
      UNUSED: 0,
      USED: 4
    },

    settlementType: {
      FINAL: 0,
      PRELIMINARY_FIRST: 1,
      PRELIMINARY_MAX: 65535
    },

    UNDERLYING_MAX_BYTES: 32,
    NAMED_RANGE_MAX_BYTES: 16,

    // defaults / expected values for named markets
    BASE_UNIT_EXP_DEFAULT: 18,
    NDIGIT_DEFAULT: 0,

    marketInterval: marketInterval,
    marketIntervalById: reverseDict(marketInterval),

    marketCategory: marketCategory,
    marketCategoryById: reverseDict(marketCategory)
  };
}));
