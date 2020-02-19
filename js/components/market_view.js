// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'react',
        'factsigner/js/constants',
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
      require('factsigner/js/constants'),
      require('digioptions-tools.js'),
      require('./utils.js'),
      require('./trader_view.js')
    );
  } else {
    // Global (browser)
    root.marketView = factory(
      root.React,
      root.factsignerConstants,
      root.digioptionsTools,
      root.utils,
      root.traderView
    );
  }
})(this, function(React, factsignerConstants, digioptionsTools, utils, traderView){

  var getDigioptionsUrl = digioptionsTools.dataNetworksUtils.getDigioptionsUrl;
  var getEtherscanUrlContract = digioptionsTools.dataNetworksUtils.getEtherscanUrlContract;
  var getXmppPubsubViewerUrl = digioptionsTools.dataNetworksUtils.getXmppPubsubViewerUrl;

  MarketViewHead.prototype = Object.create(React.PureComponent.prototype);
  function MarketViewHead() {
    React.PureComponent.constructor.call(this);
    var self = this;

    //self.state = {seconds: 0};

    self.render = function(){
      return (
        React.createElement(React.Fragment, null,
          this.props.marketDefinition.marketsAddr.substr(0, 12) + '... | ',
          React.createElement('span', {className: 'd-none d-sm-inline'},
            'type: '
          ),
          (factsignerConstants.marketIntervalById[this.props.marketDefinition.marketBaseData.marketInterval] || '-') + ' | ',
          React.createElement('span', {className: 'd-none d-sm-inline'},
            'underlying: '
          ),
          '"' + this.props.marketDefinition.marketBaseData.underlyingString + '" ',
          (this.props.expired ?
            React.createElement('span', {key: 'market_open_close', className: 'badge badge-dark'}, 'closed')
            :
            React.createElement('span', {key: 'market_open_close', className: 'badge badge-success'}, 'open')
          ),
          React.createElement('span', {}, ' '),
          (this.props.terminated ?
            React.createElement('span', {key: 'market_terminated', className: 'badge badge-dark'}, 'terminated')
            :
            React.createElement('span', {key: 'market_terminated', className: 'badge badge-success'}, 'running')
          )
        )
      );
    };
  }

  function MarketViewBody() {
    React.PureComponent.constructor.call(this);
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
              'marketsAddr: ' + this.props.marketDefinition.marketsAddr,
              React.createElement('br', null),
              'marketHash: ' + this.props.marketDefinition.marketHash,
              React.createElement('br', null),
              'strikes: ' + this.props.marketDefinition.marketBaseData.strikesStrings.join(', '),
              React.createElement('br', null),
              'transactionFee0: ' + this.props.marketDefinition.marketBaseData.transactionFee0StringPercent + ' %',
              React.createElement('br', null),
              'transactionFee1: ' + this.props.marketDefinition.marketBaseData.transactionFee1StringPercent + ' %',
              React.createElement('br', null),
              'expiration (epoch seconds): ' + this.props.marketDefinition.marketBaseData.expiration,
              React.createElement('br', null),
              'expiration (local): ' + digioptionsTools.dateStringLocalTZ(expirationDate),
              React.createElement('br', null),
              'expiration (UTC): ' + digioptionsTools.dateStringUTCTZ(expirationDate),
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
  MarketViewBody.prototype = Object.create(React.PureComponent.prototype);

  function MarketViewMain() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){

      var url_market = getDigioptionsUrl('pageMarket', {network: self.props.marketDefinition.network, contractAddr: self.props.marketDefinition.marketsAddr, marketHash: self.props.marketDefinition.marketHash});
      var url_contract = getEtherscanUrlContract(self.props.marketDefinition.network, self.props.marketDefinition.marketsAddr);
      var url_pubsub_viewer = getXmppPubsubViewerUrl(self.props.marketDefinition.network, self.props.marketDefinition.marketsAddr, self.props.marketDefinition.marketHash);

      return (
        React.createElement(React.Fragment, null,
          React.createElement('div', {className: 'card-header'},
            (url_contract?
              React.createElement('a', {href: url_contract},
                self.props.marketDefinition.marketsAddr.substr(0,12) + '...'
              )
              :
              self.props.marketDefinition.marketsAddr.substr(0,12) + '...'
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
          React.createElement('div', {className: 'card-body'},
            React.createElement(MarketViewBody, self.props)
          )
        )
      );
    };
  }
  MarketViewMain.prototype = Object.create(React.PureComponent.prototype);

  return {
    MarketViewHead: MarketViewHead,
    MarketViewMain: MarketViewMain
  };
});
