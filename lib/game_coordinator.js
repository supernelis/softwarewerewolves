const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const Resource = require('./resource');

const PLAY_REQUEST_REGEXP = new RegExp('^' + magicStrings.getMagicString('PLAY_REQUEST_STRING') + '$');

function GameCoordinator(jid, password, host) {

    const self = this;
    var participants = [];
    var wait_time = 60000;

    self.receivedPlayRequestFrom = function (player) {
        return participants.indexOf(player) >= 0;
    };

    self.numberOfQueuedPlayers = function () {
        return participants.length;
    };

    //noinspection JSUnresolvedFunction
    Resource.call(this, jid, password, host);

    self.on('message', function (stanza) {
        const waittimeResponseParts = magicStrings.getMagicString('WAITTIME_RESPONSE');
        const waittimeRequest = magicStrings.getMagicString('WAITTIME');
        const text = stanza.getChild('body').getText();
        // if the message is about the wait time for new participants
        if (text.match(new RegExp(waittimeRequest))) {
            const millis = text.slice(waittimeRequest.length).trim() * 1000;
            if (millis > 0) wait_time = millis;
            const msg = new xmpp.Message({to:stanza.from});
            msg.c('body').t(waittimeResponseParts[0]
                + (wait_time / 1000)
                + waittimeResponseParts[1]);
            self.client.send(msg);
        } else {
            const matchResult = text.match(PLAY_REQUEST_REGEXP);
            if (matchResult) {
                const from = self.parse_user(stanza.from)[1];
                if (self.numberOfQueuedPlayers() == 0) {
                    setTimeout(function () {
                        // close the registration window and start the game
                        self.emit('time to play', participants);
                        participants = [];
                    }, wait_time);
                }
                if (!self.receivedPlayRequestFrom(from)) {
                    participants.push(from);
                }
            } else {
                util.log('ignoring unrecognized message: ' + text)
            }
        }
    });
}

util.inherits(GameCoordinator, Resource);



module.exports = GameCoordinator;




