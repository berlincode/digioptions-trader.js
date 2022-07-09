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
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){
      return (
        React.createElement(React.Fragment, null)
      );
    };
  }
  TraderViewTop.prototype = Object.create(React.PureComponent.prototype);

  function TraderViewBase() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){

      var traderProps = this.props.traderProps;
      //var marketDefinition = this.props.marketDefinition;

      var infoStrings = traderProps.infoStrings || ['no infoStrings'];
      var errorStrings = traderProps.errorStrings || [];
      var dateQuote = traderProps.quote && utils.dateFromUTCSeconds(traderProps.quote[quoteProvider.KeyTimestampMs]/1000);
      var date = traderProps.data && traderProps.data.dateMs && utils.dateFromUTCSeconds(traderProps.data.dateMs/1000);

      return (
        React.createElement('dl', null,
          React.createElement('dt', null,
            'Trader Input'
          ),
          React.createElement('dd', null,
            'cash: ' + (traderProps.data ? traderProps.data.cashEth + ' eth' : '-'),
            React.createElement('br', null),
            'liquidity: ' + (traderProps.data ? traderProps.data.liquidityEth + ' eth' : '-'),
            React.createElement('br', null),
            'last quote value: ' + (traderProps.quote ? traderProps.quote[quoteProvider.KeyValue] : '-'),
            React.createElement('br', null),
            'last quote time (local): ' + (dateQuote ? digioptionsTools.dateStringLocalTZ(dateQuote) : '-'),
            React.createElement('br', null),
            'last quote time (UTC): ' + (dateQuote ? digioptionsTools.dateStringUTCTZ(dateQuote) : '-'),
            React.createElement('br', null),
            'date (local): ' + (date? digioptionsTools.dateStringLocalTZ(date) : '-'),
            React.createElement('br', null),
            'date (UTC): ' + (date? digioptionsTools.dateStringUTCTZ(date) : '-'),
            React.createElement('br', null),

            (
              errorStrings &&
              React.createElement('div', {key: 'errorStrings', className: 'bg-danger'},
                errorStrings.map(function(string, idx){
                  return [
                    string,
                    React.createElement('br', {key: idx})
                  ];
                })
              )
            ),
            (
              infoStrings &&
              React.createElement('div', {key: 'infoStrings', className: 'bg-warning'},
                infoStrings.map(function(string, idx){
                  return [
                    string,
                    React.createElement('br', {key: idx})
                  ];
                })
              )
            )
          )
        )
      );
    };
  }
  TraderViewBase.prototype = Object.create(React.PureComponent.prototype);

  function TraderView() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){

      return (
        React.createElement(TraderViewBase, {
          traderProps: this.props.traderProps || {},
          marketDefinition: this.props.marketDefinition
        })
      );
    };
  }
  TraderView.prototype = Object.create(React.PureComponent.prototype);

  return {
    TraderViewTop: TraderViewTop,
    TraderViewBase: TraderViewBase,
    TraderView: TraderView
  };
});

