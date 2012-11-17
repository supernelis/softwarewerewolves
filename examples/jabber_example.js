const GameCoordinator = require('../lib/game_coordinator');
const Mc = require('../lib/moderator');

const xmpp = require('node-xmpp');
const gc = new GameCoordinator('sww@jabber.org','s0ftwarew0lf', 'jabber.org');
gc.on('time to play', function(participants){
    const mc = new Mc('softwarewolf@jabber.org', 's0ftwarew0lf', 'jabber.org', participants);
});