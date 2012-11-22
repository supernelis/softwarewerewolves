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
const VICTIM_ANNOUNCEMENT = magicStrings.getMagicString('VICTIM_ANNOUNCEMENT');
const VICTIM_ANNOUNCEMENT_REGEXP = new RegExp('^' + VICTIM_ANNOUNCEMENT + '(.+)$');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const REQUEST_VOTE_REGEXP = new RegExp('^' + REQUEST_VOTE + '\\s*(.+)$');
const VOTE = magicStrings.getMagicString('VOTE');
const HANG_ANNOUNCEMENT = magicStrings.getMagicString('HANG_ANNOUNCEMENT');
const PLAYER_LIST_REGEXP = new RegExp('([^,\\s]+)', 'g');
const DESIGNATED_AS_WEREWOLF = magicStrings.getMagicString('DESIGNATED_AS_WEREWOLF');
const DAYTIME_RESPONSE_PARTS = magicStrings.getMagicString('DAYTIME_RESPONSE');
const DAYTIME_REQUEST = magicStrings.getMagicString('DAYTIME');
const NIGHTTIME_RESPONSE_PARTS = magicStrings.getMagicString('NIGHTTIME_RESPONSE');
const NIGHTTIME_REQUEST = magicStrings.getMagicString('NIGHTTIME');
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

function TestModerator() {

    this.client = new EventEmitter();
    this.client.jid = 'MasterOfCeremoniesTest@some.server.org';
    this.client.send = function () {
    };
    Moderator.call(this, '', '', 'some.server', participants);
}

util.inherits(TestModerator, Moderator);


describe('Moderator', function () {

    var moderator = new TestModerator();
    const targetNightOrDayDuration = '1';

    function lookForSubjectChange(subject, done, message) {
        util.log('looking for subject change in ' + message);
        if (message.is('message') && message.type == 'groupchat') {
            const subjectElt = message.getChild('subject');
            if (subjectElt) {
                subjectElt.getText().should.equal(subject);
                done();
            }
        }
    }

    function assertWerewolfIsAskedWhoHeWillEat(done) {
        return function (message) {
            if (message.is('message') && message.to == moderator.villageJID + '/' + WEREWOLF_NICKNAME && message.type == 'chat') {
                message.getChild('body').getText().should.match(WHO_DO_YOU_WANT_TO_EAT_REGEXP);
                done();
            }
        };
    }

    function playerArrived(nickname) {
        const presence = new xmpp.Presence({from:moderator.villageJID + '/' + nickname});
        presence.c('x', {xlmns:"http://jabber.org/protocol/muc#user"}).c('item', {role:'participant'});
        moderator.client.emit('stanza', presence);
    }

    function villageCreated() {
        const msg = new xmpp.Presence({from: moderator.villageJID + '/MC',
            to: moderator.client.jid,
            'xmlns:stream': 'http://etherx.jabber.org/streams'});
        msg.c('x', {xlmns:MUC_USER_NS})
            .c('status', {code:110});
        moderator.client.emit('stanza', msg);
    }

    afterEach(function () {
        moderator.client.send = function () {
        };
    });

    describe('initially', function () {

        before(function () {
            moderator = new TestModerator();
        });

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

        it('remembers the players as they arrive', function () {
            assertModeratorRegistersParticipant(WEREWOLF_NICKNAME);
            assertModeratorRegistersParticipant(OTHER_NICKNAME);
            assertModeratorRegistersParticipant(ANOTHER_NICKNAME);
        });

    });

    describe('deals with werewolves', function () {

        before(function () {
            moderator = new TestModerator();
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(OTHER_NICKNAME);
        });

        describe('when a player says he wants to be a werewolf', function () {

            it('tells him that he is the werewolf', function (done) {
                var firstMessageReceived = false;
                const msg = new xmpp.Message({from:moderator.villageJID + '/' + WEREWOLF_NICKNAME, type:'chat', id:SOME_ID});
                msg.c('body').t('I want to be a ' + WEREWOLF);
                function appointWerewolf(message) {
                    if (message.is('message') && message.to == moderator.villageJID + '/' + WEREWOLF_NICKNAME && message.type == 'chat') {

                        message.getChild('body').getText().should.equal(DESIGNATED_AS_WEREWOLF);
                        message.id.should.equal(SOME_ID);
                        done();
                    }
                }
                moderator.client.send = appointWerewolf;
                moderator.client.emit('stanza', msg);
            });

            it('remembers who is the werewolf', function () {
                moderator.werewolves.length.should.equal(1);
                moderator.werewolves.should.include(WEREWOLF_NICKNAME);
            });
        });

        describe('when the night falls', function () {

            it('asks the werewolf who it wants to eat', function (done) {
                moderator.client.send = assertWerewolfIsAskedWhoHeWillEat(done);
                moderator.emit(NIGHTFALL);
            });
        });

        describe('when the werewolf says who he wants to eat', function () {

            before(function(){
               moderator.emit(NIGHTFALL);
            });

            it('starts the day, tells the villagers who has been eaten and asks them for their votes', function (done) {
                var firstMessageReceived = false, secondMessageReceived = false;
                const msg = new xmpp.Message({from: moderator.villageJID + '/' + WEREWOLF_NICKNAME, type:'chat', id:SOME_ID});
                msg.c('body').t(I_EAT + OTHER_NICKNAME);
                moderator.client.send = function (message) {
                    util.log('sending ' + message);
                    if (message.is('message') && message.to == moderator.villageJID && message.type == 'groupchat') {
                        const body = message.getChild('body');
                        if (!firstMessageReceived) {
                            message.getChild('subject').getText().should.equal(DAY);
                            firstMessageReceived = true;
                        } else if (!secondMessageReceived && body) {
                            const victimAnnouncementMatchResult = body.getText().match(VICTIM_ANNOUNCEMENT_REGEXP);
                            if (victimAnnouncementMatchResult) {
                                victimAnnouncementMatchResult[1].should.equal(OTHER_NICKNAME);
                                secondMessageReceived = true;
                            }
                        } else if (body) {
                            const requestVotesMatchResult = body.getText().match(REQUEST_VOTE_REGEXP);
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
                };
                moderator.client.emit('stanza', msg);
            });

            it('remembers that the eaten player is dead', function () {
                moderator.livePlayers.should.not.include(OTHER_NICKNAME);
            });
        });

    });

    describe('choreographs hangings', function(){

        function vote(voter, votee) {
            const v = new xmpp.Message({from:moderator.villageJID + '/' + voter});
            v.c('body').t(VOTE + votee);
            moderator.client.emit('stanza', v);
        }

        before(function () {
            moderator = new TestModerator();
            moderator.client.emit('online');
            villageCreated();
            playerArrived(WEREWOLF_NICKNAME);
            playerArrived(OTHER_NICKNAME);
            playerArrived(ANOTHER_NICKNAME);
            moderator.emit(DAWN, ONE_MORE_NICKNAME);
        });

        describe('when a vote is received', function () {

            before(function () {
                vote(WEREWOLF_NICKNAME, ANOTHER_NICKNAME);
            });

            it('records the vote', function () {
                const votes = moderator.votes;
                votes.length.should.equal(1);
                const vote = votes[0];
                vote.should.equal(ANOTHER_NICKNAME);
            })
        });

        describe('when all votes have arrived', function () {

            it('announces who shall be hanged', function (done) {
                function onAnnounceHanging(message) {
                    const hangingAnnouncement = message.getChild('body').getText();
                    const matchResult = hangingAnnouncement.match(HANG_ANNOUNCEMENT + '\\s*(.+)$');
                    should.exist(matchResult);
                    matchResult[1].should.equal(ANOTHER_NICKNAME);
                    moderator.client.send = function () {
                    };
                    done();
                }

                moderator.client.send = onAnnounceHanging;
                vote(ANOTHER_NICKNAME, WEREWOLF_NICKNAME);
                vote(ONE_MORE_NICKNAME, ANOTHER_NICKNAME);

            });

            it('remembers who was hanged', function () {
                moderator.livePlayers.should.not.include(ANOTHER_NICKNAME);
            });

            it('starts the night', function () {
                moderator.should.have.property('phase', NIGHT);
            })
        });

    });

    describe('receiving a NIGHTTIME message', function () {
        it('responds with the current nighttime duration', function (done) {
            const msg = new xmpp.Message({from:somePlayer});
            msg.c('body').t(magicStrings.getMagicString('NIGHTTIME'));
            moderator.client.send = function (message) {
                const body = message.getChild('body');
                if (message.is('message') && body) {
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + NIGHTTIME_RESPONSE_PARTS[0] + '\\d+' + NIGHTTIME_RESPONSE_PARTS[1] + '$'));
                    if (matchResult) {
                        done();
                    }
                }
            };
            moderator.client.emit('stanza', msg);
        });
    });

    describe('receiving a DAYTIME message', function () {
        it('responds with the current daytime duration', function (done) {
            const msg = new xmpp.Message({from:somePlayer});
            msg.c('body').t(DAYTIME_REQUEST);
            moderator.client.send = function (message) {
                const body = message.getChild('body');
                if (message.is('message') && body) {
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + DAYTIME_RESPONSE_PARTS[0] + '\\d+' + DAYTIME_RESPONSE_PARTS[1] + '$'));
                    if (matchResult) {
                        done();
                    }
                }
            };
            moderator.client.emit('stanza', msg);
        });

        it('resets the duration', function (done) {
            const msg = new xmpp.Message({from:somePlayer});
            msg.c('body').t(DAYTIME_REQUEST + targetNightOrDayDuration);
            function validateSetDurationIsEchoed(message) {
                const body = message.getChild('body');
                if (message.is('message') && body) {
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + DAYTIME_RESPONSE_PARTS[0] + '(\\d+)' + DAYTIME_RESPONSE_PARTS[1] + '$'));
                    if (matchResult) {
                        matchResult[1].should.equal(targetNightOrDayDuration);
                    }
                }
                done();
            }

            moderator.client.send = validateSetDurationIsEchoed;
            moderator.client.emit('stanza', msg);

        });

    });

    describe('#end', function () {
        it('destroys the room', function () {
        });
    });


});