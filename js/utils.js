// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([
      'web3',
      'js/buffer'
    ], function (
        Web3,
        Buffer
      ) {
      return factory(
        //root.Web3 /* TODO: quick hack for web3 before 1.0 - we use global Web3, because require('web3') returns BigNumber - see https://github.com/ethereum/web3.js/issues/280 */
        Web3,
        Buffer.Buffer,
        XMLHttpRequest
      ); } );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3'),
      Buffer,
      require('xhr2')
    );
  } else {
    // Global (browser)
    root.utils = factory(
      root.Web3,
      root.buffer.Buffer,
      XMLHttpRequest
    );
  }
})(this, function(Web3, Buffer/*, XMLHttpRequest */){

  var web3 = new Web3();
  var toBN = function(val){return new web3.utils.toBN(val);};
  var toHex = function(val){return web3.utils.toHex(val);};

  var orderToHash = function(order){
    return web3.utils.soliditySha3(
      {t: 'uint', v: toBN(order.optionID)},
      {t: 'uint', v: toBN(order.price)},
      {t: 'int', v: toBN(order.size)},
      {t: 'uint', v: toBN(order.orderID)},
      {t: 'uint', v: toBN(order.blockExpires)},
      {t: 'address', v: order.contractAddr}
    );
  };

  var sign = function(privateKey, hash){
    var sig = web3.eth.accounts.secp256k1.keyFromPrivate(privateKey.replace(/^0x/i,''), 16).sign(hash.replace(/^0x/i,''), 16);
    return {
      r: toHex(sig.r),
      s: toHex(sig.s),
      v: 27 + sig.recoveryParam
    };
  };

  var verify = function(hash, signature, address) {
    var hash_buffer = new Buffer(hash.replace(/^0x/i,''), 'hex');

    var publicKey = web3.eth.accounts.secp256k1.recoverPubKey(hash_buffer, { r: toBN(signature.r), s: toBN(signature.s) }, signature.v - 27);
    var pubKey = (new Buffer(publicKey.encode('hex', false), 'hex')).slice(1);
    var p = toHex(new web3.utils.BN(pubKey));
    return web3.eth.accounts.publicToAddress(p).toLowerCase() === address.toLowerCase();
  };

  var verifyOrder = function(order) {
    var hash = orderToHash(order);
    return verify(
      hash,
      order, /* contains r, s, v */
      order.addr);
  };

  return {
    toBN: toBN,
    toHex: toHex,
    orderToHash: orderToHash,
    sign: sign,
    verify: verify,
    verifyOrder: verifyOrder
  };
});
