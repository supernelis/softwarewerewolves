const xmpp = require('node-xmpp');
const util = require('util');

const user = require('./user');
const user_name = 'softwarewolf';
const password = 's0ftwarew0lf';
const nick_name = "MC";
const muc_ns = 'http://jabber.org/protocol/muc';

const PRESENCE_MSG_FROM_PARTICIPANT = 'presenceMsgFromParticipant';

const PARTICIPANT_STATE_ENTERED = 'entered';

function Mc(participants) {

    const chatroom = 'village' + Math.floor(Math.random() * 1000);
    const room_jid_and_nick_name = room_jid + '/' + nick_name;
    const self = this;
    var participant_state = [];

    user.User.call(this, user_name, password);

    const room_jid = chatroom + "@conference." + self.srv;

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
            util.log('we have an observer in our village: ' + participant);
        }
    }

    for (var i = 0; i < participants.length; i++){
        participant_state[i] = 'entry requested';
    }

    self.on('presence', function(presence_stanza){
        const from = presence_stanza.from;
        const strlen = room_jid.length;
        if (from == room_jid_and_nick_name){
           self.emit('presenceFromChatroom', presence_stanza.getChild('x'));
       } else if (from.slice(0, strlen) == room_jid) {
            self.emit(PRESENCE_MSG_FROM_PARTICIPANT, from.slice(strlen + 1), presence_stanza.type);
       }
    });

    self.on('iq', function(iq_stanza){
       // if it is a discovery request
        const disco_ns = 'http://jabber.org/protocol/disco#info';
        if (iq_stanza.getChild('query').attrs['xmlns'] == disco_ns){
            var disco_response = new xmpp.Element('iq', {from: iq_stanza.to, to: iq_stanza.from, id: iq_stanza.id, type: 'result'});
            disco_response
                .c('query', {xmlns: disco_ns})
                .c('feature', {var: 'jabber:x:conference'})
            util.log('sending disco response: ' + disco_response);
            self.client.send(disco_response);
        } else {
            self.error('not yet implemented response to iq query: ' + iq_stanza);
        }
    });

    self.on('presenceFromChatroom', function(x){

       if (!x){
           self.error('no x element in presence stanza from chatroom');
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
        const welcome = 'great to see ' + participant + ' in the village.';
        const state = PARTICIPANT_STATE_ENTERED;
        receive_participant(participant, state, welcome);
    };

    self.on('arrival', arrival);

    self.client.on('offline', function(){
       util.log("We're offline!");
       self.end();
    });

    self.client.on('online', function () {


        util.log("We're online!");

        // broadcast presence, drawing attention to our MUC capabilities
        self.client.send(new xmpp.Element('presence').
            c('x', {xmlns: muc_ns})
        );

        // create an instant room

        self.client.send(new xmpp.Element('presence', {to:room_jid_and_nick_name})
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
                        var invitation = new xmpp.Element('message', {to: room_jid});
                        invitation.c('x', {xmlns: muc_ns + '#user', jid: room_jid})
                            .c('invite', {to: participants[i] + '@' + srv})
                            .c('reason')
                            .t('come and join the werewolf game');
                        util.log('sending an invitation: ' + invitation);
                        self.client.send(invitation);
                    }


                    // participants which have not joined us after 5 mins are dead
                    setTimeout(function(){
                        // don't accept any more new arrivals
                        self.removeListener('arrival', arrival);
                        // TODO - lock participants that did not arrive in time out of the room
                        // start the game
                        var msg = new xmpp.Element('message', {to: room_jid, type: 'groupchat', id: 'start'});
                        msg.c('body').t('Are you sitting comfortably? Then we will begin!');
                        util.log('sending the start message to the chatroom: ' + msg);
                        self.client.send(msg);
                    }, 300000);
                } else {
                    self.error('presence.x.item.status code attribute is not success: ' + return_code);
                }
            } else {
                self.error('presence.x element does not have a status child');
            }
        });



    });
}

util.inherits(Mc, user.User);

module.exports = Mc;
