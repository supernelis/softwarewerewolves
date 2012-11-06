const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const nick_name = "MC";
const muc_ns = 'http://jabber.org/protocol/muc';

const PRESENCE_MSG_FROM_PARTICIPANT = 'presenceMsgFromParticipant';

const PARTICIPANT_STATE_ENTERED = 'entered';

const Resource = require('./resource');

const DAYTIME_RESPONSE_PARTS = magicStrings.getMagicString('DAYTIME_RESPONSE');
const DAYTIME_REQUEST = magicStrings.getMagicString('DAYTIME');
const NIGHTTIME_RESPONSE_PARTS = magicStrings.getMagicString('NIGHTTIME_RESPONSE');
const NIGHTTIME_REQUEST = magicStrings.getMagicString('NIGHTTIME');
const DAYTIME_REQUEST_REGEXP = new RegExp(DAYTIME_REQUEST + '(\\d+)?');
const NIGHTTIME_REQUEST_REGEXP = new RegExp(NIGHTTIME_REQUEST + '(\\d+)?');


function Mc(jid, password, host, participants) {

    const self = this;

    Resource.call(this, jid, password, host);

    const chatroom = 'village' + Math.floor(Math.random() * 1000);

    var daytime = 60000;
    var nighttime = 60000;
    var dayId;
    var nightId;
    var phase;

    this.phase = function(){
        return phase;
    };

    function startThe_(night){
        var subject;
        if (night){
            subject = 'Night';
            nightId = setTimeout(startTheDay, nighttime);
        } else {
            subject = 'Day';
            dayId = setTimeout(startTheNight, daytime);
        }
        phase = subject;
        var msg = new xmpp.Message({to:room_jid, type:'groupchat'});
        msg.c('subject')
            .t(subject);
        self.client.send(msg);
    }

    const startTheNight = startThe_.bind(null, true);
    const startTheDay = startThe_.bind(null, false);

    const room_jid = chatroom + "@conference." + self.srv;
    const room_jid_and_nick_name = room_jid + '/' + nick_name;
    var participant_state = [];

    function receive_participant(participant, state, welcome) {
        var found = false;
        for (var i = 0; i < participants.length && !found; i++) {
            if (participants[i].user == participant) {
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
        if (iq_stanza.getChild('query')


            .attrs['xmlns'] == disco_ns){
            const disco_response = new xmpp.Iq({from: iq_stanza.to, to: iq_stanza.from, id: iq_stanza.id, type: 'result'});
            disco_response
                .c('query', {xmlns: disco_ns})
                .c('feature', {var: 'jabber:x:conference'})
            util.log('sending disco response: ' + disco_response);
            self.client.send(disco_response);
        } else {
            self.error('not yet implemented response to iq query: ' + iq_stanza);
        }
    });

    self.on('message', function(message){
        const body = message.getChild('body');
        if (body){
            const text = body.getText();
            const daytimeRequestMatchResult = text.match(DAYTIME_REQUEST_REGEXP);
            const nighttimeRequestMatchResult = text.match(NIGHTTIME_REQUEST_REGEXP);
            var msg;
            var fnToCall;
            if (daytimeRequestMatchResult || nighttimeRequestMatchResult){
                msg = new xmpp.Message({to: message.from});
                if (daytimeRequestMatchResult){
                    if (daytimeRequestMatchResult[1]){
                        daytime = daytimeRequestMatchResult[1] * 1000;
                        clearTimeout(dayId);
                        if (phase == 'Day'){
                            fnToCall = startTheNight;
                        }
                    };
                    msg
                        .c('body')
                        .t(DAYTIME_RESPONSE_PARTS[0] + daytime/1000 + DAYTIME_RESPONSE_PARTS[1])
                } else if (nighttimeRequestMatchResult){
                    if (nighttimeRequestMatchResult[1]){
                        nighttime = nighttimeRequestMatchResult[1] * 1000;
                        clearTimeout(nightId);
                        if (phase == 'Night'){
                            fnToCall = startTheDay;
                        }
                    };
                    msg
                        .c('body')
                        .t(NIGHTTIME_RESPONSE_PARTS[0] + nighttime/1000 + NIGHTTIME_RESPONSE_PARTS[1])

                }
                self.client.send(msg);
                // todo - rather than just ending the phase, arguably we should reset the timer to go off after whatever time is remaining given the new duration
                if (fnToCall) fnToCall();
            }
        }
    });

    self.on('presenceFromChatroom', function(x){

        if (!x){
            self.error('no x element in presence stanza from chatroom');
        } else {
            util.log('got reply from chatroom creation');
            self.emit('statusFromPresenceFromChatroom', x.getChild('status'));
        }
    });

    self.on(PRESENCE_MSG_FROM_PARTICIPANT, function(participant, type){
        util.log('presence msg from participant');
        if (!type){
            self.emit('arrival', participant);
        } else if (type == 'unavailable') {
            receive_participant(participant, 'disqualified', participant + 'has abandoned the game');
        }
    });


    var arrival = function(participant){
        const welcome = 'great to see ' + participant.user + ' in the village.';
        const state = PARTICIPANT_STATE_ENTERED;
        receive_participant(participant + '@' + self.srv, state, welcome);
    };

    self.on('arrival', arrival);

    self.client.on('offline', function(){
        util.log("We're offline!");
        self.end();
    });

    self.client.on('online', function () {

        util.log('master of ceremonies is online');

        // create an instant room

        self.client.send(new xmpp.Presence({to:room_jid_and_nick_name})
        );

        // start the night
        startTheNight();

        // anticipate on the presence stanza to notify us that the room has been created

        self.once('statusFromPresenceFromChatroom', function(status){
            var return_code;
            if (status){
                // has the room creation succeeded?
                return_code = status.attrs['code'];
                if (return_code == 201 || return_code == 110){
                    util.log('time to send out invitations to ' + participants.map(function(p){return p.user;}));
                    // invite participants
                    for (i = 0; i < participants.length; i++){
                        var invitation = new xmpp.Message({to: room_jid});
                        invitation.c('x', {xmlns: muc_ns + '#user', jid: room_jid})
                            .c('invite', {to: participants[i].user})
                            .c('reason')
                            .t('come and join the werewolf game');
                        util.log('sending an invitation: ' + invitation);
                        self.client.send(invitation);
                    }

                    setTimeout(function(){
                        // don't accept any more new arrivals
                        self.removeListener('arrival', arrival);
                        // start the game
                        var msg = new xmpp.Message({to: room_jid, type: 'groupchat', id: 'start'});
                        msg.c('body').t('Are you sitting comfortably? Then we will begin!');
                        util.log('sending the start message to the chatroom: ' + msg);
                        self.client.send(msg);
                        msg = new xmpp.Message({to: room_jid, type: 'groupchat', id: 'cold_night'});
                        msg.c('body').t('It was a cold and dark night. Suddenly a spine-chilling cry pierced the village.');
                        self.client.send(msg);
                        // start the day

                        self.client.send(new xmpp.Message({to: room_jid, type: 'groupchat'})
                            .c('subject')
                            .t('night'));

                        msg = new xmpp.Message({to: room_jid, type: 'groupchat', id: 'beautiful_day'});
                        msg.c('body').t('What a beautiful dawn! But what is this? It turns out that Bernice has been savaged by a terrible beast.');
                        self.client.send(msg);

                        msg = new xmpp.Message({to: room_jid, type: 'groupchat', id: 'call_for_revenge'});
                        msg.c('body').t('The villagers want revenge! They suspect that one of the villagers is a werewolf. They want to hang him.');
                        self.client.send(msg);

                        msg = new xmpp.Message({to: room_jid, type: 'groupchat', id: 'request_votes'});
                        msg.c('body').t('Please vote who should be hanged: ' + participants.map(function(p){return p.user}));
                        self.client.send(msg);
                    }, 150000);
                } else {
                    self.error('presence.x.item.status code attribute is not success: ' + return_code);
                }
            } else {
                self.error('presence.x element does not have a status child');
            }
        });



    });
}

util.inherits(Mc, Resource);

module.exports = Mc;
