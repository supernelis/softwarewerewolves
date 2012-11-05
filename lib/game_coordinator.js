const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const Resource = require('./resource');

function GameCoordinator(jid, password, host){

    const self = this;
    var participants = [];

    self.receivedPlayRequestFrom = function(player){
        return (participants.indexOf(player) >= 0);
    };

    self.numberOfQueuedPlayers = function(){
        return participants.length;
    };

    Resource.call(this, jid, password, host);

    // when online
    self.client.once('online', function() {

        var wait_time = 150000;

        self.on('message', function(stanza){
            const waittimeResponseParts = magicStrings.getMagicString('WAITTIME_RESPONSE');
            const waittimeRequest = magicStrings.getMagicString('WAITTIME');
            const text = stanza.getChild('body').getText();
            // if the message is about the wait time for new participants
            if (text.match(new RegExp(waittimeRequest))){
                const millis = text.slice(waittimeRequest.length).trim() * 1000;
                if (millis > 0) wait_time = millis;
                const msg = new xmpp.Message({to: stanza.from});
                msg.c('body').t(waittimeResponseParts[0]
                    + (wait_time/1000)
                    + waittimeResponseParts[1]);
                self.client.send(msg);
            } else if (text == magicStrings.getMagicString('PLAY_REQUEST_STRING')){
                const from = self.parse_user(stanza.from)[1];
                if (self.numberOfQueuedPlayers() == 0){
                    setTimeout(function(){
                        // close the registration window and start the game
                        self.emit('time to play', participants);
                        participants = [];
                    }, wait_time);
                }
                if (!self.receivedPlayRequestFrom(from)){
                    participants.push(from);
                }
            } else {
                util.log('ignoring unrecognized message: ' + text)}
        });
    });
};

util.inherits(GameCoordinator, Resource);

GameCoordinator.prototype.parse_user = function (user){
    var regexp = new RegExp("^([a-zA-Z][a-zA-Z0-9-_]*@[^\/]+)(\/.+)?$");
    return user.match(regexp);
};

module.exports = GameCoordinator;




