const GameEngine = require('../lib/game_engine');

var gameCoordinator = 'sww@10.0.1.3';
var gameCoordinatorPw = 's0ftwarew0lf';
var xmppSrv = '10.0.1.3';
var moderator = 'softwarewolf@10.0.1.3';
var moderatorPw = 's0ftwarew0lf';

new GameEngine(gameCoordinator, gameCoordinatorPw, moderator, moderatorPw, xmppSrv);
