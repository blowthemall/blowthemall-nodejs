#!/usr/bin/env node

var http = require('http');
var WebSocket = require('faye-websocket');
var tracker = require('./tracker.js');

function handleWebsocketChannel(request, socket, head) {
    var ws = new WebSocket(request, socket, head);
    tracker.handleChannel(ws,
                          {
                              "remoteAddress": socket.remoteAddress,
                              "remoteFamily": socket.remoteFamily
                          });
}

function upgradeCallback(request, socket, head) {
    if (!WebSocket.isWebSocket(request)
        || request.url != '/tracker') {
        socket.end();
        return;
    }

    handleWebsocketChannel(request, socket, head);
}

function start(options) {
    console.log('About to start redis client');
    tracker.startRedisClient();
    console.log('Redis client initialized');

    console.log('About to run server');

    var server = http.createServer(function(req, res) {
        res.writeHead(200, 'OK');
        res.end('Hello Stranger');
    }).listen(options.port);

    console.log('Server running on port ' + options.port);

    server.on('upgrade', upgradeCallback);
}

exports.startRedisClient = tracker.startRedisClient;
exports.handleWebsocketChannel = handleWebsocketChannel;
exports.upgradeCallback = upgradeCallback;
exports.start = start;

if (!module.parent) {
    var options = {
        "port": parseInt(process.env.npm_package_config_port) || 8080
    };

    start(options);
}
