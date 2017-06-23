// vim: sts=2:ts=2:sw=2
(function (global, factory) {
  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( function () { return factory().normalize_order; } );

  } else if ( typeof module != 'undefined' && module.exports ) {
    // Node and other environments that support module.exports
    module.exports = factory().normalize_order;

  } else {
    // Browser
    global.normalize_order = factory().normalize_order;
  }
})(this, function(){

  function normalize_order(order){
  /*
  order data example:
  {
      "addr": "0x0000000000000000000000000000000000000000",
      "blockExpires": 1234567,
      "contractAddr": "0x0000000000000000000000000000000000000000",
      "hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "optionID": 0,
      "orderID": 4321098765,
      "price": 0,
      "r": "0x1111111111111111111111111111111111111111111111111111111111111111",
      "s": "0x2222222222222222222222222222222222222222222222222222222222222222",
      "size": 1000000000000000000,
      "v": 27
  }
  */
    var idx, key, list;
    //console.log("normalize", order);
    list = ['addr', 'contractAddr'];
    for (idx=0 ; idx < list.length ; ++idx){
      key = list[idx];
      if ((typeof(order[key]) != 'string') || (order[key].length != 42) || (! order[key].startsWith('0x')))
        return null;
      
      order[key] = order[key].toLowerCase();
    }
    list = ['hash', 'r', 's'];
    for (idx=0 ; idx < list.length ; ++idx){
      key = list[idx];
      if ((typeof(order[key]) != 'string') || (order[key].length != 66) || (! order[key].startsWith('0x')))
        return null;

      order[key] = order[key].toLowerCase();
    }
    list = ['blockExpires', 'optionID', 'orderID', 'price', 'size', 'v'];
    for (idx=0 ; idx < list.length ; ++idx){
      key = list[idx];
      if (typeof(order[key]) != 'number')
        return null;
    }
    if (Object.keys(order).length != 11)
      return null;

    // now return a unique key
    return JSON.stringify([
      order.addr,
      order.blockExpires,
      order.contractAddr,
      order.hash,
      order.optionID,
      order.orderID,
      order.price,
      order.r,
      order.s,
      order.size,
      order.v
    ]);
  }
      
  return {'normalize_order': normalize_order};
});
