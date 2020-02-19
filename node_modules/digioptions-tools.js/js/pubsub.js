// vim: sts=2:ts=2:sw=2
/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright (c) digioptions.com (https://www.digioptions.com)
*/

/**
 * A helper to access the digioptions.com xmmp server
 */
(function (root, factory) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define(
      [
        './data_networks_utils',
        './strophe.pubsub'
      ], function (
        data_networks_utils,
        Strophe
      ) {
        return factory(
          data_networks_utils,
          Strophe.Strophe
        ).PubSub;
      });

  } else if ( typeof module !== 'undefined' && module.exports ) {
    // Node and other environments that support module.exports
    module.exports = factory(
      require('./data_networks_utils'),
      require('./strophe.pubsub.js').Strophe
    ).PubSub;
  } else {
    // Browser
    root.PubSub = factory(
      root.data_networks_utils,
      root.Strophe
    ).PubSub;
  }
})(this, function(data_networks_utils, Strophe){

  function PubSub(network){
    'use strict';

    this.services_all = undefined;

    if (typeof WebSocket === 'function') {
      // defaults are websockets
      this.services_all = data_networks_utils.getXmppUrlsWebsocket(network);
    }

    // BOSH does currently not work
    //if ((this.services_all === null) || (typeof(this.services_all) === 'undefined') || (this.services_all.length === 0)) {
    //  // downgrade to BOSH
    //  this.services_all = data_networks_utils.getXmppUrlsHttpBind(network);
    //}

    if ((this.services_all === null) || (typeof(this.services_all) == 'undefined') || (this.services_all.length === 0)) {
      // no connection possible
      throw new Error('no valid xmpp service url found');
    }

    // we use the first service found for now ...
    this.service = this.services_all[0];

    var jidPassword = data_networks_utils.getXmppJidPassword(network);
    this.jid = jidPassword[0];
    this.password = jidPassword[1];

    this.network = network;
    this.nodes_subscribe = [];

    this.connection = null;
    this.connection_ok = false;
    this.autoReconnect = false;

    this.debug = false;
    //this.debug = true;
    this.show_log = false;
    //this.show_log = true;

    this.reconnectInterval = 3000;
    this.reconnectTimer = null;
  }

  // log to console if available
  PubSub.prototype.log = function(msg)
  {
    if (this.show_log) {console.log(msg);}
  };

  // simplify connection status messages
  PubSub.prototype.feedback = function(/* msg, col, connection_ok */)
  {
  };

  PubSub.prototype.feedback_intern = function(msg, col, connection_ok)
  {
    this.log('pubsub feedback: ' + msg);
    this.feedback(msg, col, connection_ok);
  };

  // decide what to do with an incoming message
  PubSub.prototype.on_data = function(/* data */)
  {
  };

  // called when data is deemed as sent
  PubSub.prototype.on_send = function(/* data */)
  {
    return true;
  };

  // push the data to the clients
  PubSub.prototype.publish = function(data, marketsAddr, marketHash)
  {
    if (data.message === '') return;

    var pubsub_node_path = data_networks_utils.getXmppPubsubNodePath(
      this.network,
      data_networks_utils.normalizeContractAddr(marketsAddr),
      data_networks_utils.normalizeMarketHash(marketHash)
    );

    var entry = Strophe.xmlElement('entry', []);
    var t = Strophe.xmlTextNode(JSON.stringify(data));
    entry.appendChild(t);

    if (! this.connection)
      return false;

    this.connection.pubsub.publish(
      pubsub_node_path,
      [{data: entry}],
      function(data){return this.on_send(data);}.bind(this)
    );
    return true;
  };

  PubSub.prototype.on_items_event = function(message)
  {
    //console.log('on_items_event', message);
    this.on_subscribe_event(message);
  };

  PubSub.prototype.on_subscribe_event = function(message)
  {
    //console.log('on_subscribe_event', message);
    var that = this;
    try{
      Strophe.forEachChild(message, null, function (elem0) {
        if ((elem0.nodeName === 'event') || (elem0.nodeName === 'pubsub')){
          // subscribe event returns top level node 'event' while items returns top
          // level event 'pubsub'
          Strophe.forEachChild(elem0, null, function (elem1) {
            if (elem1.nodeName === 'items'){
              Strophe.forEachChild(elem1, null, function (elem2) {
                if (elem2.nodeName === 'item'){
                  Strophe.forEachChild(elem2, null, function (elem3) {
                    var data_parsed = JSON.parse(elem3.textContent);
                    that.on_data(data_parsed);
                    that.log(data_parsed);
                  });
                }
              });
            }
          });
        }
      });

    } catch(e) {
      this.log('Error in on_subscribe_event(): '+e.message);
    }

    return true;
  };

  PubSub.prototype.on_subscribe_error = function(sub)
  {
    // TODO handle
    if (window.console)
      window.console.log('on_subscribe_error', sub);
  };

  PubSub.prototype.on_subscribe = function( sub, pubsub_node_path )
  {
    // receive all items
    this.connection.pubsub.items(
      pubsub_node_path,
      /* success */
      function(message){return this.on_items_event(message);}.bind(this),
      /* error */
      function(sub){
        if (window.console)
          window.console.log('items error', sub); // TODO handle
      }.bind(this)
    );

    return true;
  };

  PubSub.prototype.connect_intern = function(pubsub_node_path_array){
    for (var i = 0; i < pubsub_node_path_array.length; i++) {
      var pubsub_node_path = pubsub_node_path_array[i];

      this.connection.pubsub.subscribe(
        pubsub_node_path,
        undefined, //[],
        function(sub){this.on_subscribe(sub, pubsub_node_path);}.bind(this),
        function(sub){this.on_subscribe_error(sub);}.bind(this)
      );
    }
  };

  PubSub.prototype.on_connect = function(status)
  {
    try {

      if (status != Strophe.Status.CONNECTED){
        this.connection_ok = false;
      }

      if (status == Strophe.Status.CONNECTING) {
        this.feedback_intern('Connecting... (1 of 2)', '#009900', this.connection_ok);
      } else if (status == Strophe.Status.CONNFAIL) {
        this.feedback_intern('Connection failed', '#FF0000', this.connection_ok);
      } else if (status == Strophe.Status.DISCONNECTING) {
        this.feedback_intern('Disconnecting...', '#CC6600', this.connection_ok);
      } else if (status == Strophe.Status.DISCONNECTED) {
        this.feedback_intern('Disconnected', '#aa0000', this.connection_ok);

        // ensure connection is closed
        this.disconnect_intern();

        // always trigger reconnect
        if (this.reconnectTimer)
          clearTimeout(this.reconnectTimer);

        if (this.autoReconnect){
          this.reconnectTimer = setTimeout(
            function(){return this.connect();}.bind(this),
            this.reconnectInterval
          );
        }

      } else if (status == Strophe.Status.CONNECTED) {
        //this.feedback_intern('Connecting... (2 of 2)', '#009900', this.connection_ok);

        this.connection_ok = true;
        this.feedback_intern('Connected', '#00FF00', this.connection_ok);

        this.connect_intern(this.nodes_subscribe);
      }

    } catch (e){
      if (window.console)
        window.console.log('ERROR: ' + (e.stack ? e.stack : e));
    }

    // Return true to keep calling the callback.
    return true;
  };

  PubSub.prototype.connect = function()
  {
    if (this.debug){
      Strophe.log = function (level, msg) {this.log('Strophe.log: ' + msg);}.bind(this);
    }

    this.connection = new Strophe.Connection(this.service);
    //console.log(this.connection);

    if (this.debug){
      this.connection.rawInput = function(data){console.log('RX: ' + data);};
      this.connection.rawOutput = function(data){console.log('Tx: ' + data);};
    }

    this.autoReconnect = true;
    this.connection.connect(
      this.jid,
      this.password,
      function(status){this.on_connect(status);}.bind(this)
    );

    // add the handler for pubsub messages for ALL nodes
    this.connection.pubsub._connection.addHandler(
      function(message){return this.on_subscribe_event(message);}.bind(this),
      null, // XML NS
      'message', // Name
      null, // Type
      null, // ID
      null // From
    );
  };

  PubSub.prototype.subscribe = function(marketsAddr, marketHash){
    var pubsub_node_path = data_networks_utils.getXmppPubsubNodePath(
      this.network,
      data_networks_utils.normalizeContractAddr(marketsAddr),
      data_networks_utils.normalizeMarketHash(marketHash)
    );
    // node already subscribed?
    if (this.nodes_subscribe.indexOf(pubsub_node_path) >= 0)
      return;

    this.nodes_subscribe.push(pubsub_node_path);
    if (this.connection_ok === true)
      this.connect_intern([pubsub_node_path]);
  };

  PubSub.prototype.disconnect_intern = function()
  {
    var connection = this.connection;
    this.connection = undefined;
    try {
      // Switch to using synchronous requests since this is typically called onUnload.
      //this.connection.options.sync = true;
      //this.connection.flush();
      connection.disconnect();
    } catch(err){
      // empty catch
    }
    this.connection = undefined;
  };

  PubSub.prototype.disconnect = function()
  {
    this.autoReconnect = false;
    this.disconnect_intern();
  };

  return {'PubSub': PubSub};
});
