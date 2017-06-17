#!/usr/bin/nodejs
/*jshint multistr: true */
/*jshint esversion: 6 */

var trading = function(){

var Main = require('./js/main.js');
var config = require('./js/config.js');
var package = require('./package.json');

//var host = '127.0.0.1'; // only accessible via loopback device (localhost)
//var host = '0.0.0.0'; // Attention: this might be expose data to others on the network
//var host = '192.168.2.110'; // Attention: this might be expose data to others on the network
var port_http = process.argv.length >= 3 ? parseInt(process.argv[2]) : 8000;
var port_websocket = process.argv.length >= 4 ? parseInt(process.argv[3]) : 8001;
var host = process.argv.length >= 5 ? parseInt(process.argv[4]) : '127.0.0.1';

var canonicalHost = host === '0.0.0.0' ? '127.0.0.1' : host;

var main;
var sockets = [],
    socketServer = null;
var ws = require('websocket.io'),
    http = require('http'),
    auth = require('basic-auth'),
    fs = require('fs'),
    path = require('path'),
    url = require('url'),
    os = require('os'),
    domain = require('domain'),
    reqDomain = domain.create(),
    socketDomain = domain.create(),
    httpDomain = domain.create();

var content = "loading...";

var JSDOM          = require("jsdom").JSDOM;
document = new JSDOM("test").window.document;

window = {}; // fake window.console?

// create a XMLHttpRequest object which can parse xml via jsom and sets responseXML
var XMLHttpRequestOrig = require('xmlhttprequest/lib/XMLHttpRequest.js').XMLHttpRequest;
var XMLHttpRequest = function () {
    /*  create object with original constructor  */
    var xhr = new XMLHttpRequestOrig();

    var onreadystatechange = null;

    /*  intercept "open" method to modify onreadystatechange  */
    var open_orig = xhr.open;
    xhr.open = function () {
        onreadystatechange = xhr.onreadystatechange;
        xhr.onreadystatechange = function(){};
        return open_orig.apply(xhr, arguments);
    };

    /*  hook into the processing  */
    var addEventListener_orig = xhr.addEventListener;
    xhr.addEventListener("readystatechange", function () {
        if (xhr.readyState === this.DONE) {

            var JSDOM = require("jsdom").JSDOM;
            var dom = new JSDOM(xhr.responseText, {contentType: "text/xml"});
            xhr.responseXML = dom.window.document;

            if (onreadystatechange !== null)
                onreadystatechange();
        }
    });

    this.addEventListener = function(event, callback) {
        if (event === "readystatechange")
            this.onreadystatechange = callback;
        else
            addEventListener_orig(event, callback);
    };

//    var removeEventListener_orig = xhr.addEventListener;
//    this.removeEventListener = function(event, callback) {
//        if (event !== "readystatechange")
//            return removeEventListener_orig(event, callback);

//        var bool = this.onreadystatechange == callback;
//        this.onreadystatechange = null;
//        return bool;
//    };

    /*  provide a simple way to control debug messages  */
    xhr.debug = false;

    return xhr;
};
window.XMLHttpRequest = XMLHttpRequest;
global.XMLHttpRequest = XMLHttpRequest;

global.WebSocket = require('ws');
global.DOMParser = function() {
    "use strict";

    this.parseFromString= function(data, contentType){
        var dom = new JSDOM(data, {contentType: contentType || "text/xml"});
        return dom.window.document;
    };
};

httpDomain.on('error', function (err) {
    console.log('Error caught in http domain:' + err);
});

httpDomain.run(function () {
    var http_root = (path.normalize(path.resolve(__dirname)));
    http.createServer(function (request, response) {
        if (config.basicAuth.enabled){
            var credentials = auth(request);
            if (!credentials || (credentials.name !== config.basicAuth.name) || (credentials.pass !== config.basicAuth.pass)) {
                response.statusCode = 401;
                response.setHeader('WWW-Authenticate', 'Basic realm="digioptions-trader.js"');
                response.end('Access denied');
                return;
            }
        }

        var pathname = url.parse(request.url).pathname;
        pathname_abs = path.resolve(path.join(http_root, pathname));
        if ((pathname === '/') || (pathname === '/index.html')) {
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
                <a class="navbar-brand" href="http://www.digioptions.com">
                    <img alt="digioptions.com" style="height: 25px" src="img/digioptions.png" />
                </a>
<p class="navbar-text">nodejs connection status: <span id="ws-connection-status">not connected</span></p>
<p class="navbar-text">version: ${package.version}</p>
            </div>
        </div>
    </nav>
    <div id="content" style="padding-top: 60px;">${content}</div>
    <script type="text/javascript" src="node_modules/react/dist/react.min.js"></script>
    <script type="text/javascript" src="node_modules/react-dom/dist/react-dom.min.js"></script>
    <script type="text/javascript" src="node_modules/react-html-parser/dist/react-html-parser.min.js"></script>
    <script type="text/javascript">
//<![CDATA[
(function(host) {
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

        connection.onopen = function () {
            set_status("connected", "bg-success");
        };

        connection.onmessage = function (message) {
            //console.log("message", message);
            var root = React.createElement('div', {}, ReactHtmlParser.default(message.data));
            ReactDOM.render(root, elm_content);
        };

        connection.onclose = function(){
            set_status("not connected !", "bg-danger");
            //try to reconnect in 3 seconds
            setTimeout(function(){connect();}, 3000);
        };

        // set initial default
        set_status("not connected !", "bg-danger");
    };
    connect();
})("ws://" + window.location.hostname + ":${port_websocket}");
//]]>
    </script>
</body>
</html>`;
            response.end(html, 'utf-8');
        } else if (
                (pathname_abs.indexOf(http_root + "/node_modules") !== 0) &&
                (pathname_abs.indexOf(http_root + "/img") !== 0)
            ){
            // Make sure we're not trying to access a
            // file outside of the root.
            response.writeHead(404);
            response.end("Not Found");
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
                        response.end("Not Found");
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
    }).listen(port_http, host);
});

socketDomain.on('error', function(err) {
    console.log('Error caught in socket domain:' + err);
});

socketDomain.run(function() {
    socketServer = ws.listen(port_websocket);

    socketServer.on('listening',function(){
        console.log('SocketServer is running');
    });

    socketServer.on('connection', function (socket) {

        //console.log('Connected to client');
        sockets.push(socket);

        socket.on('message', function (data) {
            //console.log('Message received:', data);
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

        // send immediately first update
        if (main){
            socket.send(main.getContent());
        }

    });
});

console.log("serving on:");

if (host !== '0.0.0.0') {
    console.log('  http://' + canonicalHost + ':' + port_http.toString());
}
else {
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (dev) {
        ifaces[dev].forEach(function (details) {
            if (details.family === 'IPv4') {
                console.log('  http://' + details.address + ':' + port_http.toString());
            }
        });
    });
}

var contentUpdated = function(){
    if (sockets.length === 0){
        return;
    }

    if (! main)
        return;
    data = main.getContent();

    //console.log('Sending data...');
    for(i=0;i<sockets.length;i++)
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
console.log("Hit CTRL-C to stop the server");
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
