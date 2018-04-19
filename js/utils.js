// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'web3',
        'factsigner',
        'digioptions-contracts.js'
      ], function (
        Web3,
        factsigner,
        digioptionsContracts
      ) {
        return factory(
          Web3,
          factsigner,
          digioptionsContracts,
          XMLHttpRequest
        ); } );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('web3'),
      require('factsigner'),
      require('digioptions-contracts.js'),
      require('xhr2')
    );
  } else {
    // Global (browser)
    root.utils = factory(
      root.Web3,
      root.factsigner,
      root.digioptionsContracts,
      XMLHttpRequest
    );
  }
})(this, function(Web3, factsigner, digioptionsContracts /*, XMLHttpRequest */){

  var web3 = new Web3();
  var orderToHash = digioptionsContracts.orderToHash;

  // html escape function from underscore.js
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#x27;',
    '`': '&#x60;'
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function createEscaper(map) {
    var escaper = function escaper(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + Object.keys(map).join('|') + ')';
    //var source = '(?:&|<|>|"|\'|`)';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function (string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };

  var signOrder = function(web3, order, address, callback) {
    var hash = digioptionsContracts.orderToHash(web3.utils, order);
    // sign order (add r, s, v)
    factsigner.sign(web3, address, hash, function(err, sig) {
      if (err)
        callback(err);
      else
        callback(undefined, Object.assign({}, order, sig));
    });
  };

  var verify = function(hash, signature, address) {
    //console.log('verify', hash, signature, address);
    //var hash_buffer = new Buffer(hash.replace(/^0x/i,''), 'hex');
    var obj = {
      r: signature.r,
      s: signature.s,
      v: signature.v
    };
    //console.log('obj', obj);

    var publicKey = web3.eth.accounts.recover(obj);
    console.log('publicKey',publicKey);
    //var publicKey = web3.eth.accounts.secp256k1.recoverPubKey(hash_buffer, { r: toBN(signature.r), s: toBN(signature.s) }, signature.v - 27);
    //var pubKey = (new Buffer(publicKey.encode('hex', false), 'hex')).slice(1);
    //var p = toHex(new web3.utils.BN(pubKey));
    return web3.eth.accounts.publicToAddress(p).toLowerCase() === address.toLowerCase();
  };

  var verifyOrder = function(order) {
    var hash = orderToHash(web3.utils, order);
    console.log('verifyOrder hash:', hash);
    return verify(
      hash,
      order, /* contains r, s, v */
      order.addr);
  };

  return {
    escape: createEscaper(escapeMap),
    signOrder: signOrder,
    verify: verify,
    verifyOrder: verifyOrder
  };
});
