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
  var getExplorerUrlAddress = digioptionsTools.dataNetworksUtils.getExplorerUrlAddress;
  var getXmppPubsubViewerUrl = digioptionsTools.dataNetworksUtils.getXmppPubsubViewerUrl;

  function MarketViewMessages() {
    React.PureComponent.constructor.call(this);
    var self = this;
    self.render = function(){
      return (
        Object.keys(self.props.marketMessages).sort().map(function(key){
          return (
            React.createElement('div', {className: 'bg-danger text-white', key: key},
              self.props.marketMessages[key]
            )
          );
        })
      );
    };
  }
  MarketViewMessages.prototype = Object.create(React.PureComponent.prototype);

  function MarketViewHead() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){
      return (
        React.createElement(React.Fragment, null,
          this.props.contractDescription.marketsAddr.substr(0, 12) + '... | ',
          React.createElement('span', {className: 'd-none d-sm-inline'},
            'type: '
          ),
          (factsignerConstants.marketIntervalById[this.props.marketDefinition.marketBaseData.marketInterval] || '-') + ' | ',
          React.createElement('span', {className: 'd-none d-sm-inline'},
            'underlying: '
          ),
          JSON.stringify(this.props.marketDefinition.marketBaseData.underlyingString.split('\0'))+' ',
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
  MarketViewHead.prototype = Object.create(React.PureComponent.prototype);

  function MarketLiveDataView() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){
      return (
        React.createElement('dl', null,
          React.createElement('dt', null,
            'More ...'
          ),
          React.createElement('dd', null,
            'counter: ' + self.props.counter,
            React.createElement('br', null),
            'pubsubMessageCount: ' + self.props.pubsubMessageCount,
            React.createElement('br', null)
          )
        )
      );
    };
  }
  MarketLiveDataView.prototype = Object.create(React.PureComponent.prototype);

  function MarketViewBody() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){
      // we cannot send dates via json
      var expirationDate = new Date(self.props.marketDefinition.marketBaseData.expiration * 1000);

      return (
        React.createElement(React.Fragment, null,
          React.createElement(traderView.TraderViewTop, {
            traderProps: self.props.traderProps || {},
            marketDefinition: self.props.marketDefinition,
            contractDescription: self.props.contractDescription
          }),
          React.createElement('dl', null,
            React.createElement('dt', null,
              'Market Base Data'
            ),
            React.createElement('dd', null,
              'marketsAddr: ' + self.props.contractDescription.marketsAddr,
              React.createElement('br', null),
              'marketHash: ' + self.props.marketDefinition.marketHash,
              React.createElement('br', null),
              'strikes: ' + self.props.marketDefinition.marketBaseData.strikesStrings.join(', '),
              React.createElement('br', null),
              'transactionFee0: ' + self.props.marketDefinition.marketBaseData.transactionFee0StringPercent + ' %',
              React.createElement('br', null),
              'transactionFee1: ' + self.props.marketDefinition.marketBaseData.transactionFee1StringPercent + ' %',
              React.createElement('br', null),
              'transactionFeeSigner: ' + self.props.marketDefinition.marketBaseData.transactionFeeSignerStringPercent + ' %',
              React.createElement('br', null),
              'expiration (epoch seconds): ' + self.props.marketDefinition.marketBaseData.expiration,
              React.createElement('br', null),
              'expiration (local): ' + digioptionsTools.dateStringLocalTZ(expirationDate),
              React.createElement('br', null),
              'expiration (UTC): ' + digioptionsTools.dateStringUTCTZ(expirationDate),
              React.createElement('br', null)
            )
          ),

          React.createElement('hr', null),
          React.createElement(traderView.TraderView, {
            traderProps: self.props.traderProps || {},
            marketDefinition: self.props.marketDefinition
          })
          //'terminated: ' + self.terminated,
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

      var urlMarket = getDigioptionsUrl('pageMarket', {
        network: self.props.marketDefinition.network,
        contractAddr: self.props.contractDescription.marketsAddr,
        marketHash: self.props.marketDefinition.marketHash}
      );
      var explorerUrlContract = getExplorerUrlAddress(
        self.props.marketDefinition.network,
        self.props.contractDescription.marketsAddr
      );
      var urlPubsubViewer = getXmppPubsubViewerUrl(
        self.props.marketDefinition.network,
        self.props.contractDescription.marketsAddr,
        self.props.marketDefinition.marketHash
      );

      return (
        React.createElement(React.Fragment, null,
          React.createElement('div', {className: 'card-header'},
            ((explorerUrlContract && (explorerUrlContract.length > 0))?
              React.createElement('a', {href: explorerUrlContract[0].urlAddress},
                self.props.contractDescription.marketsAddr.substr(0,12) + '...'
              )
              :
              self.props.contractDescription.marketsAddr.substr(0,12) + '...'
            ),
            ' | "' + self.props.marketDefinition.marketBaseData.underlyingString + '" | ',
            React.createElement('a', {href: urlMarket},
              'view market'
            ),
            ' | ',
            React.createElement('a', {href: urlPubsubViewer},
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
    MarketViewMessages: MarketViewMessages,
    MarketViewHead: MarketViewHead,
    MarketLiveDataView: MarketLiveDataView,
    MarketViewMain: MarketViewMain
  };
});
