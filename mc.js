const xmpp = require('node-xmpp');
const util = require('util');

const jid = 'softwarewolf@jabber.org';
const password = 's0ftwarew0lf';
const nick_name = "MC";
const keep_alive_interval = 30000;
const muc_ns = 'http://jabber.org/protocol/muc';

function Mc(participants) {

    var chatroom = 'village' + Math.floor(Math.random() * 1000);
    var room_jid = chatroom + "@conference.jabber.org";
    var self = this;

    self.sww = new xmpp.Client({jid: jid, password: password});

    self.sww.on('stanza', function (stanza) {
        if (stanza.is('presence') || stanza.is('iq')) {
            util.log('stanza: ' + stanza);
        }
    });

    self.sww.on('error', function(error){
        util.log('error: ' + error);
    });

    self.sww.on('online', function () {

        const room_jid_and_nick_name = room_jid + '/' + nick_name;

        util.log("We're online!");

        // set ourselves as online
        self.sww.send(new xmpp.Element('presence', {type:'available'}).
            c('show').t('chat')
        );

        // create an instant room

        // anticipate on the presence stanza to notify us that the room has been created
        /*self.sww.on('stanza', function(stanza){
            var x = stanza.getChild('x', 'http://jabber.org/protocol/muc#user');
            var status;
            var return_code;
           // is this a presence stanza?
            if (stanza.is('presence')){
                // does it come from the room I was trying to create?





                if (stanza.from === room_jid_and_nick_name){
                    // does it have an x child?
                    if (x){
                            status = x.getChild('status');
                            // does it have a status child?
                            if (status){
                                // has the room creation succeeded?
                                return_code = status.attrs['code'];
                                if (return_code === "201" || return_code === "110"){
                                    // indicate this should be an instant room
                                    self.sww.send(new xmpp.Element('iq', {to: room_jid, type: 'set', id: 'create_' + chatroom}).
                                        c('query', {xmlns: muc_ns + '#owner'}).
                                        c('x', {xmlns: 'jabber:x;data', type: 'submit'})
                                    );
                                } else {
                                    util.log('presence.x.item.status code attribute is not success: ' + return_code);
                                    util.log('status: ' + status);
                                    self.end();
                            }
                        } else {
                            util.log('presence.x element does not have a status child: ' + x);
                            self.end();

                        }

                    } else {
                        util.log('presence stanza does not have x child: ' + stanza);
                        self.end();
                    }
                } else {
                    util.log('presence stanza not from ' + room_jid_and_nick_name + ', but from ' + stanza.from);
                    self.end();
                }
            } else {
                util.log('stanza received, not presence: ' + stanza);
                self.end();
            }
        });*/

        self.sww.send(new xmpp.Element('presence', {to:room_jid_and_nick_name})
        //    .c('x', {xmlns: muc_ns})
        );

        // send keepalive data or server will disconnect us after 150s of inactivity

        self.send_keep_alive = function () {
            self.sww.send(' ');
            setTimeout(self.send_keep_alive, keep_alive_interval);
        };

        setTimeout(self.send_keep_alive, keep_alive_interval);

    });
}

Mc.prototype.end = function(){
    var self = this;
    self.send_keep_alive = function(){};
    setTimeout(function(){
        self.sww.end();
        util.log("We're offline!");
    }, keep_alive_interval);
};

module.exports = Mc;
