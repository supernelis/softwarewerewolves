const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const Player = require('../lib/player');
const Moderator = require('../lib/moderator');

const EventEmitter = require('events').EventEmitter;

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
const WEREWOLF_NICKNAME = 'some_nickname';
const OTHER_NICKNAME = 'some_other_nickname';
const ANOTHER_NICKNAME = 'another_nickname';
const ONE_MORE_NICKNAME = 'one_more_nickname';
const SOME_ID = 'something random';

function TestMc() {

    this.client = new EventEmitter();
    this.client.jid = 'MasterOfCeremoniesTest@some.server.org';
    this.client.send = function () {
    };
    Moderator.call(this, '', '', '', participants);
}

util.inherits(TestMc, Moderator);


describe('Moderator', function () {

    var village;

    const mc = new TestMc();
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
    };

    afterEach(function () {
        mc.client.send = function () {
        };
    });

    it('creates a room', function (done) {
        mc.client.send = function (stanza) {
            const to = stanza.to;
            if (stanza.is('presence') && to) {
                const matchResult = to.match(/^(village\d+@[^\/]+)\/MC$/);
                if (matchResult && matchResult[1]) {
                    mc.village = matchResult[1];
                    done();
                }
            }
        };
        mc.client.emit('online');
    });

    it('invites all interested participants', function (done) {
        const MUC_USER_NS = 'http://jabber.org/protocol/muc#user';
        const msg = new xmpp.Presence({from:mc.village + '/MC', to:mc.client.jid, 'xmlns:stream':'http://etherx.jabber.org/streams'});
        msg.c('x', {xlmns:MUC_USER_NS})
            .c('status', {code:110});
        var stillToInvite = participants.map(function (p) {
            return p
        });
        mc.client.send = function (stanza) {
            if (stanza.is('message')) {
                const x = stanza.getChild('x');
                if (x && x.is('x', MUC_USER_NS) && x.attr('jid') == mc.village) {
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
        mc.client.emit('stanza', msg);
    });

    describe('when the room has been advertised', function () {

        var roomJidAndSomeNickname;
        before(function () {
            roomJidAndSomeNickname = mc.village + '/' + WEREWOLF_NICKNAME;
        })


        describe('when players enter the room', function () {

            function checkTheModeratorRegistersParticipant(nickname) {
                const presence = new xmpp.Presence({from:mc.village + '/' + nickname});
                presence.c('x', {xlmns:"http://jabber.org/protocol/muc#user"}).c('item', {role:'participant'});
                mc.client.emit('stanza', presence);
                mc.players.indexOf(nickname).should.not.be.below(0);
            }

            it('remembers the first player', function () {
                const presence = new xmpp.Presence({from:roomJidAndSomeNickname});
                presence.c('x', {xlmns:"http://jabber.org/protocol/muc#user"}).c('item', {role:'participant'});
                mc.client.emit('stanza', presence);
                mc.players.length.should.equal(1);
                mc.players.indexOf(WEREWOLF_NICKNAME).should.not.be.below(0);
            });

            it('remembers the other players', function () {
                checkTheModeratorRegistersParticipant(OTHER_NICKNAME);
                checkTheModeratorRegistersParticipant(ANOTHER_NICKNAME);
                checkTheModeratorRegistersParticipant(ONE_MORE_NICKNAME);
            });
            describe('but no-one has requested to be the werewolf', function () {
                it('it is neither day nor night', function () {
                    mc.should.not.have.property('phase', undefined);
                });
            });
        });


        describe('when a player says he wants to be a werewolf', function () {
            it('tells him that he is the werewolf and asks him who he wants to eat', function (done) {
                var firstMessageReceived = false;
                const msg = new xmpp.Message({from:roomJidAndSomeNickname, type:'chat', id:SOME_ID});
                msg.c('body').t('I want to be a ' + WEREWOLF);
                mc.client.send = function (message) {
                    if (message.is('message') && message.to == roomJidAndSomeNickname && message.type == 'chat') {
                        if (!firstMessageReceived) {
                            message.getChild('body').getText().should.equal(DESIGNATED_AS_WEREWOLF);
                            message.id.should.equal(SOME_ID);
                            firstMessageReceived = true;
                        } else {
                            message.getChild('body').getText().should.match(WHO_DO_YOU_WANT_TO_EAT_REGEXP);
                            done();
                        }
                    }
                };
                mc.client.emit('stanza', msg);
            });
            it('remembers who is the werewolf', function () {
                mc.werewolves.length.should.equal(1);
                mc.werewolves.indexOf(WEREWOLF_NICKNAME).should.not.be.below(0);
            });
            it('starts the first night', function () {
                mc.should.have.property('phase', NIGHT);
            });
        });

        describe('when the werewolf says who he wants to eat', function () {
            it('starts the day, tells the villagers who has been eaten and asks them for their votes', function (done) {
                var firstMessageReceived = false, secondMessageReceived = false;
                const msg = new xmpp.Message({from:roomJidAndSomeNickname, type:'chat', id:SOME_ID});
                msg.c('body').t(I_EAT + OTHER_NICKNAME);
                mc.client.send = function (message) {
                    util.log('sending ' + message);
                    if (message.is('message') && message.to == mc.village && message.type == 'groupchat') {
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
                                mc.livePlayers.forEach(function (p) {
                                    playerListMatchResult.indexOf(p).should.not.be.below(0);
                                });
                                playerListMatchResult.forEach(function (p) {
                                    mc.livePlayers.indexOf(p).should.not.be.below(0);
                                })
                                done();
                            }
                        }
                    }
                };
                mc.client.emit('stanza', msg);
            });
            it('remembers that the eaten player is dead', function () {
                mc.livePlayers.should.not.include(OTHER_NICKNAME);
            });
        });

        describe('when a vote is received', function () {
            before(function () {
                var vote = new xmpp.Message({from:mc.village + '/' + ANOTHER_NICKNAME});
                vote.c('body').t(VOTE + ANOTHER_NICKNAME);
                mc.client.emit('stanza', vote);
            });
            it('records the vote', function () {
                const votes = mc.votes;
                votes.length.should.equal(1);
                const vote = votes[0];
                vote.should.equal(ANOTHER_NICKNAME);
            })
        });

        describe('when all the votes have arrived', function () {
            it('announces who shall be hanged', function (done) {
                function onAnnounceHanging(message) {
                    const hangingAnnouncement = message.getChild('body').getText();
                    const matchResult = hangingAnnouncement.match(HANG_ANNOUNCEMENT + '\\s*(.+)$');
                    should.exist(matchResult);
                    matchResult[1].should.equal(ANOTHER_NICKNAME);
                    mc.client.send = function () {
                    };
                    done();
                };
                mc.client.send = onAnnounceHanging;
                var vote = new xmpp.Message({from:mc.village + '/' + ANOTHER_NICKNAME});
                vote.c('body').t(VOTE + ANOTHER_NICKNAME);
                mc.client.emit('stanza', vote);
                vote = new xmpp.Message({from:mc.village + '/' + ONE_MORE_NICKNAME});
                vote.c('body').t(VOTE + ANOTHER_NICKNAME);
                mc.client.emit('stanza', vote);

            });

            it('starts the night', function () {
                mc.should.have.property('phase', NIGHT);
            })
        });


        describe('receiving a NIGHTTIME message', function () {
            it('responds with the current nighttime duration', function (done) {
                const msg = new xmpp.Message({from:somePlayer});
                msg.c('body').t(magicStrings.getMagicString('NIGHTTIME'));
                mc.client.send = function (message) {
                    const body = message.getChild('body');
                    if (message.is('message') && body) {
                        const text = body.getText();
                        const matchResult = text.match(new RegExp('^' + NIGHTTIME_RESPONSE_PARTS[0] + '\\d+' + NIGHTTIME_RESPONSE_PARTS[1] + '$'));
                        if (matchResult) {
                            done();
                        }
                    }
                };
                mc.client.emit('stanza', msg);
            });
        });


        describe('receiving a DAYTIME message', function () {
            it('responds with the current daytime duration', function (done) {
                const msg = new xmpp.Message({from:somePlayer});
                msg.c('body').t(DAYTIME_REQUEST);
                mc.client.send = function (message) {
                    const body = message.getChild('body');
                    if (message.is('message') && body) {
                        const text = body.getText();
                        const matchResult = text.match(new RegExp('^' + DAYTIME_RESPONSE_PARTS[0] + '\\d+' + DAYTIME_RESPONSE_PARTS[1] + '$'));
                        if (matchResult) {
                            done();
                        }
                    }
                };
                mc.client.emit('stanza', msg);
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
                mc.client.send = validateSetDurationIsEchoed;
                mc.client.emit('stanza', msg);

            });

        });


        describe('#end', function () {
            it('destroys the room', function () {
            });
        });
    });
});