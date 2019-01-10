// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'react',
        './utils',
        './market_view'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('react'),
      require('./utils.js'),
      require('./market_view.js')
    );
  } else {
    // Global (browser)
    root.mainView = factory(
      root.React,
      root.utils,
      root.marketView
    );
  }
})(this, function(React, utils, marketView){

  var uptimeString = function(sec_num){
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours   < 10) {hours   = '0'+hours;}
    if (minutes < 10) {minutes = '0'+minutes;}
    if (seconds < 10) {seconds = '0'+seconds;}
    return hours+':'+minutes+':'+seconds;
  };

  function MonitorView() {
    React.Component.constructor.call(this);
    var self = this;

    //self.state = {seconds: 0};

    self.render = function(){

      // TODO this should be send via data-feed
      var networks = [this.props.network];

      var dateBlock = this.props.blockHeader && utils.dateFromUTCSeconds(this.props.blockHeader.timestamp);

      /*
            React.createElement('dl', {className: 'dl-horizontal'},
              React.createElement('dt', null, 'uptime:'),
              React.createElement('dd', null, uptimeString(this.props.uptime))
            ),
      */
      return (
        React.createElement('div', {},

          React.createElement('div', {className: 'container-fluid'},
            'uptime: ' + uptimeString(this.props.uptime),
            React.createElement('br', null),
            'database running: ' + (this.props.dbIsRunning? 'yes' : 'no (only available with nodejs)')
          ),

          React.createElement('ul', {className: 'nav nav-tabs'},
            networks.map(function(netw){
              return (
                React.createElement('li', {key: netw, className: (netw===self.props.network? 'active': '')},
                  React.createElement('a', {href: '?network=' + netw},
                    netw
                  )
                )
              );
            })
          ),

          React.createElement('div', {className: 'container-fluid'},
            React.createElement('div', {className: 'row'},
              React.createElement('div', {className: 'col-md-6'},
                React.createElement('div', {className: 'panel panel-primary'},
                  React.createElement('div', {className: 'panel-body'},
                    'web3 provider status: ' + (this.props.web3Connected? 'connected' : 'not connected'),
                    React.createElement('br', null),
                    'pubsub status: ' + this.props.pubsubFeedbackMsg,
                    React.createElement('br', null),
                    'pubsubMessageCount: ' + this.props.pubsubMessageCount,
                    React.createElement('br', null),
                    'accounts: ' + this.props.accounts.map(function(x){return x.address;}).join(', '),
                    React.createElement('br', null),
                    'contractAddresses: ' + this.props.contractAddresses.join(', '),
                    React.createElement('br', null),
                    'last block number: ' + (this.props.blockHeader? this.props.blockHeader.number : '???'),
                    React.createElement('br', null),
                    'last block (local): ' + (dateBlock ? utils.dateStringLocal(dateBlock) : '-'),
                    React.createElement('br', null),
                    'last block (UTC): ' + (dateBlock ? utils.dateStringUTC(dateBlock) : '-')
                  )
                )
              ),
              React.createElement('div', {className: 'col-md-6'},
                React.createElement('div', {className: 'panel panel-primary'},
                  React.createElement('div', {className: 'panel-body'},
                    'coming more...'
                  )
                )
              )
            )
          ),
          React.createElement('div', {className: 'container-fluid'},
            React.createElement('div', {className: 'row'},
              React.createElement('div', {className: 'col-md-6'},
                React.createElement('ul', {className: 'nav nav-pills nav-stacked'},
                  this.props.sortedMarketKeys.map(function (marketFactHash, idx){
                    return React.createElement('li', {key: marketFactHash, role: 'presentation', className: (idx===0)? 'active': ''},
                      React.createElement('a', {href: '#'+marketFactHash, 'data-toggle': 'tab'},
                        React.createElement(marketView.MarketViewHead, self.props.marketProps[marketFactHash])
                      )
                    );
                  })
                )
              ),
              React.createElement('div', {className: 'col-md-6'},
                React.createElement('div', {className: 'tab-content clearfix'},
                  this.props.sortedMarketKeys.map(function (marketFactHash, idx){
                    return (
                      React.createElement('div', {key: marketFactHash, className: 'panel panel-default tab-pane' + ((idx===0)? ' active': ''), id: marketFactHash},
                        React.createElement(marketView.MarketViewMain, self.props.marketProps[marketFactHash])
                      )
                    );
                  })

                )
              )
            )
          )
        )

      );
    };
  }
  MonitorView.prototype = Object.create(React.Component.prototype);

  return {
    'MonitorView': MonitorView
  };
});

