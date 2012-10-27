const xmpp = require('node-xmpp');
const util = require('util');
const events = require('events');

const srv = 'jabber.org';
const jid = 'softwarewolf@' + srv;
const password = 's0ftwarew0lf';
const nick_name = "MC";
const keep_alive_interval = 30000;
const muc_ns = 'http://jabber.org/protocol/muc';

const PRESENCE_MSG_FROM_PARTICIPANT = 'presenceMsgFromParticipant';

const PARTICIPANT_STATE_ENTERED = 'entered';

function Mc(chatroom, participants) {

    const room_jid = chatroom + "@conference." + srv;
    const room_jid_and_nick_name = room_jid + '/' + nick_name;
    var self = this;
    var on_presence;
    var participant_state = [];

    events.EventEmitter.call(this);

    function error(msg) {
        util.log(msg);
        self.end();
    }

    function receive_participant(participant, state, welcome) {
        var found = false;
        for (var i = 0; i < participants.length && !found; i++) {
            if (participants[i] == participant) {
                participant_state[i] = state;
                util.log(welcome);
                found = true;
            }
        }
        if (!found) {
            util.log('we have a rogue participant trying to enter our village: ' + participant);
        }
    }

    var i;
    for (i = 0; i < participants.length; i++){
        participant_state[i] = 'entry requested';
    }

    self.sww = new xmpp.Client({jid: jid, password: password});

    self.sww.on('error', function(e){
        error('error: ' + e);
    });

    self.sww.on('stanza', function (stanza) {
       util.log('stanza: ' + stanza);
       if (stanza.is('presence')){
           self.emit('presence', stanza);
       } else if (stanza.is('iq')){
           self.emit('iq', stanza);
       } else if (stanza.is('message')){
           error("not yet implemented handling of message stanza's: " + stanza);
       } else {
           error('unrecognized stanza: ' + stanza);
       }
    });

    self.on('presence', function(presence_stanza){
        const from = presence_stanza.from;
        const strlen = room_jid.length;
        if (from == room_jid_and_nick_name){
           self.emit('presenceFromChatroom', presence_stanza.getChild('x'));
       } else if (from.slice(0, strlen) == room_jid) {
            self.emit(PRESENCE_MSG_FROM_PARTICIPANT, from.slice(strlen + 1), presence_stanza.type);
       } else {
           error('not yet implemented response to presence stanza: ' + presence_stanza);
       }
    });

    self.on('iq', function(iq_stanza){
       // if it is a discovery request
        const disco_ns = 'http://jabber.org/protocol/disco#info';
        if (iq_stanza.getChild('query').attrs['xmlns'] == disco_ns){
           self.sww.send(new xmpp.Element('iq', {to: iq_stanza.from, id: iq_stanza.id, type: 'result'})
               .c('query', {xmlns: disco_ns})
               .c('feature', {var: 'jabber:x;conference'})
           );
       } else {
            error('not yet implemented response to iq query: ' + iq_stanza);
        }
    });

    self.on('presenceFromChatroom', function(x){
       if (!x){
           error('no x element in presence stanza from chatroom');
       } else {
           self.emit('statusFromPresenceFromChatroom', x.getChild('status'));
       }
    });

    self.on(PRESENCE_MSG_FROM_PARTICIPANT, function(participant, type){
        if (!type){
            self.emit('arrival', participant);
        } else if (type == 'unavailable') {
           receive_participant(participant, 'disqualified', participant + 'has abandoned the game');
        }
    });


    var arrival = function(participant){
        const welcome = 'great to see ' + participant + ' in the village';
        const state = PARTICIPANT_STATE_ENTERED;
        receive_participant(participant, state, welcome);
    };

    self.on('arrival', arrival);

    self.sww.on('offline', function(){
       util.log("We're offline!");
       self.end();
    });

    self.sww.on('online', function () {


        util.log("We're online!");

        // set ourselves as online
        self.sww.send(new xmpp.Element('presence', {type:'available'}).
            c('show').t('chat')
        );

        // create an instant room

        self.sww.send(new xmpp.Element('presence', {to:room_jid_and_nick_name})
        );

        // anticipate on the presence stanza to notify us that the room has been created

        self.once('statusFromPresenceFromChatroom', function(status){
            var return_code;
            if (status){
                // has the room creation succeeded?
                return_code = status.attrs['code'];
                if (return_code == 201 || return_code == 110){
                    // invite participants
                    for (i = 0; i < participants.length; i++){
                        var invitation = new xmpp.Element('message', {to: participants[i] + '@' + srv});
                        invitation.c('x', {xmlns: 'jabber:x;conference', jid: room_jid});
                        util.log('about to send an invitation: ' + invitation);
                        self.sww.send(invitation);
                    }


                    // participants which have not joined us after 5 mins are dead
                    setTimeout(function(){
                        // don't accept any more new arrivals
                        self.removeListener('arrival', arrival);
                        // TODO - lock participants that did not arrive in time out of the room
                        // start the game
                        var msg = new xmpp.Element('message', {to: room_jid, type: 'groupchat', 'xmlns:stream': "http://etherx.jabber.org/streams"});
                        msg.t('Are you sitting comfortably? Then we will begin');
                        util.log('about to send the start message to the chatroom: ' + msg);
                        self.sww.send(msg);
                    }, 300000);
                } else {
                    error('presence.x.item.status code attribute is not success: ' + return_code);
                }
            } else {
                error('presence.x element does not have a status child');
            }
        });

        // send keepalive data or server will disconnect us after 150s of inactivity

        self.intervalId = setInterval(function () {
            self.sww.send(' ');
            setTimeout(self.send_keep_alive, keep_alive_interval);
        }, keep_alive_interval);

    });
}

util.inherits(Mc, events.EventEmitter);

Mc.prototype.end = function(){
    clearInterval(this.intervalId);
    this.sww.end();
};

module.exports = Mc;
