// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
    );
  } else {
    // Global (browser)
    root.utils = factory(
    );
  }
})(this, function(){

  function dateFromUTCSeconds(epochSeconds){
    var date = new Date(0); // The 0 is the key, which sets the date to the epoch
    date.setUTCSeconds(epochSeconds);
    return date;
  }

  return {
    dateFromUTCSeconds: dateFromUTCSeconds
  };
});
