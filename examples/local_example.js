const GameEngine = require('../lib/game_engine');

var gameCoordinator = 'sww@192.168.1.156';
var gameCoordinatorPw = 's0ftwarew0lf';
var xmppSrv = '192.168.1.156';
var moderator = 'softwarewolf@192.168.1.156';
var moderatorPw = 's0ftwarew0lf';

new GameEngine(gameCoordinator, gameCoordinatorPw, moderator, moderatorPw, xmppSrv);
