const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const Player = require('../lib/player');
const Moderator = require('../lib/moderator');

const EventEmitter = require('events').EventEmitter;

// events emitted by class under test
const NIGHTFALL = 'nightfall';
const DAWN = 'dawn';

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const VILLAGER = magicStrings.getMagicString('VILLAGER');
const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
const WHO_DO_YOU_WANT_TO_EAT = magicStrings.getMagicString('WHO_DO_YOU_WANT_TO_EAT');
const WHO_DO_YOU_WANT_TO_EAT_REGEXP = new RegExp('^' + WHO_DO_YOU_WANT_TO_EAT + '((.+),?\s*)+$');
const I_EAT = magicStrings.getMagicString('I_EAT');
const TOO_LATE_TO_EAT = magicStrings.getMagicString('TOO_LATE_TO_EAT');
const VICTIM_ANNOUNCEMENT = magicStrings.getMagicString('VICTIM_ANNOUNCEMENT');
const VICTIM_ANNOUNCEMENT_REGEXP = new RegExp('^' + VICTIM_ANNOUNCEMENT + '(.+)$');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const REQUEST_VOTE_REGEXP = new RegExp('^' + REQUEST_VOTE + '\\s*(.+)$');
const VOTE = magicStrings.getMagicString('VOTE');
const NO_VOTES_FOR_SELF = magicStrings.getMagicString('NO_VOTES_FOR_SELF');
const ONLY_VOTES_FOR_LIVE_PLAYERS = magicStrings.getMagicString('ONLY_VOTES_FOR_LIVE_PLAYERS');
const HANG_ANNOUNCEMENT = magicStrings.getMagicString('HANG_ANNOUNCEMENT');
const PLAYER_LIST_REGEXP = new RegExp('([^,\\s]+)', 'g');
const DESIGNATED_AS_WEREWOLF = magicStrings.getMagicString('DESIGNATED_AS_WEREWOLF');
const DAYTIME_REQUEST = magicStrings.getMagicString('DAYTIME');
const NIGHTTIME_REQUEST = magicStrings.getMagicString('NIGHTTIME');
const WEREWOLF_ELECTION_TIME = magicStrings.getMagicString('WEREWOLF_ELECTION_TIME');
const GAMETIME = magicStrings.getMagicString('GAMETIME');
const WEREWOLVES_WIN_ANNOUNCEMENT = magicStrings.getMagicString('WEREWOLVES_WIN_ANNOUNCEMENT');
const DAY = magicStrings.getMagicString('DAY');
const NIGHT = magicStrings.getMagicString('NIGHT');
const somePlayer = 'fred_villager@jabber.org';
const someOtherPlayer = 'mo_werewolf@jabber.org';
const anotherPlayer = 'another.player@some.server';
const oneMorePlayer = 'one.more.player@some.server';
const participants = [somePlayer, someOtherPlayer, anotherPlayer, oneMorePlayer];
const WEREWOLF_NICKNAME = 'werewolf_nickname';
const OTHER_NICKNAME = 'other_nickname';
const ANOTHER_NICKNAME = 'another_nickname';
const ONE_MORE_NICKNAME = 'one_more_nickname';
const SOME_ID = 'something random';
const MUC_USER_NS = 'http://jabber.org/protocol/muc#user';
const VILLAGERS_WIN_ANNOUNCEMENT = magicStrings.getMagicString('VILLAGERS_WIN_ANNOUNCEMENT');
const NO_DOUBLE_VOTE = magicStrings.getMagicString('NO_DOUBLE_VOTE');
const GAME_TIMED_OUT = magicStrings.getMagicString('GAME_TIMED_OUT');

function TestModerator() {

    this.client = new EventEmitter();
    this.client.jid = 'MasterOfCeremoniesTest@some.server.org';
    Moderator.call(this, '', '', 'some.server', participants, 'village123@conference.some.server');
    this.client.socket = new Object();
    this.client.end = function () {
    };
    this.client.send = function () {
    };
}

util.inherits(TestModerator, Moderator);


describe('Moderator', function () {

    var moderator;
    const targetNightOrDayDuration = '1';

    beforeEach(function () {
        moderator = new TestModerator();
    });

    afterEach(function () {
        clearTimeout(moderator.werewolfElectionId);
        clearTimeout(moderator.dayId);
        clearTimeout(moderator.nightId);
        clearTimeout(moderator.gameDurationTimerId);
        moderator.end();
        moderator.client.send = function (msg) {
            util.error('spurious send: ' + msg);
        };
    });

    describe('protected by a global timeout,', function () {

        const msg = new xmpp.Message({from:somePlayer});
        msg.c('body').t(GAMETIME + 1);

        it('which can be configured', function (done) {
            moderator.client.send = function (message) {
                const body = message.getChild('body');
                if (message.is('message') && body) {
                    body.getText().should.equal(GAMETIME + 1 + 's');
                    done();
                }
            };
            moderator.client.emit('stanza', msg);
        });

        it('terminates the game when the timer goes off', function (done) {
             moderator.client.send = function (message) {
                const body = message.getChild('body');
                if (message.is('message') && body && body.getText() == GAME_TIMED_OUT) {
                    done();
                }
            };
            moderator.client.emit('stanza', msg);
        });

    });

    describe('initially', function () {

        it('creates a room', function (done) {
            moderator.client.send = function (stanza) {
                const to = stanza.to;
                if (stanza.is('presence') && to) {
                    to.should.match(/^(village\d+@[^\/]+)\/MC$/);
                    done();
                }
            };
            moderator.client.emit('online');
        });

        it('invites all interested participants', function (done) {
            var stillToInvite = participants.map(function (p) {
                return p
            });
            moderator.client.send = function (stanza) {
                if (stanza.is('message')) {
                    const x = stanza.getChild('x');
                    if (x && x.is('x', MUC_USER_NS) && x.attr('jid') == moderator.villageJID) {
                        const invite = x.getChild('invite');
                        if (invite) {
                            const participant = invite.attr('to');
                            util.log('participant: ' + participant);
                            stillToInvite.indexOf(participant).should.not.be.below(0);
                            stillToInvite = stillToInvite.filter(function (p) {
                                return p != participant
                            });
                            if (stillToInvite.length == 0) {
                                done();
                            }
                        }
                    }
                }
            };
            moderator.client.emit('online');
            villageCreated();
        });

    });

    describe('when players enter the room', function () {

        function assertModeratorRegistersParticipant(nickname) {
            const oldPlayersLength = moderator.players.length;
            playerArrived(nickname);
            moderator.players.should.include(nickname);
            moderator.players.length.should.equal(oldPlayersLength + 1);
        }

        beforeEach(function () {
            moderator.client.emit('online');
            villageCreated();
        });

        it('remembers the players as they arrive', function () {
            assertModeratorRegistersParticipant(WEREWOLF_NICKNAME);
            assertModeratorRegistersParticipant(OTHER_NICKNAME);
            assertModeratorRegistersParticipant(ANOTHER_NICKNAME);
            assertModeratorRegistersParticipant(ONE_MORE_NICKNAME);
        });

        it('waits a configured amount of time and then starts the game', function (done) {
            moderator.client.send = function (message) {
                if (message.is('message') && message.to == moderator.villageJID && message.type == 'groupchat') {
                    const subject = message.getChild('subject');
                    if (subject) {
                        clearTimeout(moderator.werewolfElectionId);
                        subject.getText().should.equal(NIGHT);
                        done();
                    }
                }
            };
            const msg = new xmpp.Message();
            msg.c('body').t(WEREWOLF_ELECTION_TIME + 1);
            moderator.client.emit('stanza', msg);
        });

    });

    describe('deals with werewolves', function () {

        beforeEach(function () {
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(OTHER_NICKNAME);
            playerArrived(ANOTHER_NICKNAME);
        });

        describe('when a player says he wants to be a werewolf', function () {

            it('tells him that he is the werewolf', function (done) {
                function appointWerewolf(message) {
                    if (message.is('message') && message.to == moderator.villageJID + '/' + WEREWOLF_NICKNAME && message.type == 'chat') {
                        message.getChild('body').getText().should.equal(DESIGNATED_AS_WEREWOLF);
                        message.id.should.equal(SOME_ID);
                        done();
                    }
                }
                moderator.client.send = appointWerewolf;
                registerWerewolf();
            });

            it('remembers who is the werewolf', function () {
                registerWerewolf();
                moderator.liveWerewolves.length.should.equal(1);
                moderator.liveWerewolves.should.include(WEREWOLF_NICKNAME);
            });
        });

        describe('when the night falls', function () {

            it('asks the werewolf who it wants to eat', function (done) {
                registerWerewolf();
                moderator.client.send = assertWerewolfIsAskedWhoHeWillEat(done);
                moderator.emit(NIGHTFALL);
            });
        });

        describe('when the werewolf says who he wants to eat', function () {

            beforeEach(function () {
                registerWerewolf();
                playerArrived(ONE_MORE_NICKNAME);
                moderator.emit(NIGHTFALL);
            });

            it('starts the day, tells the villagers who has been eaten and asks them for their votes', function (done) {

                function assertVotesRequested(message) {
                    if (message.is('message') && message.to == moderator.villageJID && message.type == 'groupchat') {
                        if (message.getChild('body')) {
                            const requestVotesMatchResult = message.getChild('body').getText().match(REQUEST_VOTE_REGEXP);
                            if (requestVotesMatchResult) {
                                const options = requestVotesMatchResult[1];
                                const playerListMatchResult = options.match(PLAYER_LIST_REGEXP);
                                moderator.livePlayers.forEach(function (p) {
                                    playerListMatchResult.indexOf(p).should.not.be.below(0);
                                });
                                playerListMatchResult.forEach(function (p) {
                                    moderator.livePlayers.indexOf(p).should.not.be.below(0);
                                })
                                done();
                            }
                        }
                    }
                }

                moderator.client.send = assertDaybreak(assertVotesRequested);
                werewolfEats(OTHER_NICKNAME);
            });

            it('remembers that the eaten player is dead', function () {
                werewolfEats(OTHER_NICKNAME);
                moderator.livePlayers.should.not.include(OTHER_NICKNAME);
            });
        });

        describe('when the werewolf does not respond before dawn', function () {

            var nbrOfLivePlayers;

            beforeEach(function () {
                registerWerewolf();
                nbrOfLivePlayers = moderator.livePlayers.length;
            });

            it('tells him that time is up', function (done) {
                moderator.client.send = assertWerewolfTriesToEatTooLate(done);
                moderator.emit(DAWN);
                werewolfEats(ANOTHER_NICKNAME);
            });

            it('knows that the stated victim is not dead', function () {
                moderator.livePlayers.length.should.equal(nbrOfLivePlayers);
                moderator.livePlayers.should.include(ANOTHER_NICKNAME);
            });

        });

    });

    describe('choreographs hangings', function () {

        beforeEach(function () {
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(OTHER_NICKNAME);
            playerArrived(ANOTHER_NICKNAME);
        });

        describe('when a vote is received', function () {

            beforeEach(function () {
                moderator.emit(DAWN, ONE_MORE_NICKNAME);
                vote(WEREWOLF_NICKNAME, ANOTHER_NICKNAME);
            });

            it('records the vote if the vote is valid', function () {
                const votes = moderator.votes;
                votes.length.should.equal(1);
                const vote = votes[0];
                vote.should.equal(ANOTHER_NICKNAME);
            });

            it('protests when someone tries to vote a second time', function (done) {
                moderator.client.send = function (message) {
                    if (message.is('message') && message.to == moderator.villageJID && message.type == 'groupchat') {
                        if (message.getChild('body')) {
                            util.log(message.getChild('body').getText());
                            const matchResult = message.getChild('body').getText().match('.*' + NO_DOUBLE_VOTE + '$');
                            should.exist(matchResult);
                            done();
                        }
                    }
                };
                vote(WEREWOLF_NICKNAME, OTHER_NICKNAME);
            });

            it('prompts a player who votes for himself to vote again', function (done) {
                moderator.client.send = function (message) {
                    const body = message.getChild('body');
                    if (message.is('message') && body) {
                        body.getText().should.equal(WEREWOLF_NICKNAME + NO_VOTES_FOR_SELF);
                        done();
                    }
                };
                vote(WEREWOLF_NICKNAME, WEREWOLF_NICKNAME);
            });

            it('prompts a player who votes for someone who is not in the game to vote again', function (done) {
                moderator.client.send = function (message) {
                    const body = message.getChild('body');
                    if (message.is('message') && body) {
                        body.getText().should.equal(WEREWOLF_NICKNAME + ONLY_VOTES_FOR_LIVE_PLAYERS + moderator.livePlayers);
                        done();
                    }
                };
                vote(WEREWOLF_NICKNAME, ONE_MORE_NICKNAME);
            });

            it('ignores the vote if the vote is invalid', function () {
                vote('testalsdkfjlaskdjflaksdj', WEREWOLF_NICKNAME); // vote by someone who does not exist
                vote(WEREWOLF_NICKNAME, 'testalsdkfjlaskdjflaksdj'); // vote on someone who does not exist
                vote(ONE_MORE_NICKNAME, WEREWOLF_NICKNAME); // dead one who tries to vote

                const votes = moderator.votes;
                votes.length.should.equal(1);
                const v = votes[0];
                v.should.equal(ANOTHER_NICKNAME);

            });

        });

        describe('when all votes have arrived', function () {

            beforeEach(function () {
                moderator.emit(DAWN, ONE_MORE_NICKNAME);
            });

            it('announces who shall be hanged', function (done) {
                moderator.client.send = assertAnnounceHanging(ANOTHER_NICKNAME, done);
                vote(ANOTHER_NICKNAME, WEREWOLF_NICKNAME);
                vote(OTHER_NICKNAME, ANOTHER_NICKNAME);
                vote(WEREWOLF_NICKNAME, ANOTHER_NICKNAME);
                moderator.livePlayers.should.not.include(ANOTHER_NICKNAME);
            });
        });

        describe('when not everyone votes before the end of the day', function () {

            beforeEach(function () {
                playerArrived(ONE_MORE_NICKNAME);
                registerWerewolf();
                sendResetTimerCommand(DAYTIME_REQUEST, targetNightOrDayDuration);
                moderator.emit(DAWN);
            });

            it('hangs the player with the most votes', function (done) {
                moderator.client.send = assertAnnounceHanging(ANOTHER_NICKNAME, done);
                vote(ANOTHER_NICKNAME, WEREWOLF_NICKNAME);
                vote(OTHER_NICKNAME, ANOTHER_NICKNAME);
                vote(WEREWOLF_NICKNAME, ANOTHER_NICKNAME);
            });
        });


    });

    describe('receiving a NIGHTTIME message', function () {

        it('resets NIGHTTIME duration', function (done) {
            moderator.client.send = makeAssertResetTimerAckedFn(NIGHTTIME_REQUEST, done);
            sendResetTimerCommand(NIGHTTIME_REQUEST, targetNightOrDayDuration);
        });

        it('triggers daybreak after the set NIGHTTIME duration', function (done) {
            moderator.on(DAWN, function () {
                done();
            });
            sendResetTimerCommand(NIGHTTIME_REQUEST, targetNightOrDayDuration);
            moderator.emit(NIGHTFALL);
        });

    });

    describe('receiving a DAYTIME message', function () {

        beforeEach(function () {
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(OTHER_NICKNAME);
            playerArrived(ANOTHER_NICKNAME);
            playerArrived(ONE_MORE_NICKNAME);
            registerWerewolf();
        });

        it('resets DAYTIME duration', function (done) {
            moderator.client.send = makeAssertResetTimerAckedFn(DAYTIME_REQUEST, done);
            sendResetTimerCommand(DAYTIME_REQUEST, targetNightOrDayDuration);
        });

        it('triggers nightfall after the set DAYTIME duration', function (done) {
            moderator.on(NIGHTFALL, function () {
                done();
            });
            sendResetTimerCommand(DAYTIME_REQUEST, targetNightOrDayDuration);
            moderator.emit(DAWN);
        });

    });

    describe('when the number of werewolves is equal to the number of villagers at the start of the day', function () {

        beforeEach(function () {
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(ANOTHER_NICKNAME);
            registerWerewolf();
        });

        it('makes the werewolves win (announcement, game ends, MC leaves village)', function (done) {
            function assertAnnounceWerewolfWin(message) {
                const body = message.getChild('body');
                if (message.is('message') && body) {
                    body.getText().should.equal(WEREWOLVES_WIN_ANNOUNCEMENT);
                    done();
                }
            };
            moderator.client.send = assertDaybreak(assertAnnounceWerewolfWin);

            moderator.emit(DAWN, OTHER_NICKNAME);
        });

    });

    describe('when the villages hangs the last werewolf', function () {

        beforeEach(function () {
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(ANOTHER_NICKNAME);
            playerArrived(ONE_MORE_NICKNAME);
            registerWerewolf();

            moderator.emit(DAWN, OTHER_NICKNAME);
        });

        it('makes the villagers win (announcement, MC leaves village)', function (done) {

            function assertAnnounceVillagersWin(message) {
                const body = message.getChild('body');
                if (message.is('message') && body) {
                    body.getText().should.equal(VILLAGERS_WIN_ANNOUNCEMENT);
                    done();
                }
            };
            moderator.client.send = skipMessage(assertAnnounceVillagersWin);

            vote(ANOTHER_NICKNAME, WEREWOLF_NICKNAME);
            vote(ONE_MORE_NICKNAME, WEREWOLF_NICKNAME);
            vote(WEREWOLF_NICKNAME, ONE_MORE_NICKNAME);
        });
    });

    function vote(voter, votee) {
        const v = new xmpp.Message({from:moderator.villageJID + '/' + voter});
        v.c('body').t(VOTE + votee);
        moderator.client.emit('stanza', v);
    }

    function assertWerewolfIsAskedWhoHeWillEat(done) {
        return function (message) {
            if (message.is('message') && message.to == moderator.villageJID + '/' + WEREWOLF_NICKNAME && message.type == 'chat') {
                message.getChild('body').getText().should.match(WHO_DO_YOU_WANT_TO_EAT_REGEXP);
                done();
            }
        };
    }

    function assertWerewolfTriesToEatTooLate(done) {
        return function (message) {
            util.log('expecting to be told it is too late to eat, receiving ' + message);
            if (message.is('message') && message.to == moderator.villageJID + '/' + WEREWOLF_NICKNAME && message.type == 'chat') {
                message.getChild('body').getText().should.equal(TOO_LATE_TO_EAT);
                done();
            }
        };
    }

    function assertAnnounceHanging(toHang, done) {
        return function (message) {
            const body = message.getChild('body');
            if (body) {
                const matchResult = body.getText().match(HANG_ANNOUNCEMENT + '\\s*(.+)$');
                if (matchResult) {
                    matchResult[1].should.equal(toHang);
                    done();
                }
            }
            moderator.livePlayers.should.not.include(toHang);
        }
    }

    function skipMessage(done) {
        return function (message) {
            moderator.client.send = done;
        }
    }

    function assertDaybreak(fn) {
        return function (message) {
            if (message.is('message') && message.to == moderator.villageJID && message.type == 'groupchat') {
                const subject = message.getChild('subject');
                if (subject) {
                    subject.getText().should.equal(DAY);
                    moderator.client.send = assertAnnounceWhoWasEaten(fn);
                }
            }
        }
    }

    function assertAnnounceWhoWasEaten(fn) {
        return function (message) {
            if (message.is('message') && message.to == moderator.villageJID && message.type == 'groupchat') {
                if (message.getChild('body')) {
                    const victimAnnouncementMatchResult = message.getChild('body').getText().match(VICTIM_ANNOUNCEMENT_REGEXP);
                    if (victimAnnouncementMatchResult) {
                        victimAnnouncementMatchResult[1].should.equal(OTHER_NICKNAME);
                        moderator.client.send = fn;
                    }
                }
            }
        }
    }

    function playerArrived(nickname) {
        const presence = new xmpp.Presence({from:moderator.villageJID + '/' + nickname});
        presence.c('x', {xlmns:"http://jabber.org/protocol/muc#user"}).c('item', {role:'participant'});
        moderator.client.emit('stanza', presence);
    }

    function villageCreated() {
        const msg = new xmpp.Presence({from:moderator.villageJID + '/MC',
            to:moderator.client.jid,
            'xmlns:stream':'http://etherx.jabber.org/streams'});
        msg.c('x', {xlmns:MUC_USER_NS})
            .c('status', {code:110});
        moderator.client.emit('stanza', msg);
    }

    function registerWerewolf() {
        should.not.exist(moderator.phase);
        const msg = new xmpp.Message({from:moderator.villageJID + '/' + WEREWOLF_NICKNAME, type:'chat', id:SOME_ID});
        msg.c('body').t('I want to be a ' + WEREWOLF);
        moderator.client.emit('stanza', msg);
    }

    function werewolfEats(OTHER_NICKNAME2) {
        const msg = new xmpp.Message({from:moderator.villageJID + '/' + WEREWOLF_NICKNAME, type:'chat', id:SOME_ID});
        msg.c('body').t(I_EAT + OTHER_NICKNAME2);
        moderator.client.emit('stanza', msg);
    }

    function sendResetTimerCommand(timer, targetDuration) {
        const msg = new xmpp.Message({from:somePlayer});
        msg.c('body').t(timer + targetDuration);
        moderator.client.emit('stanza', msg);
    }

    function makeAssertResetTimerAckedFn(responseParts, fn) {
        return function (message) {
            const body = message.getChild('body');
            if (message.is('message') && body) {
                const text = body.getText();
                util.log('received ' + text);
                const matchResult = text.match(new RegExp('^' + responseParts + '(\\d+)s$'));
                if (matchResult) {
                    matchResult[1].should.equal(targetNightOrDayDuration);
                    fn();
                }
            }
        }
    }

})
;