#!/usr/bin/env node
// vim: sts=2:ts=2:sw=2
/* eslint-env node, es6 */
/* eslint no-console: ["error", { allow: ["log", "warn", "error"] }] */

var hostDefault = '127.0.0.1'; // only accessible via loopback device (localhost)
//var hostDefault = '0.0.0.0'; // Attention: this might be expose data to others on the network

var WebSocketServer = require('ws').Server,
  path = require('path'),
  http = require('http'),
  auth = require('basic-auth'),
  fs = require('fs'),
  url = require('url'),
  os = require('os'),
  jwt = require('jsonwebtoken'),
  argv = require('minimist')(process.argv.slice(2)),
  db = require('./js/db.js');

require('digioptions-tools.js/js/strophe_node_polyfills.js');

var clientRequireConfig = {
  paths: {
    'web3': 'js/web3.min',
    'web3-utils': 'js/web3-utils.min',
    'web3-core-method': 'js/web3-core-method.min',
    'eth-lib/lib/account': 'js/eth-lib-account.min',

    // following is imported from node_modules folder
    'react': 'node_modules/react/umd/react.production.min',
    'ReactDOM': 'node_modules/react-dom/umd/react-dom.production.min',
    'factsigner': 'node_modules/factsigner/js/index',
    'strophe.js': 'node_modules/strophe.js/strophe',
    'digioptions-tools.js': 'node_modules/digioptions-tools.js/js/index',
    'pubsub': 'node_modules/digioptions-tools.js/js/pubsub',
    'offer_normalize': 'node_modules/digioptions-tools.js/js/offer_normalize',
    'provider_retry_wrapper': 'node_modules/digioptions-tools.js/js/provider_retry_wrapper',
    'data_networks': 'node_modules/digioptions-tools.js/js/data_networks',
    'data_digioptions': 'node_modules/digioptions-tools.js/js/data_digioptions',
    'data_networks_utils': 'node_modules/digioptions-tools.js/js/data_networks_utils',
    'data_config': 'node_modules/digioptions-tools.js/js/data_config',
    'xhr-request-promise': 'node_modules/digioptions-tools.js/js/xhr-request-promise.min',
    'quote_provider': 'node_modules/digioptions-tools.js/js/quote_provider',
    'strophe.pubsub': 'node_modules/digioptions-tools.js/js/strophe.pubsub',

    'digioptions_markets_abi': 'node_modules/digioptions-contracts.js/dist/umd/digioptions_markets_abi',
    'digioptions_market_lister_abi': 'node_modules/digioptions-contracts.js/dist/umd/digioptions_market_lister_abi'
  },
  packages: [
    {
      name: 'factsigner',
      location: 'node_modules/factsigner',
      main: 'js/index.js'
    },
    {
      name: 'digioptions-contracts.js',
      location: 'node_modules/digioptions-contracts.js',
      main: 'dist/umd/index.js'
    }
  ]
};

var clientSetupStr = `
  require(
    [
      'js/components/main_view',
      'react',
      'ReactDOM'
    ],
    function(
      mainView,
      React,
      ReactDOM
    ) {
      main_wrapper(mainView, React, ReactDOM);
    }
  );
`;

var getHtmlPage = function(versionString, port, clientSetupStr, token){
  return `<!DOCTYPE html>
<html dir="ltr" lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>digioptions-trader.js</title>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <link rel="stylesheet" href="node_modules/bootstrap/dist/css/bootstrap.min.css" />
    <link rel="icon" href="data:;base64,iVBORw0KGgo="/>

    <script type="text/javascript" src="node_modules/requirejs/require.js"></script>

</head>
<body>
    <div id="content" style="word-wrap: break-word">loading ...</div>

    <script type="text/javascript">
//<![CDATA[

var main_wrapper = function(mainView, React, ReactDOM){
(function(host, token) {
var args = (function(){
  // parse browser's query string append parameters
  var args = {};
  var query = window.location.search.replace(/^\\?/, '');
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    args[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
  }
  return args;
})();

// initial render
var elmContent = document.getElementById('content');
ReactDOM.render(React.createElement(mainView.MonitorView, {}, null), elmContent);
var elm_navbar_text = document.getElementById('navbar-text');
elm_navbar_text.appendChild(document.createTextNode('${versionString} / '));

var span1 = document.createElement('span');
span1.textContent = 'status: ';
span1.setAttribute('class', 'd-none d-lg-inline');
elm_navbar_text.appendChild(span1);

var elm_status = document.createElement('span');
elm_status.textContent = 'not connected';
elm_navbar_text.appendChild(elm_status);

var connect = function(){
  var connection = new WebSocket(host);

  var set_status = function(text, style){
    if (elm_status.innerText) {
      elm_status.innerText = text;
    }
    else if (elm_status.textContent) {
      elm_status.textContent = text;
    }
    elm_status.style = 'padding: 0 0.6em;' + style;
  };

  connection.onmessage = function (message) {
    set_status('connected', 'background-color: #6cc946;');

    var props = JSON.parse(message.data);
    ReactDOM.render(React.createElement(mainView.MonitorView, props, null), elmContent);
  };

  connection.onclose = function() {
    set_status('not connected !', 'background-color: #c94650;');
    //try to reconnect in 3 seconds
    setTimeout(function(){connect();}, 3000);
  };
  connection.onopen = function() {

    connection.send(
      JSON.stringify({
        type: 'authenticate',
        payload: {token: token}
      })
    );

  };

  // set initial default
  set_status('not connected !', 'background-color: #c94650;');
};
connect();
})('ws://' + window.location.hostname + ':${port}/', '${token}');

};

if ((typeof require !== 'undefined') && (typeof require.config !== 'undefined')){
  // modify jsExtRegExp (orig: /^\/|:|\?|\.js$/) so that we may use 'paths' even for modules
  // ending with '.js' like strophe.js
  require.jsExtRegExp = /^\\/|:|\\?/;
  // use 'paths' so that we can use modules directly from node_modules directory
  require.config(${JSON.stringify(clientRequireConfig)});

  ${clientSetupStr}
}
//]]>
    </script>
</body>
</html>
`;
};

var serveStatic = function(pathname, response, httpRoot){
  var pathname_abs = path.resolve(path.join(httpRoot, pathname));

  var extname = path.extname(pathname_abs);
  var contentType = 'text/html';
  switch (extname) {
  case '.js':
    contentType = 'text/javascript';
    break;
  case '.css':
    contentType = 'text/css';
    break;
  case '.json':
    contentType = 'application/json';
    break;
  case '.png':
    contentType = 'image/png';
    break;
  case '.jpg':
    contentType = 'image/jpg';
    break;
  }

  fs.readFile(pathname_abs, function(error, filecontent) {
    if (error) {
      if(error.code == 'ENOENT'){
        response.writeHead(404);
        response.end('Not Found');
      }
      else {
        response.writeHead(500);
        response.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    }
    else {
      response.writeHead(200, {'Content-Type': contentType});
      response.end(filecontent, 'utf-8');
    }
  });
};


class RequestRouter {
  constructor() {
    this.routes = [];
  }

  route (routeRegExp, func){
    this.routes.push({routeRegExp: routeRegExp, func: func});
  }

  handleRequest (request, response) {
    var pathname = url.resolve('/', url.parse(request.url).pathname);
    for (var i=0; i < this.routes.length ; i++){
      var match = pathname.match(this.routes[i].routeRegExp);

      if (match){
        if (this.routes[i].func(pathname, request, response, match))
          return;
      }
    }
    // return error
    response.writeHead(404);
    response.end('Not Found');
  }
}

class Server {
  constructor(versionString, httpRoot, clientSetupStr, port, host) {
    this.versionString = versionString;
    this.httpRoot = httpRoot;
    this.clientSetupStr = clientSetupStr;

    this.port = port;
    this.host = host;

    //this.core;
    //this.sockets = {};
    this.requestRouter = new RequestRouter();
  }

  start () {
    var core;
    var sockets = [];
    var that = this;
    const config = require('./js/config.js');

    // validate credentials
    this.requestRouter.route(
      /.?/,  // matches always
      function(pathname, request, response){
        if (config.basicAuth.enabled){
          // ensure that we have valid credentials
          if (! config.basicAuth.jwtSecret){
            response.writeHead(500);
            response.end('config error: basicAuth enabled but jwtSecret not set');
            return true;
          }
          var credentials = auth(request);
          if (!credentials || (config.basicAuth.users[credentials.name] !== credentials.pass)) {
            response.statusCode = 401;
            response.setHeader('WWW-Authenticate', `Basic realm="${config.basicAuth.realm}"`);
            response.end('Access denied');
            return true;
          }
        }
        return false; // no response sent
      }
    );

    // serve html page
    this.requestRouter.route(
      /^\/$/,
      (function (pathname, request, response) {
        var credentials = auth(request);
        var token = '';
        if (config.basicAuth.enabled){
          token = jwt.sign({name: credentials.name}, config.basicAuth.jwtSecret, {expiresIn: config.basicAuth.jwtExpiresIn});
        }
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end(getHtmlPage(this.versionString, this.port, this.clientSetupStr, token), 'utf-8');
        return true;
      }).bind(this)
    );

    // serve static files
    this.requestRouter.route(
      /^\/(node_modules|js\/components|img)\//,
      function(pathname, request, response){
        serveStatic(pathname, response, that.httpRoot);
        return true;
      }
    );

    this.requestRouter.route(
      /^\/data.json/,
      function(pathname, request, response){
        var data = core.stateToProps();

        response.writeHead(200, {'Content-Type': 'application/json'});
        response.end(JSON.stringify(data));
        return true;
      }
    );


    var server = http.createServer(
      this.requestRouter.handleRequest.bind(this.requestRouter)
    ).listen(this.port, this.host);

    var server_ws = new WebSocketServer({server});

    var socket_enable = function(socket){
      sockets.push(socket);

      // send first update immediately
      socket.send(JSON.stringify(core.stateToProps()));
    };

    server_ws.on('connection', function(connection) {

      connection.on('message', function(message){

        try {
          var data = JSON.parse(message);
          if (data.type === 'authenticate') {

            if (config.basicAuth.enabled){
              jwt.verify(data.payload.token, config.basicAuth.jwtSecret, function (err, decoded) {

                if ((! err) && (decoded.name) && config.basicAuth.users[decoded.name]){
                  socket_enable(connection);
                  //console.log('auth success');
                }
              });
            } else {
              // no authentication necessary
              socket_enable(connection);
            }
          }
        } catch(err) {
          console.log('error' , err);
        }
      });

      connection.on('close', function () {
        try {
          //console.log('Socket closed!');
          for (var i = 0; i < sockets.length; i++) {
            if (sockets[i] == connection) {
              sockets.splice(i, 1);
              //console.log('Removing socket from collection. Collection length: ' + Object.keys(sockets).length);
              break;
            }
          }
        }
        catch (e) {
          //console.log(e);
        }
      });

    });


    var contentUpdated = function(/*network*/){

      var props = core.stateToProps();

      //console.log('Sending data...');
      for(var i=0;i<sockets.length;i++)
      {
        try {
          sockets[i].send(JSON.stringify(props));
        }
        catch (e)
        {
          console.log(e);
        }
      }
    };

    // now start all networks
    const main = require('./js/main.js');
    core = new main.Core(contentUpdated);
    core.start();
  }

}

var printInterfaces = function(port, host) {
  console.log('serving on:');

  if (host !== '0.0.0.0') {
    console.log('  http://' + host + ':' + port.toString());
  }
  else {
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (dev) {
      ifaces[dev].forEach(function (details) {
        if (details.family === 'IPv4') {
          console.log('  http://' + details.address + ':' + port.toString());
        }
      });
    });
  }
};

var setup = function(dbFilename, versionString, httpRoot, clientSetupStr) {
  db.basenameSet(dbFilename);
  db.basedirSet('./');
  db.versionSet(versionString);

  return db.setup(db.basedirGet() + '/' + db.basenameGet())
    .then(function() {
      var port = argv.port || 8888;
      var host = argv.host || hostDefault;
      var server = new Server(
        versionString,
        httpRoot,
        clientSetupStr,
        port,
        host
      );
      server.start();
      printInterfaces(port, host);
      console.log('setup finished. server running.');
    })
    .catch(function(err) {
      console.log('sqlite error (main db):', err.message);
    });
};

if (require.main === module) {

  var pkg = require('./package.json');
  var dbFilename = argv.db || 'trader.db';

  setup(
    dbFilename,
    pkg.version,
    path.normalize(path.resolve(__dirname)),
    clientSetupStr
  );
} else {
  //console.log('required as a module');
  module.exports = {
    Server: Server,
    clientRequireConfig: clientRequireConfig,
    RequestRouter: RequestRouter,
    serveStatic: serveStatic,
    printInterfaces: printInterfaces
  };
}
