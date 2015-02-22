var jrs = require('jsonrpc-serializer');
var rpc = require('./rpc.js');
var backend = require('./backend.js');
var utils = require('./utils.js');

var tracker = {
    // Methods to assist master nodes
    "publish": function(params, ws, client, done) {
        if (!Array.isArray(params)
            || (params.length != 2 && params.length != 3)
            || typeof(params[0]) != 'string'
            || typeof(params[1]) != 'number'
            || (params.length == 3 && typeof(params[2]) != 'object'))
            throw new jrs.err.InvalidParamsError();

        var options = params[2] || {};

        if (('nickname' in options && typeof(options.nickname) != 'string')
            || ('altNicknameServer' in options
                && typeof(options.altNicknameServer) != 'string')
            || ('tags' in options && !utils.isListOfStrings(options.tags)))
            throw new jrs.err.InvalidParamsError();

        var hostid = utils.getHostId(client.remoteAddress, client.remoteFamily,
                                     params[1]);
        backend.publish(params[0], hostid, options, done);
    },
    "unpublish": function(params, ws, client, done) {
        if (!Array.isArray(params)
            || params.length != 1
            || typeof(params[0]) != 'number')
            throw new jrs.err.InvalidParamsError();

        var hostid = utils.getHostId(client.remoteAddress, client.remoteFamily,
                                     params[0]);
        backend.unpublish(hostid, done);
    },
    "publishTimeout": function(params, ws, client, done) {
        backend.publishTimeout(done);
    },
    // Methods to assist slave nodes
    "listFirst": function(params, ws, client, done) {
        if (!Array.isArray(params)
            || params.length != 2
            || typeof(params[0]) != 'string'
            || typeof(params[1]) != 'object')
            throw new jrs.err.InvalidParamsError();

        if (('tags' in params[1] && !utils.isListOfStrings(params[1].tags))
            || ('nickname' in params[1]
                && typeof(params[1].nickname) != 'string'))
            throw new jrs.err.InvalidParamsError();

        backend.listFirst(params[0], params[1], done);
    },
    "list": function(params, ws, client, done) {
        if (!Array.isArray(params)
            || params.length != 3
            || typeof(params[0]) != 'string'
            || typeof(params[1]) != 'object'
            /* This last restriction is not protocol-wide. It's only specific to
             * this tracker. */
            || typeof(params[2]) != 'string')
            throw new jrs.err.InvalidParamsError();

        if (('tags' in params[1] && !utils.isListOfStrings(params[1].tags))
            || ('nickname' in params[1]
                && typeof(params[1].nickname) != 'string'))
            throw new jrs.err.InvalidParamsError();

        backend.list(params[0], params[1], params[2], done);
    },
    "verify": function(params, ws, client, done) {
        if (!Array.isArray(params)
            || params.length != 2
            || typeof(params[0]) != 'string'
            || typeof(params[1]) != 'number')
            throw new jrs.err.InvalidParamsError();

        backend.verify(params[0], params[1], done);
    }
};

exports.handleChannel = function(ws, client) {
    rpc.handleChannel(tracker, ws, client);
}
