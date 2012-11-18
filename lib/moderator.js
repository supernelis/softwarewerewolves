const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Player = require('./player');

const nick_name = "MC";
const muc_ns = 'http://jabber.org/protocol/muc';

const Resource = require('./resource');

const DAYTIME_RESPONSE_PARTS = magicStrings.getMagicString('DAYTIME_RESPONSE');
const DAYTIME_REQUEST = magicStrings.getMagicString('DAYTIME');
const NIGHTTIME_RESPONSE_PARTS = magicStrings.getMagicString('NIGHTTIME_RESPONSE');
const NIGHTTIME_REQUEST = magicStrings.getMagicString('NIGHTTIME');
const DAY = magicStrings.getMagicString('DAY');
const NIGHT = magicStrings.getMagicString('NIGHT');
const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
const VILLAGER = magicStrings.getMagicString('VILLAGER');
const DESIGNATED_AS_WEREWOLF = magicStrings.getMagicString('DESIGNATED_AS_WEREWOLF');
const WHO_DO_YOU_WANT_TO_EAT = magicStrings.getMagicString('WHO_DO_YOU_WANT_TO_EAT');
const DAYTIME_REQUEST_REGEXP = new RegExp(DAYTIME_REQUEST + '(\\d+)?');
const NIGHTTIME_REQUEST_REGEXP = new RegExp(NIGHTTIME_REQUEST + '(\\d+)?');
const WEREWOLF_REGEXP = new RegExp('.*' + WEREWOLF + '.*');
const I_EAT = magicStrings.getMagicString('I_EAT');
const EAT_REGEXP = new RegExp('^' + I_EAT + '(.+)$');
const VICTIM_ANNOUNCEMENT = magicStrings.getMagicString('VICTIM_ANNOUNCEMENT');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const VOTE = magicStrings.getMagicString('VOTE');
const VOTE_REGEXP = new RegExp('^' + VOTE + '\\s*(.+)$');
const HANG_ANNOUNCEMENT = magicStrings.getMagicString('HANG_ANNOUNCEMENT');


function makeNewGroupChatMessage(room_jid) {
    return new xmpp.Message({to:room_jid, type:'groupchat'});
}
function Moderator(jid, password, host, participants) {

    const self = this;

    Resource.call(this, jid, password, host);

    const chatroom = 'village' + Math.floor(Math.random() * 1000);
    // todo: verify that prefix is always the same, also on other XMPP servers
    const room_jid = chatroom + "@conference." + self.srv;
    const room_jid_and_nick_name = room_jid + '/' + nick_name;
    const ROOM_JID_AND_NICKNAME_REGEXP = new RegExp('^' + room_jid + '\/(.+)$');

    var players = [];
    var daytime = 60000;
    var nighttime = 60000;
    var dayId;
    var nightId;
    var phase;
    var votes = [];

    this.__defineGetter__('phase', function () {
        return phase;
    });

    this.__defineGetter__('werewolves', function () {
        return players.filter(function (p) {
            return (p.role == WEREWOLF);
        }).map(function (p) {
                return p.nickname
            });
    });

    this.__defineGetter__('players', function () {
        return players.map(function (p) {
            return p.nickname
        });
    });

    this.__defineGetter__('livePlayers', function () {
        return players.filter(function (p) {
            return p.lives
        }).map(function (p) {
                return p.nickname
            });
    });

    this.__defineGetter__('liveVillagers', function () {
        return players.filter(function (p) {
            return p.lives && p.role == VILLAGER
        }).map(function (p) {
                return p.nickname
            });
    });

    this.__defineGetter__('votes', function () {
        return votes.map(function (v) {
            return v
        });
    });

    function askWerewolfWhoToEat() {
        const msg = new xmpp.Message({to:room_jid + '/' + self.werewolves[0], type:'chat'});
        msg.c('body').t(WHO_DO_YOU_WANT_TO_EAT + self.liveVillagers);
        self.client.send(msg);
    }

    function startTheNight() {
        self.removeListener('message', listenForVotes);
        self.on('message', listenForEats);
        // todo - set and cancel timeouts nightId = setTimeout(startTheDay, nighttime);
        phase = NIGHT;
        var msg = new xmpp.Message({to:room_jid, type:'groupchat'});
        msg.c('subject')
            .t(phase);
        self.client.send(msg);
        askWerewolfWhoToEat();
    }

    function startTheDay(victim) {
        self.removeListener('message', listenForEats);
        self.on('message', listenForVotes);
        // todo - set and cancel timeouts dayId = setTimeout(startTheNight, daytime);
        phase = DAY;
        votes = [];
        var msg = makeNewGroupChatMessage(room_jid);
        msg.c('subject')
            .t(phase);
        self.client.send(msg);
        msg = makeNewGroupChatMessage(room_jid);
        msg.c('body').t('What a beautiful dawn! But what is this?');
        self.client.send(msg);
        // tell the villagers who has been eaten
        msg = makeNewGroupChatMessage(room_jid);
        msg.c('body').t(VICTIM_ANNOUNCEMENT + victim);
        self.client.send(msg);
        // ask the villagers who they want to hang

        msg = new xmpp.Message({to:room_jid, type:'groupchat', id:'call_for_revenge'});
        msg.c('body').t('The villagers want revenge! They suspect that one of the villagers is a werewolf. They want to hang him.');
        self.client.send(msg);

        msg = new xmpp.Message({to:room_jid, type:'groupchat', id:'request_votes'});
        msg.c('body').t(REQUEST_VOTE + self.livePlayers);
        self.client.send(msg);
    }

    function listenForChatroomCreation(presence) {
        const from = presence.from;
        const x = presence.getChild('x');
        if (from == room_jid_and_nick_name && x) {
            const status = x.getChild('status');
            if (status) {
                const return_code = status.attrs['code'];
                if (return_code == 201 || return_code == 110) {
                    // this is what we have been waiting for
                    // listen for players joining the chatroom
                    self.on('presence', listenForPlayerArrival);
                    //listen for players leaving the chatroom
                    self.on('presence', listenForPlayerLeaving);
                    // listen for werewolves volunteering
                    self.on('message', listenForWerewolves);
                    self.removeListener('presence', listenForChatroomCreation);
                    util.log('sending invitations to ' + participants);
                    // invite participants
                    participants.forEach(function (p) {
                        var invitation = new xmpp.Message({to:room_jid});
                        invitation.c('x', {xmlns:muc_ns + '#user', jid:room_jid})
                            .c('invite', {to:p})
                            .c('reason')
                            .t('come and join the werewolf game');
                        util.log('sending an invitation: ' + invitation);
                        self.client.send(invitation);
                    });
                } else {
                    util.log('cannot create chatroom. Terminating.');
                    self.end();
                }
            }
        }
    }

    function listenForPlayerArrival(presence) {
        const from = presence.from;
        const strlen = room_jid.length;
        const fromMatchResult = from.match(ROOM_JID_AND_NICKNAME_REGEXP);
        if (fromMatchResult) {
            const participant = fromMatchResult[1];
            if (participant != nick_name && !presence.type && participants.indexOf(participant)) {
                util.log('great to see ' + participant + ' in the village.');
                players.push(new Player(participant));
            }
            if (players.length == participants.length){
                self.removeListener('presence', listenForPlayerArrival);
            }
            startgame();
        }

    }

    function listenForPlayerLeaving(presence) {
        //todo
    }

    function listenForWerewolves(message) {
        const body = message.getChild('body');
        if (body) {
            const text = body.getText();
            const werewolfMatchResult = text.match(WEREWOLF_REGEXP);
            const roomAndNicknameMatchResult = message.from.match(ROOM_JID_AND_NICKNAME_REGEXP);
            if (werewolfMatchResult && roomAndNicknameMatchResult && message.type == 'chat') {
                self.removeListener('message', listenForWerewolves);
                const nickname = roomAndNicknameMatchResult[1];
                const id = message.id;
                const type = message.type;
                const msg = new xmpp.Message({to:message.from});
                if (id) {
                    msg.id = id;
                }
                msg.type = type;
                players.forEach(function (p) {
                    if (p.nickname == nickname) {
                        p.role = WEREWOLF;
                    }
                });
                msg.c('body').t(DESIGNATED_AS_WEREWOLF);
                self.client.send(msg);
                startgame();
            }
        }
    }

    function startgame(){
        if(self.werewolves.length > 0 && self.livePlayers.length == participants.length && self.phase == undefined){
            startTheNight();
        }
    }

    function endGame(){


    }

    function listenForEats(message) {
        const body = message.getChild('body');
        if (body) {
            const text = body.getText();
            const eatMatchResult = text.match(EAT_REGEXP);
            if (eatMatchResult) {
                const victim = eatMatchResult[1];
                if (self.liveVillagers.indexOf(victim) >= 0) {
                    players.forEach(function (p) {
                        if (p.nickname == victim) {
                            p.lives = false;
                        }
                    });
                    startTheDay(victim);
                } else {
                    askWerewolfWhoToEat();
                }
            }
        }
    }

    function listenForVotes(message) {
        const body = message.getChild('body');
        if (body) {
            const text = body.getText();
            const voteMatchResult = text.match(VOTE_REGEXP);
            if (voteMatchResult) {
                const victim = voteMatchResult[1];
                votes.push(victim);
                if (votes.length == self.livePlayers.length) {
                    const announcement = makeNewGroupChatMessage(room_jid);
                    const toBeHanged = mode(votes);
                    players.forEach(function (p) {
                        if (p.nickname == toBeHanged) {
                            p.lives = false;
                        }
                    });
                    announcement.c('body').t(HANG_ANNOUNCEMENT + toBeHanged);
                    self.client.send(announcement);
                    startTheNight();
                }
            }
        }
    }

    function mode(array) {
        if (array.length == 0)
            return null;
        var modeMap = {};
        var maxEl = array[0], maxCount = 1;
        for (var i = 0; i < array.length; i++) {
            var el = array[i];
            if (modeMap[el] == null)
                modeMap[el] = 1;
            else
                modeMap[el]++;
            if (modeMap[el] > maxCount) {
                maxEl = el;
                maxCount = modeMap[el];
            }
        }
        return maxEl;
    }

    self.on('iq', function (iq_stanza) {
        // if it is a discovery request
        const disco_ns = 'http://jabber.org/protocol/disco#info';
        if (iq_stanza.getChild('query')
            .attrs['xmlns'] == disco_ns) {
            const disco_response = new xmpp.Iq({from:iq_stanza.to, to:iq_stanza.from, id:iq_stanza.id, type:'result'});
            disco_response
                .c('query', {xmlns:disco_ns})
                .c('feature', {var:'jabber:x:conference'});
            util.log('sending disco response: ' + disco_response);
            self.client.send(disco_response);
        } else {
            self.error('not yet implemented response to iq query: ' + iq_stanza);
        }
    });

    self.on('message', function (message) {
        const body = message.getChild('body');
        const id = message.id;
        const type = message.type;
        const msg = new xmpp.Message({to:message.from});
        if (id) {
            msg.id = id;
        }
        if (type) {
            msg.type = type;
        }
        if (body) {
            const text = body.getText();
            const daytimeRequestMatchResult = text.match(DAYTIME_REQUEST_REGEXP);
            const nighttimeRequestMatchResult = text.match(NIGHTTIME_REQUEST_REGEXP);
            var fnToCall;
            if (daytimeRequestMatchResult || nighttimeRequestMatchResult) {
                if (daytimeRequestMatchResult) {
                    if (daytimeRequestMatchResult[1]) {
                        daytime = daytimeRequestMatchResult[1] * 1000;
                        clearTimeout(dayId);
                        if (phase == 'Day') {
                            fnToCall = startTheNight;
                        }
                    }
                    msg
                        .c('body')
                        .t(DAYTIME_RESPONSE_PARTS[0] + daytime / 1000 + DAYTIME_RESPONSE_PARTS[1])
                } else {
                    if (nighttimeRequestMatchResult[1]) {
                        nighttime = nighttimeRequestMatchResult[1] * 1000;
                        clearTimeout(nightId);
                        if (phase == 'Night') {
                            fnToCall = startTheDay;
                        }
                    }
                    msg
                        .c('body')
                        .t(NIGHTTIME_RESPONSE_PARTS[0] + nighttime / 1000 + NIGHTTIME_RESPONSE_PARTS[1])
                }
                self.client.send(msg);
                // todo - rather than just ending the phase, arguably we should reset the timer to go off after whatever time is remaining given the new duration
                if (fnToCall) fnToCall();
            }
        }
    });

    self.client.on('offline', function () {
        util.log("We're offline!");
        self.end();
    });


    self.client.once('online', function () {

        // anticipate on the presence stanza to notify us that the room has been created

        self.on('presence', listenForChatroomCreation);

        // create an instant room
        self.client.send(new xmpp.Presence({to:room_jid_and_nick_name})
        );

    });
}

util.inherits(Moderator, Resource);

module.exports = Moderator;