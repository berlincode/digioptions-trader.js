(function (root, factory) {
    if ( typeof define == 'function' && define.amd ) {
        // AMD
        define( function () { return factory().config; } );

    } else if ( typeof module != 'undefined' && module.exports ) {
        // Node and other environments that support module.exports
        module.exports = factory().config;

    } else {
        // Browser
        root.config = factory().config;
    }
})(this, function(){

    var config = {
        "networks": ["ropsten"],

//        pubsub_protocol: 'ws', /* websocket push */
        //pubsub_protocol: 'http', /* http bosh */
//        pubsub_host: 'ulf',
        // TODO
        pubsub_protocol: 'ws', /* websocket */
//        pubsub_host: 'xmpp.digioptions.com',
        pubsub_host: 'xmpp_ropsten.digioptions.com',

        wallets: {
            "ropsten": [
                {
                    ethAddr: null,
                    ethAddrPrivateKey: null,
                }
            ]
        },
        
        // optional basic authentication for nodejs server
        basicAuth:{
            enabled: false,
            name: "digi", // username
            pass: "options" // password
        }

    };
    
    return {'config': config};
});
