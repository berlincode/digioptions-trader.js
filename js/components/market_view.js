// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'react',
        'digioptions-tools.js',
        './utils',
        './trader_view'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('react'),
      require('digioptions-tools.js'),
      require('./utils.js'),
      require('./trader_view.js')
    );
  } else {
    // Global (browser)
    root.marketView = factory(
      root.React,
      root.digioptionsTools,
      root.utils,
      root.traderView
    );
  }
})(this, function(React, digioptionsTools, utils, traderView){

  var getDigioptionsUrl = digioptionsTools.dataNetworksUtils.getDigioptionsUrl;
  var getEtherscanUrlContract = digioptionsTools.dataNetworksUtils.getEtherscanUrlContract;
  var getXmppPubsubViewerUrl = digioptionsTools.dataNetworksUtils.getXmppPubsubViewerUrl;

  MarketViewHead.prototype = Object.create(React.Component.prototype);
  function MarketViewHead() {
    React.Component.constructor.call(this);
    var self = this;

    //self.state = {seconds: 0};

    self.render = function(){
      return (
        React.createElement('div', {},
          this.props.marketDefinition.contractAddr.substr(0, 12) + '... | ',
          React.createElement('span', {className: 'hidden-xs'},
            'type: '
          ),
          digioptionsTools.typeDurationToString(this.props.marketDefinition.typeDuration) + ' | ',
          React.createElement('span', {className: 'hidden-xs'},
            'underlying: '
          ),
          '"' + this.props.marketDefinition.marketBaseData.underlyingString + '" ',
          (this.props.expired ?
            React.createElement('span', {key: 'market_open_close', className: 'label label-default'}, 'closed')
            :
            React.createElement('span', {key: 'market_open_close', className: 'label label-success'}, 'open')
          ),
          React.createElement('span', {}, ' '),
          (this.props.terminated ?
            React.createElement('span', {key: 'market_terminated', className: 'label label-default'}, 'terminated')
            :
            React.createElement('span', {key: 'market_terminated', className: 'label label-success'}, 'running')
          )
        )
      );
    };
  }

  function MarketViewBody() {
    React.Component.constructor.call(this);
    var self = this;

    //self.state = {seconds: 0};

    self.render = function(){
      // we cannot send dates via json
      var expirationDate = new Date(self.props.marketDefinition.marketBaseData.expiration * 1000);

      return (
        React.createElement(React.Fragment, null,
          React.createElement(traderView.TraderViewTop, {
            traderProps: this.props.traderProps || {},
            marketDefinition: this.props.marketDefinition
          }),
          this.props.traderInfo &&
          React.createElement('div', {className: 'bg-danger text-white'},
            this.props.traderInfo
          ),
          React.createElement('dl', null,
            React.createElement('dt', null,
              'Market Base Data'
            ),
            React.createElement('dd', null,
              'contractAddr: ' + this.props.marketDefinition.contractAddr,
              React.createElement('br', null),
              'marketFactHash: ' + this.props.marketDefinition.marketFactHash,
              React.createElement('br', null),
              'strikes: ' + this.props.marketDefinition.marketBaseData.strikesStrings.join(', '),
              React.createElement('br', null),
              'transactionFee: ' + this.props.marketDefinition.marketBaseData.transactionFeeStringPercent + ' %',
              React.createElement('br', null),
              'expiration (epoch seconds): ' + this.props.marketDefinition.marketBaseData.expiration,
              React.createElement('br', null),
              'expiration (local): ' + utils.dateStringLocal(expirationDate),
              React.createElement('br', null),
              'expiration (UTC): ' + utils.dateStringUTC(expirationDate),
              React.createElement('br', null)
            )
          ),
          React.createElement('dl', null,
            React.createElement('dt', null,
              'More ...'
            ),
            React.createElement('dd', null,
              'counter: ' + this.props.counter,
              React.createElement('br', null),
              'pubsub_message_count: ' + this.props.pubsub_message_count,
              React.createElement('br', null)
            )
          ),

          React.createElement('hr', null),
          React.createElement(traderView.TraderView, {
            traderProps: this.props.traderProps || {},
            marketDefinition: this.props.marketDefinition
          })
          //'terminated: ' + this.terminated,
          //React.createElement('br', null)
        )
      );
    };
  }
  MarketViewBody.prototype = Object.create(React.Component.prototype);

  function MarketViewMain() {
    React.Component.constructor.call(this);
    var self = this;

    self.render = function(){

      var url_market = getDigioptionsUrl('pageMarket', {network: self.props.marketDefinition.network, marketsAddr: self.props.marketDefinition.contractAddr, marketFactHash: self.props.marketDefinition.marketFactHash});
      var url_contract = getEtherscanUrlContract(self.props.marketDefinition.network, self.props.marketDefinition.contractAddr);
      var url_pubsub_viewer = getXmppPubsubViewerUrl(self.props.marketDefinition.network, self.props.marketDefinition.contractAddr, self.props.marketDefinition.marketFactHash);

      return (
        React.createElement(React.Fragment, null,
          React.createElement('div', {className: 'panel-heading'},
            (url_contract?
              React.createElement('a', {href: url_contract},
                self.props.marketDefinition.contractAddr.substr(0,12) + '...'
              )
              :
              self.props.marketDefinition.contractAddr.substr(0,12) + '...'
            ),
            ' | "' + self.props.marketDefinition.marketBaseData.underlyingString + '" | ',
            React.createElement('a', {href: url_market},
              'view market'
            ),
            ' | ',
            React.createElement('a', {href: url_pubsub_viewer},
              'pubsub viewer'
            )
          ),
          React.createElement('div', {className: 'panel-body'},
            React.createElement(MarketViewBody, self.props)
          )
        )
      );
    };
  }
  MarketViewMain.prototype = Object.create(React.Component.prototype);

  return {
    MarketViewHead: MarketViewHead,
    MarketViewMain: MarketViewMain
  };
});
