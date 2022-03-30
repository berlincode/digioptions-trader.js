// vim: sts=2:ts=2:sw=2
(function (global, factory) {
  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( function () { return factory().providerRetryWrapper; } );

  } else if ( typeof module != 'undefined' && module.exports ) {
    // Node and other environments that support module.exports
    module.exports = factory().providerRetryWrapper;

  } else {
    // Browser
    global.providerRetryWrapper = factory().providerRetryWrapper;
  }
})(this, function(){

  function providerRetryWrapper(provider, url, options) {
    options = options || {};
    var retryWrapperRetries = options.retries || 5;

    var retryWrapperQueue = [];
    var retryWrapperTimeout = null;

    var sendOrig = provider.send.bind(provider);

    function add (payload, callback, retries) {
      retryWrapperQueue.push([payload, callback, retries]); // append new request
    }

    function unshift (payload, callback, retries) {
      retryWrapperQueue.unshift([payload, callback, retries]); // prepend request
    }

    provider._timeout = (function () {
      retryWrapperTimeout = null;
      this._run();
    }).bind(provider);

    provider._run = (function () {
      var self = this;

      if ((retryWrapperQueue.length === 0) || (retryWrapperTimeout !== null))
        return;

      var job = retryWrapperQueue.shift(); // get first 
      var payload = job[0];
      var callback = job[1];
      var retries = job[2];

      var callback_new = function(error, result){
        //if (result.error){
        //  console.log(result);
        //}

        if (result && (result.error) && (result.error.code === 429) && (retries > 0)){
          // error: { code: 429, message: 'Too many requests, LC' }

          // requeue at first position
          unshift(payload, callback, --retries);

          if (retryWrapperTimeout === null){
            // create a new timeout
            setTimeout(
              self._timeout.bind(self),
              600
            );
          }
          return;
        }
        callback(error, result);
      };
      sendOrig(payload, callback_new);
    }).bind(provider);

    provider.send = (function (payload, callback) {
      add(payload, callback, retryWrapperRetries);
      this._run();
    }).bind(provider);

    return provider;
  }

  return {
    providerRetryWrapper: providerRetryWrapper,
  };
});


