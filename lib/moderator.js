const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Player = require('./player');
const BotXmppHelper = require('./bot_xmpp_helper');
const Bot = require('./bot');
const HashTable = require('./keyvalue');

const nick_name = "MC";
const muc_ns = 'http://jabber.org/protocol/muc';

const Resource = require('./resource');

const GAMETIME = magicStrings.getMagicString('GAMETIME');
const WEREWOLF_ELECTION_TIME = magicStrings.getMagicString('WEREWOLF_ELECTION_TIME');
const DAYTIME_REQUEST = magicStrings.getMagicString('DAYTIME');
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
const TOO_LATE_TO_EAT = magicStrings.getMagicString('TOO_LATE_TO_EAT');
const VICTIM_ANNOUNCEMENT = magicStrings.getMagicString('VICTIM_ANNOUNCEMENT');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const VOTE = magicStrings.getMagicString('VOTE');
const NO_VOTES_FOR_SELF = magicStrings.getMagicString('NO_VOTES_FOR_SELF');
const ONLY_VOTES_FOR_LIVE_PLAYERS = magicStrings.getMagicString('ONLY_VOTES_FOR_LIVE_PLAYERS');
const VOTE_REGEXP = new RegExp('^' + VOTE + '\\s*(.+)$');
const HANG_ANNOUNCEMENT = magicStrings.getMagicString('HANG_ANNOUNCEMENT');
const WEREWOLVES_WIN_ANNOUNCEMENT = magicStrings.getMagicString('WEREWOLVES_WIN_ANNOUNCEMENT');
const VILLAGERS_WIN_ANNOUNCEMENT = magicStrings.getMagicString('VILLAGERS_WIN_ANNOUNCEMENT');
const NO_DOUBLE_VOTE = magicStrings.getMagicString('NO_DOUBLE_VOTE');
const GAME_TIMED_OUT = magicStrings.getMagicString('GAME_TIMED_OUT');

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

function Moderator(jid, password, host, toInvite, roomJID) {

    const self = this;

    Resource.call(this, jid, password, host);

    const room_jid_and_nick_name = roomJID + '/' + nick_name;
    const ROOM_JID_AND_NICKNAME_REGEXP = new RegExp('^' + roomJID + '\/(.+)$');

    var players = [];
    var phase;
    var votes = new HashTable();

    var electionDuration = 30000;
    // set a timeout to start the game
    // export so that it can be unset in tests
    this.werewolfElectionId = setTimeout(startgame, electionDuration);

    this.__defineGetter__('villageJID', function () {
        return roomJID;
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
        return votes.values();
    });

    function whisperToWerewolf(txt) {
        const msg = new xmpp.Message({to:roomJID + '/' + self.liveWerewolves[0], type:'chat'});
        msg.c('body').t(txt);
        self.client.send(msg);
    }

    function invite(p) {
        const msg = new xmpp.Message({to:roomJID, id:'invitation' + Math.floor(Math.random() * 1000)});
        msg.c('x', {xmlns:muc_ns + '#user', jid:roomJID})
            .c('invite', {to:p})
            .c('reason')
            .t('come and join the werewolf game');
        self.client.send(msg);
    }

    function makeReplyMessage(message) {
        const msg = new xmpp.Message({to:message.from});
        const id = message.id;
        const type = message.type;
        if (id) {
            msg.id = id;
        }
        if (type) {
            msg.type = type;
        }
        return msg;
    }

    function startTheNight() {
        util.log('starting night');
        self.removeListener('message', listenForVotes);
        clearTimeout(self.dayId);
        self.on('message', listenForEats);
        self.nightId = setTimeout(function () {
            self.emit(DAWN);
        }, nighttime);
        phase = NIGHT;
        var msg = new xmpp.Message({to:roomJID, type:'groupchat'});
        msg.c('subject')
            .t(phase);
        self.client.send(msg);
        whisperToWerewolf(WHO_DO_YOU_WANT_TO_EAT + self.liveVillagers);
    }

    function startTheDay(victim) {
        util.log('dawn is breaking');
        self.removeListener('message', listenForEats);
        clearTimeout(self.nightId);
        self.dayId = setTimeout(conductHanging, daytime);
        phase = DAY;
        votes = new HashTable();
        var msg = makeNewGroupChatMessage(roomJID);
        msg.c('subject')
            .t(phase);
        self.client.send(msg);
        msg = makeNewGroupChatMessage(roomJID);
        msg.c('body').t('What a beautiful dawn!');
        self.client.send(msg);
        if (victim) {
            // tell the villagers who has been eaten
            msg = makeNewGroupChatMessage(roomJID);
            msg.c('body').t('But what is this?');
            self.client.send(msg);
            msg = makeNewGroupChatMessage(roomJID);
            msg.c('body').t(VICTIM_ANNOUNCEMENT + victim);
            self.client.send(msg);
        } else {
            whisperToWerewolf(TOO_LATE_TO_EAT);
        }
        if (self.liveVillagers.length <= self.liveWerewolves.length) {
            msg = makeNewGroupChatMessage(roomJID);
            msg.c('body').t(WEREWOLVES_WIN_ANNOUNCEMENT);
            self.client.send(msg);
            clearTimeout(self.dayId);
            self.emit('game over', 'the werewolves ate everyone in the village. ' + self.liveWerewolves + ' was the werewolf.');
        } else {
            // ask the villagers who they want to hang
            msg = makeNewGroupChatMessage(roomJID);
            if (victim) {
                msg.c('body').t('The villagers want revenge! They suspect that one of the villagers is a werewolf.');
            } else {
                msg.c('body').t('No-one has been eaten! But the villagers remember the killings of the past and feel sure that one of them is the werewolf.');
            }
            self.client.send(msg);
            msg = makeNewGroupChatMessage(roomJID);
            msg.c('body').t('They want to hang him.');
            self.client.send(msg);
            msg = new xmpp.Message({to:roomJID, type:'groupchat', id:'request_votes'});
            msg.c('body').t(REQUEST_VOTE + self.livePlayers);
            self.client.send(msg);

            self.on('message', listenForVotes);
        }

    }


    function resetTimer(message, regexp) {
        var result;
        const body = message.getChild('body');
        if (body) {
            const text = body.getText();
            const matchResult = text.match(regexp);
            if (matchResult) {
                if (matchResult[1]) {
                    result = matchResult[1] * 1000;
                }
            }
        }
        return result;
    }


    function acknowledgeTimerReset(command, replyPrefix, duration) {
        const msg = makeReplyMessage(command);
        msg.c('body').t(replyPrefix + duration / 1000 + 's');
        self.client.send(msg);
    }

    function executeTimerResetCommandAndAck(duration, timerId, command, replyPrefix, fn) {
        clearTimeout(timerId);
        acknowledgeTimerReset(command, replyPrefix, duration);
        return setTimeout(fn, duration);
    }

    function listenForWerewolfElectionDurationCommands(message) {
        const regexp = WEREWOLF_ELECTION_TIME + '(\\d+)$';
        const requestedDuration = resetTimer(message, regexp);
        if (requestedDuration) {
            electionDuration = requestedDuration;
            this.werewolfElectionId = executeTimerResetCommandAndAck(electionDuration, this.werewolfElectionId, message, WEREWOLF_ELECTION_TIME, startgame)
        }
    }

    var gameDuration = 1800000;

    function timeIsUp() {
        const msg = makeNewGroupChatMessage(roomJID);
        msg.c('body').t(GAME_TIMED_OUT);
        self.send(msg);
        clearTimeout(self.dayId);
        clearTimeout(self.nightId);
        self.emit('game over', 'time is up');
    }

    this.gameDurationTimerId = setTimeout(timeIsUp, gameDuration);

    function listenForGameDurationCommands(message) {
        const regexp = GAMETIME + '(\\d+)$';
        const requestedDuration = resetTimer(message, regexp);
        if (requestedDuration) {
            gameDuration = requestedDuration;
            this.gameDurationTimerId = executeTimerResetCommandAndAck(gameDuration, this.gameDurationTimerId, message, GAMETIME, timeIsUp)
        }
    }

    var daytime = 45000;

    function listenForDayDurationCommands(message) {
        const regexp = DAYTIME_REQUEST_REGEXP;
        const requestedDuration = resetTimer(message, regexp);
        if (requestedDuration) {
            daytime = requestedDuration;
            acknowledgeTimerReset(message, DAYTIME_REQUEST, daytime);
        }
    }

    var nighttime = 30000;


    function listenForNightDurationCommands(message) {
        const regexp = NIGHTTIME_REQUEST_REGEXP;
        const requestedDuration = resetTimer(message, regexp);
        if (requestedDuration) {
            nighttime = requestedDuration;
            acknowledgeTimerReset(message, NIGHTTIME_REQUEST, nighttime);
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
        const strlen = roomJID.length;
        const fromMatchResult = from.match(ROOM_JID_AND_NICKNAME_REGEXP);
        if (fromMatchResult) {
            const participant = fromMatchResult[1];
            if (participant != nick_name && !presence.type) {
                players.push(new Player(participant));
            }
            if (players.length == toInvite.length) {
                self.removeListener('presence', listenForPlayerArrival);
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
            const from = message.from;
            if (from) {
                const roomAndNicknameMatchResult = from.match(ROOM_JID_AND_NICKNAME_REGEXP);
                if (werewolfMatchResult && roomAndNicknameMatchResult && message.type == 'chat') {
                    self.removeListener('message', listenForWerewolves);
                    const nickname = roomAndNicknameMatchResult[1];
                    util.log(nickname + ' is the werewolf');
                    const id = message.id;
                    const type = message.type;
                    const msg = new xmpp.Message({to:from});
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
    }

    function startgame() {
        // stop listening for election duration set commands
        self.removeListener('message', listenForWerewolfElectionDurationCommands);
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
                    whisperToWerewolf(WHO_DO_YOU_WANT_TO_EAT + self.liveVillagers);
                }
            }
        }
    }

    function conductHanging() {
        const announcement = makeNewGroupChatMessage(roomJID);
        const toBeHanged = mode(votes.values());
        players.forEach(function (p) {
            if (p.nickname == toBeHanged) {
                p.lives = false;
            }
        });
        announcement.c('body').t(HANG_ANNOUNCEMENT + toBeHanged);
        self.client.send(announcement);

        if (self.liveWerewolves <= 0) {
            self.removeListener('message', listenForVotes);
            var msg = makeNewGroupChatMessage(roomJID);
            msg.c('body').t(VILLAGERS_WIN_ANNOUNCEMENT);
            self.client.send(msg);
            clearTimeout(self.dayId);
            self.emit('game over', 'The villagers won! Well done ' + self.livePlayers);
        } else {
            self.emit(NIGHTFALL);
        }
    }

    function listenForVotes(message) {
        const from = self.parse_user(message.from)[3];
        const body = message.getChild('body');
        if (body) {
            if (self.livePlayers.indexOf(from) >= 0) {
                const text = body.getText();
                const voteMatchResult = text.match(VOTE_REGEXP);
                const promptForRevote = makeNewGroupChatMessage(roomJID);
                if (voteMatchResult) {
                    const victim = voteMatchResult[1];
                    if (victim != from) {
                        if (self.livePlayers.indexOf(victim) >= 0) {
                            if (!votes.hasItem(from)) {
                                votes.setItem(from, victim);
                                if (votes.length == self.livePlayers.length) {
                                    conductHanging();
                                }
                            } else {
                                promptForRevote.c('body').t(from + NO_DOUBLE_VOTE);
                                self.client.send(promptForRevote);
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

    self.on('message', listenForWerewolfElectionDurationCommands);

    self.on('message', listenForGameDurationCommands);

    self.on('message', listenForDayDurationCommands);

    self.on('message', listenForNightDurationCommands);

    self.on(NIGHTFALL, function () {
        startTheNight();
    });

    self.on(DAWN, function (victim) {
        startTheDay(victim);
    });

    self.client.once('online', function () {

        // anticipate on the presence stanza to notify us that the room has been created

        self.on('presence', listenForChatroomCreation);

        // create an instant room
        self.client.send(new xmpp.Presence({to:room_jid_and_nick_name}));
    });
}

util.inherits(Moderator, Resource);

module.exports = Moderator;