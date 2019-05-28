// vim: sts=2:ts=2:sw=2
(function (global, factory) {
  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( function () { return factory(); } );

  } else if ( typeof module != 'undefined' && module.exports ) {
    // Node and other environments that support module.exports
    module.exports = factory();

  } else {
    // Browser
    global.offer_normalize = factory();
  }
})(this, function(){

  function offerNormalize(offer){
  /*
  offer data example:
  {
      "offerOwner": "0x0000000000000000000000000000000000000000",
      "marketsAddr": "0x0000000000000000000000000000000000000000",
      "marketHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
      "optionID": 0,
      "price": 0,
      "size": 1000000000000000000,
      "offerID": 4321098765,
      "blockExpires": 1234567,
      "r": "0x1111111111111111111111111111111111111111111111111111111111111111",
      "s": "0x2222222222222222222222222222222222222222222222222222222222222222",
      "v": 27
  }
  */
    var idx, key, list, offerNormalized = {};
    //console.log("normalize", offer);
    list = ['offerOwner', 'marketsAddr'];
    for (idx=0 ; idx < list.length ; ++idx){
      key = list[idx];
      if ((typeof(offer[key]) != 'string') || (offer[key].length != 42) || (! offer[key].startsWith('0x')))
        return null;

      offerNormalized[key] = offer[key].toLowerCase();
    }
    list = ['r', 's', 'marketHash'];
    for (idx=0 ; idx < list.length ; ++idx){
      key = list[idx];
      if ((typeof(offer[key]) != 'string') || (offer[key].length != 66) || (! offer[key].startsWith('0x')))
        return null;

      offerNormalized[key] = offer[key].toLowerCase();
    }
    list = ['blockExpires', 'optionID', 'offerID', 'price', 'size', 'v'];
    for (idx=0 ; idx < list.length ; ++idx){
      key = list[idx];
      if (typeof(offer[key]) != 'number')
        return null;

      offerNormalized[key] = offer[key];
    }

    return offerNormalized;
  }

  return offerNormalize;
});
