// vim: sts=2:ts=2:sw=2
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(
      [
        './config',
        'digioptions-tools.js',
        'digioptions-contracts.js',
        './utils',
        'web3',
        './market'
      ], function (
        config,
        digioptionsTools,
        digioptionsContracts,
        utils,
        Web3,
        Market
      ) {
        return factory(
          config,
          digioptionsTools,
          digioptionsContracts,
          utils,
          //root.Web3 /* TODO: quick hack for web3 before 1.0 - we use global Web3, because require('web3') returns BigNumber - see https://github.com/ethereum/web3.js/issues/280 */
          Web3,
          Market
        ); } );
  } else if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (node and other environments that support module.exports)
    module.exports = factory(
      require('./config.js'),
      require('digioptions-tools.js'),
      require('digioptions-contracts.js'),
      require('./utils.js'),
      require('web3'),
      require('./market.js')
    );
  } else {
    // Global (browser)
    root.main = factory(
      root.config,
      root.digioptionsTools,
      root.digioptionsContracts,
      root.utils,
      root.Web3,
      root.Market
    );
  }
})(this, function(config, digioptionsTools, digioptionsContracts, utils, Web3, Market){
  var PubSub = digioptionsTools.PubSub;
  //var normalize_order = digioptionsTools.normalize_order;

  var getDigioptionsUrlMarket = digioptionsTools.data_networks_utils.getDigioptionsUrlMarket;
  var getEtherscanUrlContract = digioptionsTools.data_networks_utils.getEtherscanUrlContract;
  //var getEtherscanUrlTx = digioptionsTools.data_networks_utils.getEtherscanUrlTx;

  function Monitor(contentUpdated, network){
    this.network = network;
    var that = this;

    var data_network = digioptionsTools.data_networks[network];

    this.pubsub_message_count = 0;
    this.pubsub_feedback_msg = '???';
    this.pubsub_feedback_col = '#000000';
    this.pubsub_feedback_connection_ok = false;
    this.start_time = new Date();
    this.markets = {};
    this.blockNumber = undefined;
    this.pubsub = undefined;
    var web = {}; // contains web3 for each network

    this.content = null;


    var web3 = new Web3(digioptionsTools.getProvider(Web3, data_network));


    this.get_sorted_market_keys = function(markets){
      var sortable = [];
      for (var key in markets) {
        sortable.push(key);
      }

      sortable.sort(function(a, b) {
        return markets[b].optionChain.expiration - markets[a].optionChain.expiration;
      });
      return sortable;
    };

    this.updateUI = function(){
      // invalidate old content
      this.content = null;
      // signal new content
      contentUpdated();
    };

    this.render = function(){
      var uptime_string = (function() {
        var sec_num = Math.floor((new Date() - that.start_time) / 1000);
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = '0'+hours;}
        if (minutes < 10) {minutes = '0'+minutes;}
        if (seconds < 10) {seconds = '0'+seconds;}
        return hours+':'+minutes+':'+seconds;
      })();
      this.content = (
        'pubsub status: <span>' + this.pubsub_feedback_msg + '</span><br/>' +
        'pubsub_message_count: <span>' + this.pubsub_message_count + '</span><br/>' +
        'uptime: <span>' + uptime_string + '</span><br/>' +
        '<div></div>'
      );
    };

    this.getContent = function(){
      if (this.content === null)
        this.render();

      var content_all = (
        navTabs(network) +
        '<div class="container-fluid">' +
        '<div class="row">' +
        '<div class="col-md-6">' +
        '<div class="panel panel-primary">' +
        '<div class="panel-body">' +
        that.content +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>');

      var sorted_market_keys = that.get_sorted_market_keys(that.markets);
      content_all += '<div class="container-fluid">';
      content_all += '<div class="row">';
      content_all += '<div class="col-md-6">';
      content_all += '<ul class="nav nav-pills nav-stacked">';
      sorted_market_keys.forEach(function (factHash, idx){
        var market = that.markets[factHash];
        content_all += (
          '<li role="presentation" class="' + ((idx===0)? 'active': '') + '">' +
          '<a href="#' + factHash + '" data-toggle="tab">' +
          market.market.getHeading() +
          '</a>' +
          '</li>'
        ); // TODO escape
      });
      content_all += '</ul>';
      content_all += '</div>';

      content_all += '<div class="col-md-6">';
      content_all += '<div class="tab-content clearfix">';
      sorted_market_keys.forEach(function (factHash, idx){
        var market = that.markets[factHash];
        var url_market = getDigioptionsUrlMarket(network,  market.marketsAddr, factHash);
        var url_contract = getEtherscanUrlContract(network, market.marketsAddr);

        content_all += (
          '<div class="panel panel-default tab-pane' + ((idx===0)? ' active': '') + '" id="' + factHash + '">' +
          '<div class="panel-heading">' +
          (url_contract?
            ('<a href="' + url_contract + '">' + factHash.substr(0,12) + '...</a> | ')
            :
            ''
          ) +
          market.optionChain.underlying + ' | ' +
          (url_market?
            ('<a href="' + url_market + '">view market</a> | ')
            :
            ''
          ) +
          '</div>' +
          '<div class="panel-body">' +
          'Contents for ' + factHash + '<br/>' +
          that.markets[factHash].market.getContent() +
          '</div>' +
          '</div>'
        );
      });
      content_all += '</div>';
      content_all += '</div>';
      content_all += '</div>';

      return content_all;
    };

    this.deleteOldTerminatedMarkets = function(){
      var now = Math.floor(Date.now() / 1000);

      // try to delete old markets
      var sorted_market_keys = this.get_sorted_market_keys(this.markets);
      for (var idx in sorted_market_keys){
        // if number is too low a delete market might be restarted
        var market_key = sorted_market_keys[idx];
        var market = this.markets[market_key]; // TODO marketinfo
        if (
          (idx >= config.marketsKeepMin) &&
          market.market.isTerminated() &&
          (market.optionChain.expiration < now - config.marketsDeleteExpiredSeconds) &&
          market.expired
        ){
          delete this.markets[market_key];
        }
      }
    };

    this.orderBookPublish = function(data_array){
      if (that.pubsub){
        that.pubsub.publish(data_array);
      }
    };

    that.setupMarket = function(marketsAddr, factHash){
      var contract = new web3.eth.Contract(digioptionsContracts.digioptions_markets_abi, marketsAddr);

      contract.methods.getMarketBaseData(factHash).call(function(error, result) {
        /*

      var contract = web[network].eth.contract(digioptionsContracts.digioptions_markets_abi).at(factHash);
      contract.getMarketBaseData.call(function(error, result) {
      */
        if(!error){
          var optionChain = {
            expiration: result[0],
            underlying: result[1],
            margin: result[2],
            realityID: result[3],
            factHash: result[4],
            ethAddr: result[5]
          };

          contract.methods.expired(factHash).call(function(error2, expired) {
            if(!error){

              var key = factHash.toLowerCase();
              if (! that.markets[key]){
                //console.log('new market (real trigger)', key);
                that.markets[key] = {
                  market: new Market(
                    that.updateUI,
                    web[network],
                    network,
                    data_network.chainID,
                    //config.accounts[network],
                    contract,
                    factHash,
                    optionChain,
                    expired,
                    that.blockNumber, // current blockNumber
                    that.orderBookPublish
                  ),
                  contract: contract,
                  optionChain: optionChain, // e.g. for sorting via expiration
                  expired: expired,
                  marketsAddr: marketsAddr,
                  orderCache: {}
                };
                that.updateUI(); // to show the new market immediately

                if (! that.markets[key].market.isTerminated()){
                  //that.pubsub = that.setupPubsub();
                }
              }
            }
          });
        }else{
          //console.error('error setupMarket', factHash, error);
        }
      });
    };

    this.searchMarkets = function(){

      var now = Math.floor(Date.now() / 1000);
      /* set the seconds so that even on sunday evening  we would see some (closed markets) */

      data_network.marketsAddresses.forEach(function (marketsAddr){

        // check for new markets
        var contract = new web3.eth.Contract(digioptionsContracts.digioptions_markets_abi, marketsAddr);
        // TODO 20 (create config variable)
        contract.methods.getContracts(false, now - config.marketsListExpiredSeconds, 20).call(function(error, result) {
          if(!error){
            var i;
            result = result.filter(function(x){return x!='0x0000000000000000000000000000000000000000';});
            for (i=0 ; i < result.length ; i++){
              var factHash = result[i];
              var key = factHash.toLowerCase();
              if (! that.markets[key]){
                //console.log('new market (getMarketBaseData)', key);
                that.setupMarket(marketsAddr, factHash);
              }
            }
          }else{
            //console.error('error getContracts', error);
          }
        });
      });
    };

    this.setupPubsub = function(){
      var pubsub = new PubSub(config.pubsub_protocol, config.pubsub_host);

      //          pubsub.debug = true;

      //    $('#publish').click(function(event) {
      //        event.preventDefault();
      //        var data_array = [];
      //        try {
      //            data_array.push(JSON.parse($('#message0').val()));
      //        } catch (e) {}
      //        try {
      //            data_array.push(JSON.parse($('#message1').val()));
      //        } catch (e) {}
      //        if (data_array.length > 0)
      //            pubsub.publish(data_array);
      //    });

      pubsub.on_data = function(data){
        var i;
        for (i=0 ; i < data.length ; i++){
          var order = data[i];
          order = digioptionsTools.normalize_order(order);
          if (order) {
            var key = digioptionsTools.orderUniqueKey(order);
            var market = that.markets[order.contractAddr];
            if (! this.market){
              console.log('no such market', order.contractAddr);
              continue;
            }

            console.log(order);

            if (key in market.orderCache){
              console.log('already chached');
              continue;
            }
            //TODO
            //(this.markets[sorted_market_keys[idx]].market.isTerminated())){

            if (utils.verifyOrder(order)){
              //market.orderCache[key] = order;
              that.pubsub_message_count++;
              //console.log('ok', that.pubsub_message_count);
            }else{
              console.log('error in order verification:', order);
            }
          }
        }
        that.updateUI();
      };
      pubsub.feedback = function(msg, col, connection_ok){
        this.pubsub_feedback_msg = msg;
        this.pubsub_feedback_col = col;
        this.pubsub_feedback_connection_ok = connection_ok;
        this.updateUI();
      }.bind(this);
      //pubsub.disconnect = function(){
      //  that.pubsub = undefined;
      //};

      pubsub.connect();
      return pubsub;
    };

    this.checkExpired = function() {
      //console.log('checkExpired', network);
      var sorted_market_keys = that.get_sorted_market_keys(that.markets);
      sorted_market_keys.forEach(function (factHash){
        var market = that.markets[factHash];
        // TODO rename marketDetails
        if (! market.expired) {
          market.contract.methods.expired(factHash).call(function(error, expired) {
            //console.log('xxxx', factHash, error, expired);
            if(!error){
              sorted_market_keys.forEach(function (factHash){
                var key = factHash.toLowerCase();
                var market = that.markets[key];
                if (expired && (! market.expired)){
                  // expire
                  market.expired = true;
                  market.market.expire();
                }
              });
            }
          });
        }
      });
    };

    this.updateBlockNumbers = function() {
      web3.eth.getBlockNumber(function(err, blockNumber){
        if (!err) {
          // TODO remove
          if (!that.blockNumber)
            that.startSearchMarkets();

          if (that.blockNumber !== blockNumber){

            that.blockNumber = blockNumber;
            var sorted_market_keys = that.get_sorted_market_keys(that.markets);
            sorted_market_keys.forEach(function (factHash){
              var market = that.markets[factHash];
              if (! market.market.isTerminated())
                market.market.updateBlockNumber(blockNumber);
            });
          }
          //console.log('blockNumber network', network, blockNumber);
          //that.pubsub = that.setupPubsub();
        } else {
          console.log('error blockNumber network', network);
        }
      });
    };

    this.startSearchMarkets = function(){
      this.searchMarkets();
      setInterval(
        function(){
          this.deleteOldTerminatedMarkets();
          this.searchMarkets();
          this.checkExpired();
        }.bind(this),
        5 * 60 * 1000 /* every 5 minutes */
      );
    };

    this.start = function() {
      this.pubsub = this.setupPubsub();
      this.updateBlockNumbers();


      setInterval(
        function(){
          // this refreshes the 'uptime' fiels to show that everything is running
          that.updateUI();

          that.updateBlockNumbers();
        }.bind(this),
        10000
      );
    };
  }

  function navTabs (network){
    return (
      '<ul class="nav nav-tabs">' +
      config.networks.map(function(netw){
        return '<li class="' + (netw===network? 'active': '') + '"><a href="?network=' + netw + '">' + netw + '</a></li>';
      }).join('') +
      '</ul>');
  }

  function networkConfigured(network){
    network = network || config.networks[0];
    if (config.networks.indexOf(network) !== -1)
      return network;
    return undefined;
  }

  return {
    'Monitor': Monitor,
    'navTabs': navTabs,
    'networkConfigured': networkConfigured
  };
});

