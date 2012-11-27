const util = require('util');
const xmpp = require('node-xmpp');
const events = require('events');

const keep_alive_interval = 30000;

function Resource(jid, password, host) {

    const self = this;

    this.srv = host;

    this.dead = false;

    events.EventEmitter.call(this);

    self.client = self.client || new xmpp.Client({jid:jid, password:password, host:host});

    self.client.on('error', function (e) {
        self.error('error for ' + self.client.jid + ': ' + e);
    });

    self.client.on('stanza', function (stanza) {
        util.log('stanza: ' + stanza);
        if (stanza.is('presence')) {
            self.emit('presence', stanza);
        } else if (stanza.is('iq')) {
            self.emit('iq', stanza);
        } else if (stanza.is('message')) {
            self.emit('message', stanza);
        } else {
            self.error('unrecognized stanza: ' + stanza);
        }
    });


    self.client.once('online', function () {
        util.log(self.client.jid + ' is online');
        // send the initial presence stanza
        self.client.send(new xmpp.Element('presence'));
        // send keepalive data or server will disconnect us after 150s of inactivity
        self.intervalId = setInterval(function () {
            self.client.send(' ');
            setTimeout(self.send_keep_alive, keep_alive_interval);
        }, keep_alive_interval);
    });


    self.client.on('offline', function () {
        util.log(self.client.jid + ' went offline');
        self.end();
    });
}

util.inherits(Resource, events.EventEmitter);

Resource.prototype.error = function error(msg) {
    util.error(msg);
    this.end();
};

Resource.prototype.end = function () {
    if (!this.dead) {
        this.client.removeAllListeners();
        this.client.send(new xmpp.Presence({type:'unavailable'}));
        clearInterval(this.intervalId);
        this.client.end();
        this.dead = true;
    }
};

Resource.prototype.parse_user = function (user) {
    var regexp = new RegExp("^([a-zA-Z][a-zA-Z0-9-_]*@[^\/]+)(\/(.+))?$");
    return user.match(regexp);
};

module.exports = Resource;