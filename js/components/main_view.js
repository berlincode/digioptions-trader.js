// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'react',
        './utils',
        './sidebar',
        './market_view'
      ],
      factory
    );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('react'),
      require('./utils.js'),
      require('./sidebar.js'),
      require('./market_view.js')
    );
  } else {
    // Global (browser)
    root.mainView = factory(
      root.React,
      root.utils,
      root.sidebar,
      root.marketView
    );
  }
})(this, function(React, utils, sidebar, marketView){

  var intervalString = function(sec_num){
    var days    = Math.floor(sec_num / 86400);
    var hours   = Math.floor((sec_num % 86400) / 3600);
    var minutes = Math.floor((sec_num % 3600) / 60);
    var seconds = Math.floor(sec_num % 60);

    if (hours   < 10) {hours   = '0'+hours;}
    if (minutes < 10) {minutes = '0'+minutes;}
    if (seconds < 10) {seconds = '0'+seconds;}
    return days + 'd '  + hours + ':' + minutes + ':' + seconds;
  };

  var mql = window.matchMedia('(min-width: 800px)');

  function NavbarView() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.render = function(){
      return (
        React.createElement(
          'nav',
          {
            className: 'navbar navbar-inverse navbar-fixed-top',
            style: {
              backgroundColor: '#0084cc',
              borderColor: '#0084cc',
              borderRadius: 0
            }
          },
          self.props.docked?
            React.createElement('div', {className: 'pull-left', style: {padding: 8}}, '')
            :
            React.createElement(
              'button',
              {
                type: 'button',
                className: 'pull-left',
                style: {
                  display: self.props.docked? 'none' : 'inline',
                  paddingTop: 12,
                  paddingBottom: 15,
                  paddingLeft: 10,
                  paddingRight: 10,

                  position: 'relative',
                  marginLeft: 11,
                  marginRight: 4,
                  marginTop: 2,
                  marginBottom: 2,
                  backgroundColor: 'transparent',
                  backgroundImage: 'none',
                  border: '1px solid transparent'
                },
                onClick: self.props.callbackOpenSidebar
              },
              React.createElement('div', {className: 'sr-only'}, 'Toggle navigation'),
              React.createElement('span', {style: {backgroundColor: '#fff', width: 22, display: 'block', height: 2}}),
              React.createElement('span', {style: {backgroundColor: '#fff', width: 22, display: 'block', height: 2, marginTop: 4}}),
              React.createElement('span', {style: {backgroundColor: '#fff', width: 22, display: 'block', height: 2, marginTop: 4, marginBottom: 2}})
            ),
          React.createElement('div', {className: 'navbar-header'},
            self.props.docked &&
            React.createElement('a', {className: 'navbar-left', href: 'https://github.com/berlincode/digioptions-trader.js'},
              React.createElement('img', {alt: 'digioptions-trader.js', style: {height: 48, width: 321}, src: 'img/digioptions_trader.png'})
            ),
            React.createElement('p', {id: 'navbar-text', className: 'navbar-text', style: {color: '#ffffff', padding: '0 10px'}})
          )
        )
      );
    };
  }
  NavbarView.prototype = Object.create(React.PureComponent.prototype);

  function MarketViewHeadWrapped() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.clickMarket = (function(evt) {
      evt.preventDefault();
      this.props.clickMarket(this.props.marketFactHash);
    }).bind(self);

    self.render = function(){
      return (
        React.createElement('li', {key: this.props.marketFactHash, role: 'presentation', className: self.props.selected? 'active': ''},
          React.createElement('a', {href: '#', onClick: self.clickMarket},
            React.createElement(marketView.MarketViewHead, self.props.marketProps)
          )
        )
      );
    };
  }
  MarketViewHeadWrapped.prototype = Object.create(React.PureComponent.prototype);

  function MonitorView() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.child = React.createRef();
    self.state = {
      //seconds: 0,
      //network: null, // TODO use together with marketFactHash
      //contractAddr: null, // TODO use together with marketFactHash
      marketFactHash: null
    };

    self.clickMarket = (function(marketFactHash) {
      self.setState({marketFactHash: marketFactHash});
      self.child.current.onSetOpen(false); // close sidebar if not docked
    }).bind(self);

    self.render = function(){
      var sidebarContent;

      if (! this.props.network){
        sidebarContent = 'loading ....';

      } else {
        var networks = [this.props.network];

        var dateBlock = this.props.blockHeader && utils.dateFromUTCSeconds(this.props.blockHeader.timestamp);

        /*
              React.createElement('dl', {className: 'dl-horizontal'},
                React.createElement('dt', null, 'uptime:'),
                React.createElement('dd', null, uptimeString(this.props.uptime))
              ),
        */
      
        // ether selected or first one
        var marketFactHashSelected = (self.state.marketFactHash !== null)? self.state.marketFactHash : ((this.props.sortedMarketKeys.length > 0) && this.props.sortedMarketKeys[0]);

        sidebarContent = (
          React.createElement(React.Fragment, null,

            React.createElement('div', {className: 'container-fluid'},
              'uptime: ' + intervalString(this.props.uptime),
              React.createElement('br', null),
              'database running: ' + (this.props.dbIsRunning?
                'yes (' + Math.floor(this.props.dbSize/(1024*1024)) + 'MB)'
                :
                'no (only available with nodejs)'
              )
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
            ),
            React.createElement('ul', {className: 'nav nav-pills nav-stacked'},
              this.props.sortedMarketKeys.map(function (marketFactHash){
                return React.createElement(MarketViewHeadWrapped, {
                  key: marketFactHash,
                  marketFactHash: marketFactHash,
                  marketProps: self.props.marketProps[marketFactHash],
                  selected: marketFactHash === marketFactHashSelected,
                  clickMarket: self.clickMarket
                });
              })
            )
          )
        );
      }

      return (
        React.createElement(LayoutView, {sidebar: sidebarContent, ref: self.child},
          React.createElement('div', {className: 'tab-content clearfix'},
            marketFactHashSelected &&
            React.createElement('div', {key: marketFactHashSelected, className: 'panel panel-default tab-pane active'},
              React.createElement(marketView.MarketViewMain, self.props.marketProps[marketFactHashSelected])
            )
          )
        )

      );
    };
  }
  MonitorView.prototype = Object.create(React.PureComponent.prototype);

  function LayoutView() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.state = {
      //seconds: 0,
      docked: mql.matches,
      open: true // start with sidebar opened
    };

    self.onSetOpen = function(open) {
      self.setState({open: open});
    };

    self.sidebarToggleOpen = function() {
      self.setState({open: !self.state.open});
    };

    self.mediaQueryChanged = function() {
      self.setState({
        docked: mql.matches,
        open: false
      });
    };

    self.componentWillMount = function() {
      mql.addListener(self.mediaQueryChanged);
    };

    self.componentWillUnmount = function() {
      mql.removeListener(self.mediaQueryChanged);
    };

    self.render = function(){
      var sidebarProps = {
        sidebar: this.props.sidebar,
        //sidebarClassName: '',
        //contentId: 'custom-sidebar-content-id',
        onSetOpen: self.onSetOpen,

        docked: self.state.docked,
        open: self.state.open,
        transitions: true,
        touch: true,
        shadow: ! self.state.docked,
        pullRight: false,
        touchHandleWidth: 20,
        dragToggleDistance: 30,
        styles: {
          sidebar: {
            top: 51, // 50px navbar height + 1 px navbar border-bottom
            zIndex: 1600,
            backgroundColor: '#ffffff',
            width: self.state.docked ? '45%' : 400,
            maxWidth: '80%',
            overflowY: 'scroll', // always display scroll bar
            padding: self.state.docked ? 8 : 0
          },
          content: {
            top: 51, // 50px navbar height + 1 px navbar border-bottom
            padding: self.state.docked ? 8 : 0
          },
          overlay: {
            zIndex: 1500
          },
          dragHandle: {
            zIndex: 1500
          }
        }
      };

      return (
        React.createElement(React.Fragment, null,
          React.createElement(NavbarView, {callbackOpenSidebar: self.sidebarToggleOpen, docked: self.state.docked}),
          React.createElement('a', {className: 'hidden-xs', href: 'https://github.com/berlincode/digioptions-trader.js'},
            React.createElement('img', {style: {zIndex: 9999, position: 'absolute', top: 0, right: 0, border: 0}, src: 'img/github_ribbon.png', alt: 'Fork me on GitHub'})
          ),

          React.createElement(sidebar.Sidebar, sidebarProps, this.props.children)
        )
      );
    };
  }
  LayoutView.prototype = Object.create(React.PureComponent.prototype);

  return {
    'MonitorView': MonitorView,
    'LayoutView': LayoutView
  };
});

