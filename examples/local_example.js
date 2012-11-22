const GameCoordinator = require('../lib/game_coordinator');

const Mc = require('../lib/moderator');

const xmpp = require('node-xmpp');
const gc = new GameCoordinator('sww@192.168.1.156','s0ftwarew0lf', '192.168.1.156');
gc.on('time to play', function(participants){
    const mc = new Mc('softwarewolf@192.168.1.156', 's0ftwarew0lf', '192.168.1.156', participants);
});