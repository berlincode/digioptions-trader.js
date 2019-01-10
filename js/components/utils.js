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


  function addZero(i) {
    if (i < 10) {
      i = '0' + i;
    }
    return i;
  }

  var dateStringUTC = function(d) {
    return (
      d.getUTCFullYear() + '-' +
      addZero(d.getUTCMonth()+1) + '-' +
      addZero(d.getUTCDate()) + ' ' +
      addZero(d.getUTCHours()) + ':' +
      addZero(d.getUTCMinutes()) + ':' +
      addZero(d.getUTCSeconds()) + '+00'
    );
  };

  var dateStringLocal = function(d) {
    var offset = -d.getTimezoneOffset()/60;
    return (
      d.getFullYear() + '-' +
      addZero(d.getMonth()+1) + '-' +
      addZero(d.getDate()) + ' ' +
      addZero(d.getHours()) + ':' +
      addZero(d.getMinutes()) + ':' +
      addZero(d.getSeconds()) +
      (offset < 0 ? '-' : '+') + addZero(Math.abs(offset))
    );
  };

  var dateFromUTCSeconds = function(epochSeconds){
    var d = new Date(0); // The 0 is the key, which sets the date to the epoch
    d.setUTCSeconds(epochSeconds);
    return d;
  };

  return {
    dateStringUTC: dateStringUTC,
    dateStringLocal: dateStringLocal,
    dateFromUTCSeconds: dateFromUTCSeconds
  };
});
