#!/usr/bin/env node
// vim: sts=2:ts=2:sw=2
/* eslint-env node, es6 */

var trading = function() {

  var Main = require('./js/main.js');
  var config = require('./js/config.js');
  var package = require('./package.json');

  //var host = '127.0.0.1'; // only accessible via loopback device (localhost)
  //var host = '0.0.0.0'; // Attention: this might be expose data to others on the network
  //var host = '192.168.2.110'; // Attention: this might be expose data to others on the network
  var argv = require('minimist')(process.argv.slice(2));
  var port = argv.port || 8888;
  var host = argv.host || '127.0.0.1';

  var canonicalHost = host === '0.0.0.0' ? '127.0.0.1' : host;

  var main;
  var sockets = [];
  var ws = require('websocket.io'),
    http = require('http'),
    auth = require('basic-auth'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    os = require('os'),
    jwt = require('jsonwebtoken');

  var content = 'loading...';

  // TODO fake window.console? 
  // fake browser document and window for strophe.js
  var JSDOM          = require('jsdom').JSDOM;
  document = new JSDOM('test').window.document; // eslint-disable-line no-global-assign
  window = {}; // eslint-disable-line no-global-assign

  // create a XMLHttpRequest object which can parse xml via jsom and sets responseXML
  var XMLHttpRequestOrig = require('xmlhttprequest/lib/XMLHttpRequest.js').XMLHttpRequest;
  var XMLHttpRequest = function () {
    /*  create object with original constructor  */
    var xhr = new XMLHttpRequestOrig();

    var onreadystatechange = null;

    /*  intercept 'open' method to modify onreadystatechange  */
    var open_orig = xhr.open;
    xhr.open = function () {
      onreadystatechange = xhr.onreadystatechange;
      xhr.onreadystatechange = function(){};
      return open_orig.apply(xhr, arguments);
    };

    /*  hook into the processing  */
    var addEventListener_orig = xhr.addEventListener;
    xhr.addEventListener('readystatechange', function () {
      if (xhr.readyState === this.DONE) {

        var JSDOM = require('jsdom').JSDOM;
        var dom = new JSDOM(xhr.responseText, {contentType: 'text/xml'});
        xhr.responseXML = dom.window.document;

        if (onreadystatechange !== null)
          onreadystatechange();
      }
    });

    this.addEventListener = function(event, callback) {
      if (event === 'readystatechange')
        this.onreadystatechange = callback;
      else
        addEventListener_orig(event, callback);
    };

    //var removeEventListener_orig = xhr.addEventListener;
    //this.removeEventListener = function(event, callback) {
    //  if (event !== 'readystatechange')
    //    return removeEventListener_orig(event, callback);

    //  var bool = this.onreadystatechange == callback;
    //  this.onreadystatechange = null;
    //  return bool;
    //};

    /* provide a simple way to control debug messages */
    xhr.debug = false;

    return xhr;
  };
  window.XMLHttpRequest = XMLHttpRequest;
  global.XMLHttpRequest = XMLHttpRequest;

  global.WebSocket = require('ws');
  global.DOMParser = function() {
    'use strict';

    this.parseFromString= function(data, contentType){
      var dom = new JSDOM(data, {contentType: contentType || 'text/xml'});
      return dom.window.document;
    };
  };

  var http_root = (path.normalize(path.resolve(__dirname)));
  var server =  http.createServer(function (request, response) {
    var credentials;
    if (config.basicAuth.enabled){
      if (! config.basicAuth.jwtSecret){
        response.writeHead(500);
        response.end('config error: basicAuth enabled but jwtSecret not set');
        return;
      }
      credentials = auth(request);
      if (!credentials || (config.basicAuth.users[credentials.name] !== credentials.pass)) {
        response.statusCode = 401;
        response.setHeader('WWW-Authenticate', 'Basic realm="digioptions-trader.js"');
        response.end('Access denied');
        return;
      }
    }

    var pathname = url.parse(request.url).pathname;
    var pathname_abs = path.resolve(path.join(http_root, pathname));
    if ((pathname === '/') || (pathname === '/index.html')) {
      var token = '';
      if (config.basicAuth.enabled){
        token = jwt.sign({name: credentials.name}, config.basicAuth.jwtSecret, { expiresIn: config.basicAuth.jwtExpiresIn });
      }
      response.writeHead(200, { 'Content-Type': 'text/html' });
      var html = `<!DOCTYPE html>
<html dir="ltr" lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>digioptions-trader.js</title>
<meta charset=utf-8 />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<script type="text/javascript" src="node_modules/jquery/dist/jquery.min.js"></script>
<script type="text/javascript" src="node_modules/bootstrap/dist/js/bootstrap.min.js"></script>
<link rel="stylesheet" href="node_modules/bootstrap/dist/css/bootstrap.min.css" />
</head>
<body>
<nav class="navbar navbar-default navbar-fixed-top">
    <div class="container-fluid">
        <div class="navbar-header">
            <a class="navbar-brand" href="https://www.digioptions.com">
                <img alt="digioptions.com" style="height: 25px" src="img/digioptions.png" />
            </a>
<p class="navbar-text">
vers: ${package.version} ;
status: <span id="ws-connection-status">not connected</span>
</p>
        </div>
    </div>
</nav>
<!--
<a href="https://github.com/berlincode/digioptions-trader.js"><img style="z-index: 9999; position: absolute; top: 0; right: 0; border: 0;" src="img/github_ribbon.png" alt="Fork me on GitHub" /></a>
-->
<div id="content" style="padding-top: 60px;">${content}</div>
<script type="text/javascript" src="node_modules/react/dist/react.min.js"></script>
<script type="text/javascript" src="node_modules/react-dom/dist/react-dom.min.js"></script>
<script type="text/javascript" src="node_modules/react-html-parser/dist/react-html-parser.min.js"></script>
<script type="text/javascript">
//<![CDATA[
(function(host, token) {
var connect = function(){
    var connection = new WebSocket(host);
    var elm_content = document.getElementById("content");
    var elm_status = document.getElementById("ws-connection-status");

    var set_status = function(text, className){
        if (elm_status.innerText) {
            elm_status.innerText = text;
        }
        else
            if (elm_status.textContent) {
                elm_status.textContent = text;
            }
        elm_status.className = className;
    };

    connection.onmessage = function (message) {
        set_status("connected", "bg-success");

        //console.log("message", message);
        var root = React.createElement('div', {}, ReactHtmlParser.default(message.data));
        ReactDOM.render(root, elm_content);
    };

    connection.onclose = function() {
        set_status("not connected !", "bg-danger");
        //try to reconnect in 3 seconds
        setTimeout(function(){connect();}, 3000);
    };
    connection.onopen = function() {

        connection.send(
            JSON.stringify({
                type: 'authenticate',
                payload: { token: token }
            })
        );

    };

    // set initial default
    set_status('not connected !', 'bg-danger');
};
connect();
})('ws://' + window.location.hostname + ':${port}/', '${token}');
//]]>
</script>
</body>
</html>`;
      response.end(html, 'utf-8');
    } else if (
      (pathname_abs.indexOf(http_root + '/node_modules') !== 0) &&
      (pathname_abs.indexOf(http_root + '/img') !== 0)
    ){
      // Make sure we're not trying to access a
      // file outside of the root.
      response.writeHead(404);
      response.end('Not Found');
    } else {
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
            response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
          }
        }
        else {
          response.writeHead(200, { 'Content-Type': contentType });
          response.end(filecontent, 'utf-8');
        }
      });

    }
  }).listen(port, host);

  var server_ws = ws.attach(server);

  var socket_enable = function(socket){
    sockets.push(socket);
    // send first update immediately
    if (main){
      socket.send(main.getContent());
    }
  };

  server_ws.on('connection', function(socket) {

    socket.on('message', function(message){

      try {
        var data = JSON.parse(message);
        if (data.type === 'authenticate') {
          if (config.basicAuth.enabled){
            jwt.verify(data.payload.token, config.basicAuth.jwtSecret, function (err, decoded) {

              if ((! err) && (decoded.name) && config.basicAuth.users[decoded.name]){
                socket_enable(socket);
                //console.log('auth success');
              }
            });
          } else {
            // no authentication necessary
            socket_enable(socket);
          }
        }
      } catch(err) {
        console.log('error' , err);
      }
    });

    socket.on('close', function () {
      try {
        socket.close();
        socket.destroy();
        //console.log('Socket closed!');
        for (var i = 0; i < sockets.length; i++) {
          if (sockets[i] == socket) {
            sockets.splice(i, 1);
            //console.log('Removing socket from collection. Collection length: ' + sockets.length);
            break;
          }
        }
      }
      catch (e) {
        //console.log(e);
      }
    });

  });

  console.log('serving on:');

  if (host !== '0.0.0.0') {
    console.log('  http://' + canonicalHost + ':' + port.toString());
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

  var contentUpdated = function(){
    if ((sockets.length === 0) || (! main))
      return;
   
    var data = main.getContent();

    //console.log('Sending data...');
    for(var i=0;i<sockets.length;i++)
    {
      try {
        sockets[i].send(data);
      }
      catch (e)
      {
        console.log(e);
      }
    }
  };

  //start application
  console.log('Hit CTRL-C to stop the server');
  main = new Main(contentUpdated);
  main.start();
  contentUpdated();// trigger first update
};


if (require.main === module) {
  //console.log('called directly');
  trading();
} else {
  //console.log('required as a module');
  module.exports = trading;
}
