// vim: sts=2:ts=2:sw=2
/*
    This program is distributed under the terms of the MIT license.
    Please see the LICENSE file for details.

    Copyright (c) digioptions.com (http://www.digioptions.com) 
*/

/** File: pubsub.js
 *  A helper to access the digioptions.com xmmp server
 */
(function (root, factory) {
  if ( typeof define === 'function' && define.amd ) {
    // AMD
    define(['./strophe.pubsub'], function (Strophe) { return factory(Strophe.Strophe).PubSub; } );

  } else if ( typeof module !== 'undefined' && module.exports ) {
    // Node and other environments that support module.exports.
    var Strophe = require('./strophe.pubsub.js');
    module.exports = factory(Strophe.Strophe).PubSub;
  } else {
    // Browser.
    root.PubSub = factory(window.Strophe).PubSub;
  }
})(this, function(Strophe){

  function PubSub(protocol, xmpp_server){
    'use strict';

    if (typeof window.WebSocket !== 'function')
      // downgrade to BOSH
      protocol = protocol.replace('wss', 'https').replace('ws', 'http');

    if ((protocol === 'ws') || (protocol === 'wss'))
      this.service = protocol + '://' + xmpp_server + ':5280/websocket';
    else /* http/https */
      this.service = protocol + '://' + xmpp_server + ':5280/http-bind';

    this.jid = 'anon@' + xmpp_server;
    this.password = 'password';
    this.pubsub_node = '/v1/ropsten/0x0000000000000000000000000000000000000000';

    this.connection = null;
    this.connection_ok = false;

    this.debug = false;
    //this.debug = true;
    this.show_log = false;
    //this.show_log = true;

    this.reconnectInterval = 3000;
  }

  // log to console if available
  PubSub.prototype.log = function(msg)
  {
    if (this.show_log && window.console) { console.log(msg); }
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
  PubSub.prototype.publish = function(data)
  {
    if (data.message === '') return;

    var entry = Strophe.xmlElement('entry', []);
    var t = Strophe.xmlTextNode(JSON.stringify(data));
    entry.appendChild(t);

    this.connection.pubsub.publish(
      this.pubsub_node,
      [{data: entry}],
      function(data){return this.on_send(data);}.bind(this)
    );
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
      console.log('on_subscribe_error', sub);
  };

  PubSub.prototype.on_subscribe = function(/* sub */)
  {
    this.connection_ok = true;

    // TODO connection_ok should be set AFTER all items are received
    this.connection.pubsub.items(
      this.pubsub_node,
      /* success */
      function(message){return this.on_items_event(message);}.bind(this),
      /* error */
      function(sub){
        console.log('items error', sub); // TODO handle
      }.bind(this)
    );

    this.feedback_intern('Connected', '#00FF00', this.connection_ok);

    return true;
  };

  PubSub.prototype.on_connect = function(status)
  {
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

      // always trigger reconnect
      setTimeout(
        function(){return this.connect();}.bind(this),
        this.reconnectInterval
      );

    } else if (status == Strophe.Status.CONNECTED) {
      this.feedback_intern('Connecting... (2 of 2)', '#009900', this.connection_ok);
      this.connection.pubsub.subscribe(
        this.pubsub_node,
        [],
        function(message){return this.on_subscribe_event(message);}.bind(this),
        function(sub){this.on_subscribe(sub);}.bind(this),
        function(sub){this.on_subscribe_error(sub);}.bind(this)
      );
    }

    return true;
  };

  PubSub.prototype.connect = function()
  {
    if (this.debug){
      Strophe.log = function (level, msg) {this.log('Strophe.log: ' + msg);}.bind(this);
    }

    this.connection = new Strophe.Connection(this.service);

    if (this.debug){
      this.connection.rawInput = function(data){if (window.console) console.log('RX: ' + data);};
      this.connection.rawOutput = function(data){if (window.console) console.log('Tx: ' + data);};
    }

    this.connection.connect(
      this.jid,
      this.password,
      function(status){this.on_connect(status);}.bind(this)
    );
  };

  return {'PubSub': PubSub};
});
