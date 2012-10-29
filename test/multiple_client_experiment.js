const xmpp = require('node-xmpp');
const user = require('../lib/user');

var gc = new user.User('sww', 's0ftwarew0lf');
var mc = new user.User('softwarewolf', 's0ftwarew0lf');

module.exports.gc = gc;
module.exports.mc = mc;
module.exports.xmpp = xmpp;