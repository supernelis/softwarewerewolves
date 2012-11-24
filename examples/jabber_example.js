const GameEngine = require('../lib/game_engine');

const xmpp = require('node-xmpp');
var gameCoordinator = 'sww@jabber.org';
var gameCoordinatorPw = 's0ftwarew0lf';
var xmppSrv = 'jabber.org';
var moderator = 'softwarewolf@jabber.org';
var moderatorPw = 's0ftwarew0lf';

new GameEngine(gameCoordinator, gameCoordinatorPw, moderator, moderatorPw, xmppSrv);
