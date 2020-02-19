// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        'react',
        'digioptions-tools.js',
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
      require('digioptions-tools.js'),
      require('./utils.js'),
      require('./sidebar.js'),
      require('./market_view.js')
    );
  } else {
    // Global (browser)
    root.mainView = factory(
      root.React,
      root.digioptionsTools,
      root.utils,
      root.sidebar,
      root.marketView
    );
  }
})(this, function(React, digioptionsTools, utils, sidebar, marketView){

  function intervalString(sec_num){
    var days    = Math.floor(sec_num / 86400);
    var hours   = Math.floor((sec_num % 86400) / 3600);
    var minutes = Math.floor((sec_num % 3600) / 60);
    var seconds = Math.floor(sec_num % 60);

    if (hours   < 10) {hours   = '0'+hours;}
    if (minutes < 10) {minutes = '0'+minutes;}
    if (seconds < 10) {seconds = '0'+seconds;}
    return days + 'd ' + hours + ':' + minutes + ':' + seconds;
  }

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
              zIndex: 1700,
              minHeight: 56
            }
          },
          (self.props.docked?
            React.createElement('a', {className: 'navbar-brand', style:{padding: 0}, href: 'https://github.com/berlincode/digioptions-trader.js'},
              React.createElement('span', {dangerouslySetInnerHTML: {__html: '<svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 1 90.6563 13.233"><path d="M.1 2.2358v8.3902h3.6437c.5722 0 1.063-.0701 1.4723-.2103 1.0762-.3676 1.6143-1.26 1.6143-2.6774v-2.575c0-.7087-.1288-1.2866-.3865-1.7338-.4623-.7958-1.3643-1.1937-2.7058-1.1937zM1.7883 3.549h1.8076c.5647 0 .9626.1137 1.1937.341.235.2274.3525.578.3525 1.0517v3.0127c0 .4813-.1137.828-.341 1.0403-.2275.2122-.6292.3183-1.2052.3183H2.3691v-4.02h-.5808zM7.9038 3.6514V2.2815H9.45v1.37zm0 6.9748v-6.105H9.45v6.105zM12.9222 9.4154q.756 0 1.1312-.2728V5.8968q0-.1365-.324-.2842-.3297-.1422-.8413-.1422-1.0573 0-1.0573.8527v2.2794q0 .813 1.0914.813zm-.0796 3.7176q-1.3472 0-2.018-.3183l.3183-1.0516q.8584.2387 1.5803.2387.7276 0 1.0289-.2899.3013-.2842.3013-.9152v-.6707q-.5344.3183-1.5178.3183-.9777 0-1.6143-.5002-.6367-.506-.6367-1.3984V6.3572q0-.8242.5343-1.3927.54-.574 1.7906-.574.4832 0 .9436.1648.4662.1591.7674.4035l.1308-.4433h1.1482v6.1789q0 2.4386-2.757 2.4386zM16.6217 3.6514V2.2815h1.5462v1.37zm0 6.9748v-6.105h1.5462v6.105zM23.0593 10.774c-1.6447 0-2.5319-.4093-3.0548-1.2278-.2956-.4548-.4434-1.044-.4434-1.7679V5.1521c0-1.1785.3657-2.0028 1.097-2.4727.6026-.3865 1.2795-.5817 2.424-.5855 1.5954 0 2.4522.4358 2.9638 1.3074.288.4889.432 1.101.432 1.836v2.45c0 1.1445-.36 1.9706-1.08 2.4785-.576.4054-1.2245.6082-2.3386.6082zM21.255 7.9659c0 .5495.1687.9341.506 1.154.3372.2197.6427.3296 1.3097.3296.6707 0 .9592-.108 1.2585-.324.3032-.2198.4548-.6063.4548-1.1596V4.9247c0-.5457-.1535-.9322-.4604-1.1596-.307-.2311-.5935-.3467-1.253-.3467-.6555 0-.9591.1137-1.304.341-.341.2274-.5116.6159-.5116 1.1653zM30.098 9.6826q1.0913 0 1.0913-.8754V6.3345q0-.864-1.0402-.864-.3468 0-.6423.1136-.2956.1137-.4434.2615v3.5698q.5002.2672 1.0345.2672zm-2.5808 3.2742V4.5212h1.08l.1535.3979q.722-.5287 1.7338-.5287 1.0175 0 1.6314.54.6196.5344.6196 1.4268v2.4159q0 .8185-.6253 1.404-.6253.5798-1.8815.5798-.6537 0-1.1653-.2273v2.4272zM36.435 10.6944q-1.3926 0-1.9952-.4206-.6025-.4207-.6025-1.586V5.5045h-.8129v-.9833h.8584l.142-1.9612h1.3586v1.9612h1.4496v.9833h-1.4496v3.0753q0 .5684.2672.7674.2729.199 1.0402.199h.182l-.0569 1.1482zM37.4288 3.6514V2.2815h1.5462v1.37zm0 6.9748v-6.105h1.5462v6.105zM42.4586 10.757q-2.649 0-2.649-1.9782V6.3743q0-.938.6935-1.461.6992-.5229 1.9498-.5229 1.2562 0 1.9554.5287.6992.523.6992 1.4552v2.4045q0 1.4722-1.3984 1.8417-.523.1364-1.2505.1364zm0-1.0744q1.1027 0 1.1027-.8356V6.306q0-.449-.2785-.6423-.2785-.1933-.8242-.1933-1.1028 0-1.1028.8356v2.541q0 .449.2728.6423.2786.1933.83.1933zM49.7393 6.3345q0-.7902-1.0744-.7902-.4604 0-.8242.2445-.3638.2387-.3638.6594v4.178h-1.5462v-6.105h1.5462v.54q.7788-.6822 1.819-.6822t1.512.5344q.4775.5343.4775 1.3358v4.377h-1.5461zM54.3654 10.757q-1.4438 0-2.3818-.4776l.3127-1.0516q1.0687.4548 2.0123.4548.7219 0 .8185-.6424.0114-.0796.0114-.1478 0-.4604-.5173-.6252l-1.3415-.4207q-.6878-.216-.9777-.648-.2842-.432-.2842-1.0516v-.0455q.0113-1.711 2.342-1.711 1.1482 0 2.0577.5173l-.3638.9606q-.29-.1535-.7901-.2728-.4946-.125-.9323-.125-.4377 0-.6366.159-.199.1536-.199.5344 0 .3752.4206.506l1.262.3978q.756.2388 1.063.6708.3126.432.3126 1.205 0 .7732-.5684 1.2961-.5685.5173-1.62.5173z" style="line-height:1.25;" font-weight="700" font-size="11.6416" font-family="Monda" letter-spacing="-.7911" word-spacing="-2.0241" fill="#fff"/><g style="line-height:1.25;" aria-label="Trader" font-weight="700" font-size="11.6417" font-family="Monda" letter-spacing="-.7964" word-spacing="0" fill="#ff557b" stroke-width=".2291"><path style="" d="M60.9207 10.6176V3.512h-2.3363V2.2274h6.3551V3.512h-2.3363v7.1055zM65.28 10.6176v-6.105h1.5462V5.24q.1364-.2615.5684-.4661.7447-.3581 1.4382-.3581.0796 0 .1478.0057l-.0341 1.313q-1.0175.0512-1.6883.381-.3752.1818-.432.4092v4.0928zM70.4807 8.9463q0 .7333.7958.7333.3126 0 .6594-.1648.3467-.1649.5457-.4661V7.5252q-.2729.2217-.9607.4775-.6878.2501-.864.4662-.1762.2103-.1762.4774zm2.126.9948q-.2672.3468-.7675.5798-.4945.2274-1.205.2274-.7106 0-1.2051-.4604-.4889-.4605-.4889-1.1767 0-.7162.4434-1.1483.449-.432 1.711-.8299.7674-.2444 1.0743-.4377.3127-.1932.3127-.5343 0-.7049-.9607-.6992-.54 0-.7446.2103-.2047.2047-.2047.5969v.2387h-1.4495v-.1819q0-.9152.6082-1.4268.6083-.5172 1.8702-.5172 1.262 0 1.8304.5343.5741.5343.5741 1.5348v2.4159q0 .4092.1023.54.1023.1307.3923.1307l-.0626 1.1255h-.324q-.631 0-.9834-.1705-.3524-.1762-.523-.5514zM76.443 8.7986q0 .4547.2672.6593.2672.2047.8584.2047.5911 0 1.0004-.2444v-3.746q-.4434-.2104-1.0004-.2104-.5571 0-.8413.199-.2843.1932-.2843.6423zm.8811 1.9497q-1.2164 0-1.8247-.5116-.6025-.5173-.6025-1.4609V6.3372q0-.8924.6253-1.4211.631-.5343 1.91-.5343.5456 0 1.1368.216V2h1.5462v8.6176h-1.046l-.1648-.3582q-.6992.4889-1.5803.4889zM82.468 6.917h2.1941v-.7162q0-.5514-.4434-.6765-.233-.0682-.7105-.0625-.4718 0-.756.1592-.2843.1591-.2843.6082zm.034 3.729q-.4547-.0967-.8185-.324-.7617-.4661-.7617-1.6144V6.3258q0-.9208.6992-1.4324.6991-.5116 1.9042-.5116 2.5978 0 2.5978 2.0009v1.478h-3.655v.9947q0 .506.25.665.2502.1536.847.1536.5969 0 .7049-.0569.2558-.1421.3297-.341.0739-.2047.0853-.5344h1.4324q-.034 1.4097-.9947 1.785-.5628.216-1.3643.216-.8015.0056-1.2563-.0967zM86.8557 10.6176v-6.105h1.5462V5.24q.1364-.2615.5684-.4661.7447-.3581 1.4382-.3581.0796 0 .1478.0057l-.0341 1.313q-1.0175.0512-1.6883.381-.3752.1818-.432.4092v4.0928z"/></g></svg>'}})
            )
            :
            React.createElement(
              'button',
              {
                type: 'button',
                style: {
                  //paddingTop: 12,
                  //paddingBottom: 15,
                  //paddingLeft: 10,
                  //paddingRight: 10,

                  position: 'relative',
                  padding: 12,
                  marginLeft: 8,
                  marginRight: 16,
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
            )
          ),
          React.createElement('span', {id: 'navbar-text', className: 'navbar-text mr-auto', style: {color: '#ffffff', paddingRight: 100}}, null)
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
      this.props.clickMarket(self.props.network, self.props.marketHash);
    }).bind(self);

    self.render = function(){
      return (
        React.createElement('a', {className: 'nav-link' + (self.props.selected? ' active': ''), href: '#', onClick: self.clickMarket},
          React.createElement(marketView.MarketViewHead, self.props.marketProps)
        )
      );
    };
  }
  MarketViewHeadWrapped.prototype = Object.create(React.PureComponent.prototype);

  function NetworkTab() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.clickNetwork = (function(evt) {
      evt.preventDefault();
      this.props.clickNetwork(self.props.network);
    }).bind(self);

    self.render = function(){
      return (
        React.createElement('li', {className: 'nav-item'},
          React.createElement('a', {href: '#', className: 'nav-link' + (self.props.selected ? ' active': ''), onClick: self.clickNetwork},
            self.props.network
          )
        )
      );
    };
  }
  NetworkTab.prototype = Object.create(React.PureComponent.prototype);

  function MonitorView() {
    React.PureComponent.constructor.call(this);
    var self = this;

    self.child = React.createRef();
    self.state = {
      //seconds: 0,
      network: null, // TODO use together with marketHash
      //contractAddr: null, // TODO use together with marketHash
      marketHash: null
    };

    self.clickMarket = (function(network, marketHash) {
      self.setState({network: network, marketHash: marketHash});
      self.child.current.onSetOpen(false); // close sidebar if not docked
    }).bind(self);

    self.clickNetwork = (function(network) {
      self.setState({network: network, marketHash: null});
    }).bind(self);

    self.render = function(){
      var sidebarContent;

      var networksSorted = Object.keys(this.props.networks || {}).sort();

      // ether selected or first one
      var network = (self.state.network !== null)? self.state.network : ((networksSorted.length > 0) && networksSorted[0]);
      // TODO rename sortedMarketKeys to marketKeysSorted ot marketHashesSorted?

      var dataNetwork = null;
      var marketHashSelected = null;

      if (! network){
        sidebarContent = React.createElement('div', {}, 'loading...');

      } else {

        dataNetwork = this.props.networks[network];
        marketHashSelected = (self.state.marketHash !== null)? self.state.marketHash : ((dataNetwork.sortedMarketKeys.length > 0) && dataNetwork.sortedMarketKeys[0]);
        var dateBlock = dataNetwork.blockHeader && utils.dateFromUTCSeconds(dataNetwork.blockHeader.timestamp);

        sidebarContent = (
          React.createElement(React.Fragment, null,

            React.createElement('div', null,
              React.createElement('dl', {className: 'row', style: {lineHeight: 'normal', marginBottom: 0, marginRight: 0}},
                React.createElement('dt', {className: 'col-sm-5'}, 'uptime:'),
                React.createElement('dd', {className: 'col-sm-7', style: {marginBottom: 0}}, intervalString(this.props.uptime)),
                React.createElement('dt', {className: 'col-sm-5'}, 'database running:'),
                React.createElement('dd', {className: 'col-sm-7', style: {marginBottom: 0}},
                  (this.props.dbIsRunning?
                    'yes (' + (
                      (this.props.dbSize > 3*1024*1024) ?
                        Math.floor(this.props.dbSize/(1024*1024)) + 'MB'
                        :
                        Math.floor(this.props.dbSize/1024) + 'KB'
                    ) +
                    ')'
                    :
                    'no (only available with nodejs)'
                  )
                )
              )
            ),

            React.createElement('ul', {className: 'nav nav-tabs'},
              networksSorted.map(function(netw){
                return React.createElement(NetworkTab, {
                  key: netw,
                  network: netw,
                  selected: netw === network,
                  clickNetwork: self.clickNetwork
                });
              })
            ),
            'web3 provider status: ' + (dataNetwork.web3Connected? 'connected' : 'not connected'),
            React.createElement('br', null),
            'pubsub status: ' + dataNetwork.pubsubFeedbackMsg,
            React.createElement('br', null),
            'pubsubMessageCount: ' + dataNetwork.pubsubMessageCount,
            React.createElement('br', null),
            'accounts: ' + dataNetwork.accounts.map(function(x){return x.address;}).join(', '),
            React.createElement('br', null),
            'contractAddresses: ' + dataNetwork.contractAddresses.join(', '),
            React.createElement('br', null),
            'last block number: ' + (dataNetwork.blockHeader? dataNetwork.blockHeader.number : '???'),
            React.createElement('br', null),
            'last block (local): ' + (dateBlock ? digioptionsTools.dateStringLocalTZ(dateBlock) : '-'),
            React.createElement('br', null),
            'last block (UTC): ' + (dateBlock ? digioptionsTools.dateStringUTCTZ(dateBlock) : '-'),
            React.createElement('nav', {className: 'nav nav-pills flex-column'},
              dataNetwork.sortedMarketKeys.map(function (marketHash){
                return React.createElement(MarketViewHeadWrapped, {
                  key: marketHash,
                  network: network,
                  marketHash: marketHash,
                  marketProps: dataNetwork.marketProps[marketHash],
                  selected: marketHash === marketHashSelected,
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
            marketHashSelected &&
            React.createElement('div', {key: marketHashSelected, className: 'card tab-pane active'},
              React.createElement(marketView.MarketViewMain, dataNetwork.marketProps[marketHashSelected])
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

    self.componentDidMount = function() {
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
            top: 56,
            zIndex: 1600,
            backgroundColor: '#fff',
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
          React.createElement('a', {className: 'd-none d-sm-block', href: 'https://github.com/berlincode/digioptions-trader.js'},
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

