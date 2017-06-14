(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([
                "./config",
                "digioptions-tools.js",
                "digioptions-contracts.js",
                "web3",
                "./market"
            ], function (
                config,
                digioptions_tools,
                digioptions_contracts,
                _Web3, /* TODO: quick hack - we use global Web3, because require("web3") returns BigNumber - see https://github.com/ethereum/web3.js/issues/280 */
                Market
            ) { 
                return factory(
                    config, 
                    digioptions_tools,
                    digioptions_contracts,
                    Web3,
                    Market
                    ).main; } );
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS (node and other environments that support module.exports)
        module.exports = factory(
            require('./config.js'),
            require('digioptions-tools.js'),
            require('digioptions-contracts.js'),
            require('web3'),
            require('./market.js')
        ).main;
    } else {
        // Global (browser)
        root.main = factory(
            root.config,
            root.digioptions_tools,
            root.digioptions_contracts,
            root.Web3,
            root.Market
        ).main;
    }
})(this, function(config, digioptions_tools, digioptions_contracts, Web3, Market){
    var PubSub = digioptions_tools.PubSub; 
    var normalize_order = digioptions_tools.normalize_order;
    var web3_was_injected;

    var main = function(shouldRender, updateContent){

        var pubsub_message_count = 0;
        var pubsub_feedback_msg = "???";
        var pubsub_feedback_col = "#000000";
        var pubsub_feedback_connection_ok = false;
        var start_time = new Date();
        var markets = {};
        var web = {}; // contains web3 for each network

        // setup web3
        // TODO
//        if (typeof web3 !== 'undefined') {
//            web3 = new Web3(web3.currentProvider);
//            web3_was_injected = true;
//        } else {
            // set the provider you want from Web3.providers
//            web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
            config.networks.forEach(function (network){
                web[network] = new Web3(new Web3.providers.HttpProvider(digioptions_tools.data_networks[network].provider));
//            web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten-lb.ether.camp"));
            });
            web3_was_injected = false;
//            web3 = new Web3(new Web3.providers.HttpProvider(digioptions_tools.data_networks['ropsten'].provider));
//        }
/*
web3.eth.getBlock(48, function(error, result){
    if(!error)
        console.log(result);
    else
        console.error(error);
});
*/
        var get_sorted_market_keys = function(markets){
            var sortable = [];
            for (var key in markets) {
                sortable.push(key);
            }

            sortable.sort(function(a, b) {
                return markets[b].optionChain.expiration - markets[a].optionChain.expiration;
            });
            return sortable;
        };

        var updateUI = function(){
            // invalidate old content
            this.content = null;
            // signal new content
            contentUpdated();
        };

        var render = function(){
            var uptime_string = (function() {
                var sec_num = Math.floor((new Date() - start_time) / 1000);
                var hours   = Math.floor(sec_num / 3600);
                var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
                var seconds = sec_num - (hours * 3600) - (minutes * 60);

                if (hours   < 10) {hours   = "0"+hours;}
                if (minutes < 10) {minutes = "0"+minutes;}
                if (seconds < 10) {seconds = "0"+seconds;}
                return hours+':'+minutes+':'+seconds;
            })();
            content = (
                "pubsub status: <span>" + pubsub_feedback_msg + "</span><br/>" + 
                "pubsub_message_count: <span>" + pubsub_message_count + "</span><br/>" +
                "web3_was_injected (e.g. Mist or MetaMask): <span>" + web3_was_injected + "</span> (does not work for file:// urls)<br/>" + 
                "uptime: <span>" + uptime_string + "</span><br/>" + 
                "<div></div>"
            );
        };

        var getContent = function(){
            if (content === null)
                render();
            return content;
        };

        var contentUpdated = function(){
            if (! shouldRender()){

                return;
            }
            var content_all = (
                '<div class="container-fluid">' +
                '<div class="row">' +
                '<div class="col-md-6">' +
                '<div class="panel panel-primary">' +
                '<div class="panel-body">' +
                getContent() +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>');

            var sorted_market_keys = get_sorted_market_keys(markets);
            content_all += '<div class="container-fluid">';
            content_all += '<div class="row">';
            content_all += '<div class="col-md-6">';
            content_all += '<ul class="nav nav-pills nav-stacked">';
            sorted_market_keys.forEach(function (marketAddr, idx){
                var market = markets[marketAddr];
                content_all += (
                    '<li role="presentation" class="' + ((idx===0)? 'active': '') + '">' +
                    '<a href="#' + marketAddr + '" data-toggle="tab">' + 
                    '' + marketAddr.substr(0, 12) + '... | ' +
                    'network: ' + market.network + ' | ' +
                    'underlying: ' + market.optionChain.underlying + ' | ' + 
                    'terminated: ' + market.market.isTerminated() + ' | ' +
                    '</a>' + 
                    '</li>'
                ); // TODO escape
            });
            content_all += '</ul>';
            content_all += '</div>';

            content_all += '<div class="col-md-6">';
            content_all += '<div class="tab-content clearfix">';
            sorted_market_keys.forEach(function (marketAddr, idx){
                var market = markets[marketAddr];
                content_all += (
                '<div class="panel panel-default tab-pane' + ((idx===0)? ' active': '') + '" id="' + marketAddr + '">' +
                '<div class="panel-heading">' +
                '<a href="' + digioptions_tools.data_networks[market.network].etherscanAddressUrl.replace('{contractAddr}', marketAddr) + '">' + marketAddr.substr(0,12) + '...</a> | ' +
                market.optionChain.underlying + ' | ' + 
                '<a href="' + digioptions_tools.data_networks[market.network].digioptionsMarketUrl.replace('{marketAddr}', marketAddr) + '">view market</a> | ' +
                '</div>' +
                '<div class="panel-body">' +
                    'Contents for ' + marketAddr + '<br/>' + 
                    markets[marketAddr].market.getContent() +
                '</div>' +
                '</div>');
            }); 
            content_all += '</div>';
            content_all += '</div>';
            content_all += '</div>';

            updateContent(content_all);
        };

        var deleteOldTerminatedMarkets = function(){
            // try to delete old markets
            var sorted_market_keys = get_sorted_market_keys(markets);
            for (var idx in sorted_market_keys){
                // if number is too low a delete market might be restarted
                if ((idx > 30) && (markets[sorted_market_keys[idx]].market.isTerminated())){
                    delete markets[sorted_market_keys[idx]];
                }
            } 
        };

        var getOptionChain = function(network, marketAddr){
            var contract = web[network].eth.contract(digioptions_contracts.digioptions_market_abi).at(marketAddr);
            contract.getOptionChain.call(function(error, result) {
                if(!error){
                    var optionChain = {
                        expiration: result[0],
                        underlying: result[1],
                        margin: result[2],
                        realityID: result[3],
                        factHash: result[4],
                        ethAddr: result[5]
                    };

                    var key = marketAddr.toLowerCase();
                    if (! markets[key]){
//                        console.log("new market (real trigger)", key);
                        markets[key] = {
                            market: new Market(contentUpdated, network, marketAddr, optionChain),
                            network: network, // for display
                            optionChain: optionChain // e.g. for sorting via expiration
                        };
                        contentUpdated(); // to show the new market immediately
                    }
                }else{
                    console.error("error getOptionChain", marketAddr, error);
                }
            });
        };

        var searchMarkets = function(network){
            // check for new markets
            var contractAddr = digioptions_tools.data_networks[network].contractContractsAddr[0]; // TODO

            var contract = web[network].eth.contract(digioptions_contracts.digioptions_contracts_abi).at(contractAddr);
            var now = Math.floor(Date.now() / 1000);
            /* set the seconds so that even on sunday evening  we would see some (closed markets) */
//            console.log("searchMarkets");
            contract.getContracts.call(false, now - 3600 * 74, function(error, result) {
                if(!error){
                    var i;
                    result = result.filter(function(x){return x!='0x0000000000000000000000000000000000000000';});
                    for (i=0 ; i < result.length ; i++){
                        var marketAddr = result[i];
                        var key = marketAddr.toLowerCase();
                        if (! markets[key]){
                            console.log("new market (getOptionChain)", key);
                    
                                getOptionChain(network, marketAddr);
                        }
                    }
                }else{
                    console.error("error getContracts", error);
                }
            });
        };

        var searchMarketsAllNetworks = function(){
            config.networks.forEach(function (network){
                searchMarkets(network);
            });
        };

        searchMarketsAllNetworks();
        setInterval(function(){
            deleteOldTerminatedMarkets();
            searchMarketsAllNetworks();
            }, 20 * 60 * 1000);

        var setupPubsub = function(){
            var pubsub = new PubSub(config.pubsub_protocol, config.pubsub_host);

//            pubsub.debug = true;

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
        //            var p = $("<p>").text(JSON.stringify(data[i]));
        //            $('#message').append(p);
//                    console.log("xx", data[i]);
                }
                pubsub_message_count++;
                updateUI();
            };
            pubsub.feedback = function(msg, col, connection_ok){
                pubsub_feedback_msg = msg;
                pubsub_feedback_col = col;
                pubsub_feedback_connection_ok = connection_ok;
                updateUI();
            };

            pubsub.connect();
        };

        setupPubsub();

        setInterval(
            function(){
                // this refreshes the 'uptime' fiels to show that everything is running
                updateUI();
            },
            10000
        );
    };
    
    return {'main': main};
});

