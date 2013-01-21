const should = require('should');
const util = require('util');

const GameEngine = require('../lib/game_engine');
const Moderator = require('../lib/Moderator');

var gameCoordinatorJID = 'sww@some.server';
var gameCoordinatorPw = 's0ftwarew0lf';
var xmppSrv = 'some.server';
var moderatorJID = 'softwarewolf@some.server';
var moderatorPw = 's0ftwarew0lf';

const nbrOfPlayers = 7;

describe('GameEngine', function () {

    describe('when no other players join', function () {

        it('starts a game with 7 players', function (done) {
            const ge = new GameEngine(gameCoordinatorJID, gameCoordinatorPw, moderatorJID, moderatorPw, xmppSrv);
            ge.createModerator = function (moderator, moderatorPw, xmppSrv, participants) {
                participants.length.should.equal(nbrOfPlayers);
                done();
                const mod = new Moderator(moderator, moderatorPw, xmppSrv, participants);
                clearTimeout(mod.werewolfElectionId);
                return mod;
            };
            ge.gc.emit('time to play', []);
        });

    });

});