var jrs = require('jsonrpc-serializer');

exports.handleChannel = function(methods, ws, client) {
    var RPC_MESSAGE_OVER_BINARY_FRAME_ERR = function() {
        var err = new jrs.err.ParseError();
        err.data = 'JSON-RPC messages wrapped in binary WebSocket frames are'
            + ' unsupported';
        return jrs.error(null, err);
    }();

    var handlers = {
        "requestnotificationpre": function(ws, payload) {
            var method_found = payload.method in methods
            // is not a builtin method, like 'constructor'
                && !(payload.method in {});
            if (!method_found) {
                ws.send(jrs.error(payload.id,
                                  new jrs.err.MethodNotFoundError()));
                return false;
            }

            return true;
        },
        "request": function(ws, payload, client) {
            if (!this.requestnotificationpre(ws, payload))
                return;

            try {
                var ondone = function(result) {
                    if (result instanceof jrs.err.JsonRpcError) {
                        ws.send(jrs.error(payload.id, result));
                        return;
                    }

                    if (result === undefined)
                        result = null;

                    ws.send(jrs.success(payload.id, result));
                };

                methods[payload.method](payload.params, ws, client, ondone);
            } catch(e) {
                if (e instanceof jrs.err.JsonRpcError) {
                    ws.send(jrs.error(payload.id, e));
                    return;
                }

                reply = jrs.error(payload.id,
                                  function() {
                                      var ret = new jrs.err.JsonRpcError();
                                      ret.code = -32603;
                                      ret.message = "Internal error";
                                      ret.data = JSON.stringify(e);
                                      return ret;
                                  }());
                ws.send(reply);
            }
        },
        "notification": function(ws, payload, client) {
            if (!this.requestnotificationpre(ws, payload))
                return;

            try {
                var ondone = function() {};
                methods[payload.method](payload.params, ws, client, ondone);
            } catch(e) {}
        },
        "success": function(ws, payload) {
            console.log('unimplemented');
        },
        "error": function(ws, payload) {
            console.log('unimplemented');
        }
    };

    ws.on('message', function(event) {
        if (typeof(event.data) != 'string') {
            ws.send(RPC_MESSAGE_OVER_BINARY_FRAME_ERR);
            return;
        }

        var message = jrs.deserialize(event.data);
        if (message instanceof jrs.err.JsonRpcError) {
            ws.send(jrs.error(null, message));
            return;
        }

        handlers[message.type](ws, message.payload, client);
    });
}
