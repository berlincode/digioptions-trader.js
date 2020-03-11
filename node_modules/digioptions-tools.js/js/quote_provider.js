// vim: sts=2:ts=2:sw=2
/* eslint-env es6 */

/*
    Copyright (c) digioptions.com (https://www.digioptions.com)
*/

/**
 * A helper ...
 */
// TODO add limit > 100 to display 24h at 5m interval
// TODO add bitfinex key


(function (root, factory) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define(
      [
        './xhr-request-promise'
      ], function (
        request
      ) {
        return factory(
          request
        );
      });

  } else if ( typeof module !== 'undefined' && module.exports ) {
    // Node and other environments that support module.exports
    module.exports = factory(
      require('xhr-request-promise')
    );
  } else {
    // Browser
    root.quote_provider = factory(
      this.XhrRequestPromise
    );
  }
})(this, function(request){

  var KeyTimestampMs = 'timestampMs';
  var KeyValue = 'value';

  var idxPrice = 6;

  var IdxHist = {
    mts: 0, //MTS / int / millisecond time stamp
    open: 1, //OPEN / float / First execution during the time frame
    close: 2, //CLOSE / float / Last execution during the time frame
    high: 3, //HIGH / float / Highest execution during the time frame
    low: 4, //LOW / float / Lowest execution during the timeframe
    volume: 5 //VOLUME / float / Quantity of symbol traded within the timeframe
  };

  function reverseMap(resource){
    var reverse = {};
    for(var propName in resource)
    {
      reverse[resource[propName]]=propName;
    }
    return reverse;
  }

  var symbolMapBitfinex = {
    'BTC\0USD': 'tBTCUSD',
    'ETH\0USD': 'tETHUSD',
    'XRP\0USD': 'tXRPUSD'
  };

  function BitfinexProvider(realtimeCallback){
    this.websocketUrl = 'wss://api.bitfinex.com/ws/2';
    //this.urlBase = 'https://api.bitfinex.com';
    this.urlBase = 'https://xmpp.digioptions.com:8086'; // temporary proxy to bitfinex
    this.urlPathLast = '/v2/candles/trade:{timeFrame}:{symbolEncoded}/last';
    this.urlPathHist = '/v2/candles/trade:{timeFrame}:{symbolEncoded}/hist?end={endUtcMilliSeconds}&start={startUtcMilliSeconds}&sort=1';
    this.timeFrame = '5m';
    this.reconnect = true;
    this.ws = null;
    this.info = {
      name: 'bitfinex',
      url: 'https://www.bitfinex.com/'
    };
    this.symbolMapReverse = reverseMap(symbolMapBitfinex);
    this.mapChanIdToSymbol = {};
    this.symbolsToSubscribe = {};
    this.realtimeCallback = realtimeCallback;
  }

  BitfinexProvider.prototype.sendSubscribe = function(symbol){
    this.ws.send(JSON.stringify({'event': 'subscribe', 'channel': 'ticker', 'symbol': symbol}));
  };

  BitfinexProvider.prototype.wsSetup = function(){
    var that = this;

    this.mapChanIdToSymbol = {}; // clear mapping before (re)connect

    this.ws = new WebSocket(this.websocketUrl);

    this.ws.onopen = function() {
      that.ws.send(JSON.stringify({'event': 'conf', flags: 32768})); // TODO 32768 TIMESTAMP as const
      for (var symbol in that.symbolsToSubscribe){
        that.sendSubscribe(symbol);
      }
    };

    this.ws.onmessage = function(msg) {
      var response = JSON.parse(msg.data);
      //console.log(response);
      if (response.event === 'subscribed'){
        that.mapChanIdToSymbol[response.chanId] = response.symbol;
        return;
      }
      if (Array.isArray(response) && (response.length >= 3)){
        // we are receiving objects (on subscribtion) and array for subscribed values
        // response[1] might be 'hb' for heartbeat
        //console.log(response);
        var chanId = response[0];
        var symbol = that.mapChanIdToSymbol[chanId];
        var underlyingStringDict = that.symbolsToSubscribe[symbol];
        if (Array.isArray(response[1]) && underlyingStringDict){
          var quote = {};
          quote[KeyTimestampMs] = response[2];
          quote[KeyValue] = response[1][idxPrice]; // TODO 6 use constants (ie 'MTS')

          var underlyingString;
          for (underlyingString of Object.keys(underlyingStringDict)){
            that.realtimeCallback(underlyingString, quote);
          }
        }
      }
    };

    this.ws.onclose = function(){
      if (that.reconnect){
        // try to reconnect in 5 seconds
        setTimeout(
          function(){
            if (that.reconnect)
              that.wsSetup();
          },
          5000
        );
      }
    };
  };

  BitfinexProvider.prototype.realtime = function(symbol, underlyingString) {
    var symbolNew;
    if (!this.symbolsToSubscribe[symbol]){
      symbolNew = true;
      this.symbolsToSubscribe[symbol] = {};
    } else {
      symbolNew = true;
    }

    this.symbolsToSubscribe[symbol][underlyingString] = true;

    if (!symbolNew)
      return;

    if (this.ws){
      //console.log('ret', symbol);

      if (this.ws.readyState === this.ws.OPEN){
        this.sendSubscribe(symbol);
        return;
      }
      //console.log('not yet open');
      return;
    }

    this.wsSetup();
  };

  BitfinexProvider.prototype.getLast = function(symbol) {
    var symbolEncoded = encodeURIComponent(symbol);
    var pathLast = this.urlPathLast
      .replace('{symbolEncoded}', symbolEncoded)
      .replace('{timeFrame}', this.timeFrame);
    var urlLast = this.urlBase + pathLast;
    return request(urlLast, {method: 'GET'})
      .then(function(response){
        var resp = JSON.parse(response);
        var quote = {};
        quote[KeyTimestampMs] = resp[0];
        //quote[KeyValue] = response[...]; // TODO

        return Promise.resolve(quote);
      })
      .catch(function(error){
        console.log('quote_provider getLast', error); // TODO handle
      });
  };

  BitfinexProvider.prototype.loadHistory = function(symbol, historyCallback, lastDtMilliseconds)
  {
    var symbolEncoded = encodeURIComponent(symbol);
    var that = this;
    this.getLast(symbol)
      .then(function(quote) {
        var lastDtMsBitfinex = quote[KeyTimestampMs];
        if (lastDtMsBitfinex > lastDtMilliseconds){
          // if last timestamp from bitfinex is newer than lastDtMilliseconds
          lastDtMsBitfinex = lastDtMilliseconds;
        }
        var pathHist = that.urlPathHist
          .replace('{symbolEncoded}', symbolEncoded)
          .replace('{timeFrame}', that.timeFrame)
          .replace('{startUtcMilliSeconds}', lastDtMsBitfinex - 1000*3600*8) // we should not exceed 100 data points in total
          .replace('{endUtcMilliSeconds}', lastDtMsBitfinex);
        var urlHist = that.urlBase + pathHist;
        return request(urlHist, {method: 'GET'});
      })
      .then(function(response) {
        // response might be something like (at least with the proxy)
        //{"code": 503, "error": "temporarily_unavailable", "error_description": "Sorry, the service is temporarily unavailable. See https://www.bitfinex.com/ for more info."}
        var resp = JSON.parse(response);
        if (Array.isArray(resp)){
          // ok
          historyCallback(null /* err */, resp);
        } else {
          // error
          historyCallback(resp, null);
        }
      })
      .catch(function(error){
        //historyCallback(resp);
        console.log('quote_provider loadHistory', error); // TODO handle
      });
  };

  BitfinexProvider.prototype.close = function()
  {
    if (this.ws) {
      this.reconnect = false;
      this.ws.close();
      this.ws = null;
    }
  };

  function bitfinexInstantiate(realtimeCallback){
    return new BitfinexProvider(realtimeCallback);
  }

  var symbolFuncToProviderInstantiate = [
    function(underlyingParts, underlyingString){
      var symbol = symbolMapBitfinex[underlyingParts.name + '\0' + underlyingParts.unit];
      if (! symbol)
        return null;

      return {
        name: 'bitfinex',
        instantiateFunc: bitfinexInstantiate,
        symbol: symbol,
        underlyingString: underlyingString
      };
    }
  ];

  function QuoteProvider(realtimeCallback, historyCallback){
    'use strict';

    this.providers = {};
    this.realtimeCallback = realtimeCallback;
    this.historyCallback = historyCallback;
  }

  QuoteProvider.prototype.getProviderInstance = function(providerInfo){
    if (! this.providers[providerInfo.name]){
      // new provider
      this.providers[providerInfo.name] = providerInfo.instantiateFunc(this.realtimeCallback);
    }
    return this.providers[providerInfo.name];
  };

  QuoteProvider.prototype.setup = function(providerInfo){
    var provider = this.getProviderInstance(providerInfo);

    if (provider){
      provider.realtime(providerInfo.symbol, providerInfo.underlyingString);
    }
  };

  QuoteProvider.prototype.loadHistory = function(providerInfo, lastDtMilliseconds){
    var provider = this.getProviderInstance(providerInfo);

    if (provider){
      provider.loadHistory(providerInfo.symbol, this.history.bind(this), lastDtMilliseconds);
    }
  };

  QuoteProvider.prototype.realtime = function(symbol, resp)
  {
    if (this.realtimeCallback)
      this.realtimeCallback(symbol, resp);
  };

  QuoteProvider.prototype.history = function(err, resp)
  {
    if (this.historyCallback)
      this.historyCallback(err, resp);
  };

  QuoteProvider.prototype.close = function()
  {
    // allow already running historyCallback
    //this.historyCallback = null;

    // no more push data callbacks
    this.realtimeCallback = null;

    for (var key in this.providers) {
      if (this.providers.hasOwnProperty(key)) {
        this.providers[key].close();
        //console.log('closing', key);
      }
    }

  };

  function getProviderDataFromUnderlyingParts(underlyingParts, underlyingString){
    var i;
    for (i=0 ; i < symbolFuncToProviderInstantiate.length ; i ++){
      var providerData = symbolFuncToProviderInstantiate[i]( // TODO rename underlyingPartsFuncToProviderInstantiate
        underlyingParts,
        underlyingString
      );
      if (providerData){
        return providerData;
      }
    }
    return null;
  }

  return {
    'QuoteProvider': QuoteProvider,
    'getProviderDataFromUnderlyingParts': getProviderDataFromUnderlyingParts,
    'BitfinexProvider': BitfinexProvider,
    'KeyTimestampMs': KeyTimestampMs,
    'KeyValue': KeyValue,
    'IdxHist': IdxHist,
    'symbolFuncToProviderInstantiate': symbolFuncToProviderInstantiate
  };
});
