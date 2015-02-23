var jrs = require('jsonrpc-serializer');
var redis = require('redis');
var net = require('net');
var utils = require('./utils.js');
var client = null;

var timeout = 120; // in seconds
var roomsPerPage = 30;

var INTERNAL_ERROR = function() {
    var ret = new jrs.err.JsonRpcError();
    ret.code = -32603;
    ret.message = "Internal error";
    return ret;
}();

function roomsGarbageCollector() {
    client.keys('serverroomslist:*', function(err, reply) {
        if (err)
            return;

        reply.forEach(function(listkey) {
            var gameId = listkey.substr(listkey.indexOf(':') + 1);
            var onZrangebyscore = function(err, reply) {
                if (err)
                    return;

                reply.forEach(function(host) {
                    var hostkey = 'servernoderooms:' + host;
                    client.srem(hostkey, gameId);
                    client.zrem(listkey, host);
                });
            };

            client.zrangebyscore(listkey, -Infinity,
                                 new Date().getTime() - timeout * 1000,
                                 onZrangebyscore);
        });
    });
}

exports.startRedisClient = function(newClient) {
    if (newClient === undefined)
        newClient = redis.createClient();

    client = newClient;

    setInterval(roomsGarbageCollector, timeout);
};

exports.publish = function(gameId, host, options, done) {
    var listkey = 'serverroomslist:' + gameId;
    var infokey = 'serverroomsinfo:' + host + '/' + gameId;
    var hostkey = 'servernoderooms:' + host;

    client.zadd(listkey, new Date().getTime(), host, function(err, reply) {
        if (err) {
            done(INTERNAL_ERROR);
            return;
        }

        client.set(infokey, JSON.stringify(options), function(err, reply) {
            if (err) {
                client.zrem(listkey, host, function(err, reply) {
                    done(INTERNAL_ERROR);
                });
                return;
            }

            client.sadd(hostkey, gameId, function(err, reply) {
                client.expire(infokey, 2 * timeout);
                done();
            });
        });
    });
};

exports.unpublish = function(host, done) {
    var hostkey = 'servernoderooms:' + host;

    client.smembers(hostkey, function(err, reply) {
        reply.forEach(function(gameId) {
            var listkey = 'serverroomslist:' + gameId;
            var infokey = 'serverroomsinfo:' + host + '/' + gameId;
            client.zrem(listkey, host);
            client.del(infokey);
        });
        client.del(hostkey);
        done();
    });
};

exports.publishTimeout = function(done) {
    done(timeout);
}

exports.listFirst = function(gameId, options, done) {
    var listkey = 'serverroomslist:' + gameId;
    var onZrevrangebyscore = function(err, reply) {
        if (err) {
            done(INTERNAL_ERROR);
            return;
        }

        if (reply.length == 0) {
            done({ "rooms": [], "more": false });
            return;
        }

        var rooms = utils.createPairs(reply);
        var current = rooms[0], i = 0;
        var ret = {
            "offset": rooms[rooms.length - 1][1],
            "rooms": [],
            "more": true
        };
        rooms = rooms.map(function(e) { return e[0]; });

        var iter = function(err, reply) {
            var room = {
                "address": utils.getAddressFromHostId(rooms[i]),
                "port": utils.getPortFromHostId(rooms[i]),
                "options": JSON.parse(reply) || {}
            };
            if (!('tags' in options)
                || ('tags' in options && 'tags' in room.options
                    && options.tags.every(function(e) {
                        return room.options.tags.indexOf(e) != -1;
                    })))
                ret.rooms.push(room);

            ++i;
            if (i == rooms.length) {
                done(ret);
                return;
            }

            var infokey = 'serverroomsinfo:' + rooms[i] + '/' + gameId;
            client.get(infokey, iter);
        };

        var infokey = 'serverroomsinfo:' + rooms[0] + '/' + gameId;
        client.get(infokey, iter);
    };

    client.zrevrangebyscore(listkey, +Infinity, -Infinity, 'WITHSCORES',
                            'LIMIT', 0, roomsPerPage, onZrevrangebyscore);
}

exports.list = function(gameId, options, offset, done) {
    var listkey = 'serverroomslist:' + gameId;
    var onZrevrangebyscore = function(err, reply) {
        if (err) {
            done(INTERNAL_ERROR);
            return;
        }

        var rooms = utils.createPairs(reply).slice(1);

        if (rooms.length == 0) {
            done({ "rooms": [], "more": false });
            return;
        }

        var current = rooms[0], i = 0;
        var ret = {
            "offset": rooms[rooms.length - 1][1],
            "rooms": [],
            "more": true
        };
        rooms = rooms.map(function(e) { return e[0]; });

        var iter = function(err, reply) {
            var room = {
                "address": utils.getAddressFromHostId(rooms[i]),
                "port": utils.getPortFromHostId(rooms[i]),
                "options": JSON.parse(reply) || {}
            };
            if (!('tags' in options)
                || ('tags' in options && 'tags' in room.options
                    && options.tags.every(function(e) {
                        return room.options.tags.indexOf(e) != -1;
                    })))
                ret.rooms.push(room);

            ++i;
            if (i == rooms.length) {
                done(ret);
                return;
            }

            var infokey = 'serverroomsinfo:' + rooms[i] + '/' + gameId;
            client.get(infokey, iter);
        };

        var infokey = 'serverroomsinfo:' + rooms[0] + '/' + gameId;
        client.get(infokey, iter);
    };

    client.zrevrangebyscore(listkey, offset, -Infinity, 'WITHSCORES',
                            'LIMIT', 0, roomsPerPage + 1, onZrevrangebyscore);
}

exports.verify = function(address, port, done) {
    if (!net.isIP(address)) {
        done();
        return;
    }

    var socket = net.connect({ "host": address, "port": port});
    socket.on('connect', function() {
        socket.end();
        done();
    }).on('error', function() {
        var remoteFamily = net.isIPv4(address) ? 'IPv4' : 'IPv6';
        var hostid = utils.getHostId(address, remoteFamily, port);
        exports.unpublish(hostid, done);
    });
}
