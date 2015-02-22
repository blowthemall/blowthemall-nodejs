exports.getHostId = function(remoteAddress, remoteFamily, portNumber) {
    if (remoteFamily == 'IPv4')
        return remoteAddress + ':' + portNumber;
    else if (remoteFamily == 'IPv6')
        return '[' + remoteAddress + ']:' + portNumber;
    else
        throw 'Unrecognized IP family';
};

exports.getAddressFromHostId = function(hostId) {
    if (hostId[0] == '[')
        return hostId.substr(1, hostId.indexOf(']') - 1);
    else
        return hostId.substr(0, hostId.indexOf(':'));
};

exports.getPortFromHostId = function(hostId) {
    if (hostId[0] == '[')
        return hostId.substr(hostId.indexOf(']') + 2);
    else
        return hostId.substr(hostId.indexOf(':') + 1);
}

exports.isListOfStrings = function(list) {
    if (!Array.isArray(list))
        return false;

    return list.every(function(e) {
        return typeof(e) == 'string';
    });
};

exports.createPairs = function(list) {
    return list.filter(function(e, i) { return i % 2 == 0; })
        .map(function(e, i) { return [e, list[i * 2 + 1]]; });
};
