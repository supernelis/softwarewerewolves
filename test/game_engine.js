const should = require('should');
const util = require('util');

const GameEngine = require('../lib/game_engine');

var gameCoordinator = 'sww@some.server';
var gameCoordinatorPw = 's0ftwarew0lf';
var xmppSrv = 'some.server';
var moderator = 'softwarewolf@some.server';
var moderatorPw = 's0ftwarew0lf';

const nbrOfPlayers = 7;



describe('GameEngine', function () {
    describe('when no other players join', function () {
        it('starts a game with 7 players', function (done) {
            const ge = new GameEngine(gameCoordinator, gameCoordinatorPw, moderator, moderatorPw, xmppSrv);
            ge.createModerator = function(moderator, moderatorPw, xmppSrv, participants){
                participants.length.should.equal(nbrOfPlayers);
                done();
            };
            ge.gc.emit('time to play', []);
        });
    });

});