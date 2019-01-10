// vim: sts=2:ts=2:sw=2

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'react',
        'digioptions-tools.js',
        './utils'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('react'),
      require('digioptions-tools.js'),
      require('./utils.js')
    );
  } else {
    // Global (browser)
    root.traderView = factory(
      root.React,
      root.digioptionsTools,
      root.utils
    );
  }
})(this, function(React, digioptionsTools, utils){
  var quoteProvider = digioptionsTools.quoteProvider;

  function TraderViewTop() {
    React.Component.constructor.call(this);
    var self = this;

    self.render = function(){
      return (
        React.createElement(React.Fragment, null)
      );
    };
  }
  TraderViewTop.prototype = Object.create(React.Component.prototype);

  function TraderView() {
    React.Component.constructor.call(this);
    var self = this;

    self.render = function(){

      var traderProps = this.props.traderProps;
      //var marketDefinition = this.props.marketDefinition;

      var infoStrings = traderProps.infoStrings || ['no infoStrings'];
      var dateQuote = traderProps.quote && utils.dateFromUTCSeconds(traderProps.quote[quoteProvider.KeyTimestampMs]/1000);

      return (
        React.createElement('dl', null,
          React.createElement('dt', null,
            'Trader Output'
          ),
          React.createElement('dd', null,
            'last quote value: ' + (traderProps.quote ? traderProps.quote[quoteProvider.KeyValue] : '-'),
            React.createElement('br', null),
            'last quote time (local): ' + (dateQuote ? utils.dateStringLocal(dateQuote) : '-'),
            React.createElement('br', null),
            'last quote time (UTC): ' + (dateQuote ? utils.dateStringUTC(dateQuote) : '-'),
            React.createElement('br', null),

            React.createElement('div', {key: 'infoStrings'},
              infoStrings.map(function(infoString, idx){
                return [
                  infoString,
                  React.createElement('br', {key: idx})
                ];
              })
            )
          )
        )
      );
    };
  }
  TraderView.prototype = Object.create(React.Component.prototype);

  return {
    TraderView: TraderView,
    TraderViewTop: TraderViewTop
  };
});

