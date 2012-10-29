const util = require('util');
const xmpp = require('node-xmpp');
const events = require('events');

const keep_alive_interval = 30000;
const srv = 'jabber.org';

function User(user_name, password){

    const self = this;

    events.EventEmitter.call(this);

    function error(msg) {
        util.log(msg);
        self.end();
    }

    self.client = new xmpp.Client({jid: user_name + '@' + srv, password: password});

    self.client.on('error', function(e){
        error('error: ' + e);
    });

    self.client.on('stanza', function (stanza) {
        util.log('stanza: ' + stanza);
        if (stanza.is('presence')){
            self.emit('presence', stanza);
        } else if (stanza.is('iq')){
            self.emit('iq', stanza);
        } else if (stanza.is('message')){
            self.emit('message');
        } else {
            error('unrecognized stanza: ' + stanza);
        }
    });


    self.client.once('online', function() {

        // send keepalive data or server will disconnect us after 150s of inactivity

        self.intervalId = setInterval(function () {
            self.client.send(' ');
            setTimeout(self.send_keep_alive, user.keep_alive_interval);
        }, user.keep_alive_interval);
    });
};

util.inherits(User, events.EventEmitter);


User.prototype.end = function(){
    clearInterval(this.intervalId);
    // todo - does it make sense to remove all listeners on the client?
    this.client.removeAllListeners();
    // todo - should we also remove all listeners to this?
    this.client.socket.end();
    this.client.end();
};

module.exports.User = User;