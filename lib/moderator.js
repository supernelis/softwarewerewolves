const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Player = require('./player');
const BotXmppHelper = require('./bot_xmpp_helper');
const Bot = require('./bot');


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
const NO_VOTES_FOR_SELF = magicStrings.getMagicString('NO_VOTES_FOR_SELF');
const ONLY_VOTES_FOR_LIVE_PLAYERS = magicStrings.getMagicString('ONLY_VOTES_FOR_LIVE_PLAYERS');
const VOTE_REGEXP = new RegExp('^' + VOTE + '\\s*(.+)$');
const HANG_ANNOUNCEMENT = magicStrings.getMagicString('HANG_ANNOUNCEMENT');
const WEREWOLVES_WIN_ANNOUNCEMENT = magicStrings.getMagicString('WEREWOLVES_WIN_ANNOUNCEMENT');
const VILLAGERS_WIN_ANNOUNCEMENT = magicStrings.getMagicString('VILLAGERS_WIN_ANNOUNCEMENT');

// events emitted by this object
const NIGHTFALL = 'nightfall';
const DAWN = 'dawn';


function makeNewGroupChatMessage(room_jid) {
    return new xmpp.Message({to:room_jid, type:'groupchat'});
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

function Moderator(jid, password, host, toInvite) {

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

    this.__defineGetter__('villageJID', function () {
        return room_jid;
    });

    this.__defineGetter__('phase', function () {
        return phase;
    });

    this.__defineGetter__('liveWerewolves', function () {
        return players.filter(function (p) {
            return (p.lives && p.role == WEREWOLF);
        }).map(function (p) {
                return p.nickname;
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
        const msg = new xmpp.Message({to:room_jid + '/' + self.liveWerewolves[0], type:'chat'});
        msg.c('body').t(WHO_DO_YOU_WANT_TO_EAT + self.liveVillagers);
        self.client.send(msg);
    }

    function invite(p) {
        const msg = new xmpp.Message({to:room_jid, id:'invitation' + Math.floor(Math.random() * 1000)});
        msg.c('x', {xmlns:muc_ns + '#user', jid:room_jid})
            .c('invite', {to:p})
            .c('reason')
            .t('come and join the werewolf game');
        util.log('sending invitation ' + msg);
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
        if (self.liveVillagers.length <= self.liveWerewolves.length) {
            msg = makeNewGroupChatMessage(room_jid);
            msg.c('body').t(WEREWOLVES_WIN_ANNOUNCEMENT);
            self.client.send(msg);
            self.emit('game over', 'the werewolves ate everyone in the village. ' + self.liveWerewolves + ' was the werewolf.');
        } else {
            // ask the villagers who they want to hang
            self.on('message', listenForVotes);

            msg = new xmpp.Message({to:room_jid, type:'groupchat', id:'call_for_revenge'});
            msg.c('body').t('The villagers want revenge! They suspect that one of the villagers is a werewolf. They want to hang him.');
            self.client.send(msg);

            msg = new xmpp.Message({to:room_jid, type:'groupchat', id:'request_votes'});
            msg.c('body').t(REQUEST_VOTE + self.livePlayers);
            self.client.send(msg);
        }

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
                    util.log('sending invitations to ' + toInvite);
                    // invite toInvite
                    toInvite.forEach(function (p) {
                        invite(p);
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
            if (participant != nick_name && !presence.type) {
                util.log('great to see ' + participant + ' in the village.');
                players.push(new Player(participant));
            }
            if (players.length == toInvite.length) {
                self.removeListener('presence', listenForPlayerArrival);
                startgame();
            }
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
                util.log(nickname + ' is the werewolf');
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
            }
        }
    }

    function startgame() {
        // stop listening for werewolves
        self.removeListener('message', listenForWerewolves);
        // if there is no werewolf yet
        if (self.liveWerewolves.length == 0) {
            players.forEach(function (player) {
                if (player.nickname == 'mo_werewolf') {
                    player.role = WEREWOLF;
                }
            });
        }
        util.log(self.liveWerewolves + ' is the werewolf');
        self.emit(NIGHTFALL);
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
                    self.emit(DAWN, victim);
                } else {
                    askWerewolfWhoToEat();
                }
            }
        }
    }

    function listenForVotes(message) {
        const from = self.parse_user(message.from)[3];
        const body = message.getChild('body');
        if (body) {
            if (self.livePlayers.indexOf(from) >= 0) {
                const text = body.getText();
                const voteMatchResult = text.match(VOTE_REGEXP);
                const promptForRevote = makeNewGroupChatMessage(room_jid);
                if (voteMatchResult) {
                    const victim = voteMatchResult[1];
                    if (victim != from) {
                        if (self.livePlayers.indexOf(victim) >= 0) {
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

                                if(self.liveWerewolves <= 0){
                                    self.removeListener('message', listenForVotes);
                                    var msg = makeNewGroupChatMessage(room_jid);
                                    msg.c('body').t(VILLAGERS_WIN_ANNOUNCEMENT);
                                    self.client.send(msg);
                                    msg = makeNewGroupChatMessage(room_jid);
                                    msg.c('body').t('Congratulations ' + self.livePlayers);
                                    self.end('The villagers won! Well done ' + self.livePlayers);
                                }else{
                                    self.emit(NIGHTFALL);
                                }
                            }
                        } else {
                            promptForRevote.c('body').t(from + ONLY_VOTES_FOR_LIVE_PLAYERS + self.livePlayers);
                            self.client.send(promptForRevote);
                        }
                    } else {
                        promptForRevote.c('body').t(from + NO_VOTES_FOR_SELF);
                        self.client.send(promptForRevote);
                    }
                }
            }
        }
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

    self.on(NIGHTFALL, function () {
        startTheNight();
    });

    self.on(DAWN, function (victim) {
        startTheDay(victim);
    });

    self.on('game over', function(partingWords){
        self.end(partingWords);
    })

    self.client.once('online', function () {

        // anticipate on the presence stanza to notify us that the room has been created

        self.on('presence', listenForChatroomCreation);

        // create an instant room
        self.client.send(new xmpp.Presence({to:room_jid_and_nick_name})
        );

    });
}

util.inherits(Moderator, Resource);

Moderator.prototype.end = function (reason) {
    if (this.villageJID) {
        const iq = new xmpp.Iq({from: 'softwarewolf@' + this.srv, to:this.villageJID, type:'set'});
        iq.c('query', {xmlns:muc_ns + '#owner'})
            .c('destroy')
            .c('reason')
            .t(reason);
        this.client.send(iq);
    }
    //Moderator.super_.prototype.end.call(this);
};

module.exports = Moderator;