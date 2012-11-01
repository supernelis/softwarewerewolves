const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const user = require('./resource');

function GameCoordinator(jid, password, host){

    const self = this;

    user.Resource.call(this, jid, password, host);

    // when online
    self.client.once('online', function() {

        var wait_time = 150000;
        var participants = [];

        self.on('message', function(stanza){
            var text = stanza.getChild('body').getText();
            // if the message is about the wait time for new participants
            if (text.slice(0,8) == 'WAITTIME'){
                const millis = text.slice(8).trim() * 1000;
                if (millis > 0) wait_time = millis;
                const waittimeResponseParts = magicStrings.getMagicString('WAITTIME_RESPONSE');
                const msg = new xmpp.Message({to: stanza.from});
                msg.c('body').t(waittimeResponseParts[0]
                        + (wait_time/1000)
                        + waittimeResponseParts[1]);
                self.client.send(msg);
            }
        });

        // when someone asks whether they can play, wait for 5 minutes
        self.once('message', function(stanza){
            // if the message is not about the wait time for new participants
            if (stanza.getChild('body').getText().slice(0,8) != 'WAITTIME'){
                // assume that anyone who contacts me wants to play
                const from = self.parse_user(stanza.from)[1];
                util.log('the first player is ' + from);
                participants.push(from);
                var registration_window = function(message){
                    const from = self.parse_user(message.from)[1];
                    util.log('we have another player: ' + from);
                    participants.push(from);
                };
                self.on('message', registration_window);
                setTimeout(function(){
                    util.log('time is up, starting the game');
                    // close the registration window
                    self.client.removeListener('message', registration_window);
                    // start the game
                    self.emit('time to play', participants);
                }, wait_time);
            }
            // after the 5 minutes are over, start up a new game with all participants that asked to be included in that time
        });
    });
};

util.inherits(GameCoordinator, user.Resource);

GameCoordinator.prototype.parse_user = function (user){
    var regexp = new RegExp("^([a-zA-Z][a-zA-Z0-9-_]*@" + this.srv + ")(\/.+)?$");
    return user.match(regexp);
};

module.exports = GameCoordinator;




