const xmpp = require('node-xmpp');
const util = require('util');


const user = require('./user');
const Mc = require('./mc');

function GameCoordinator(){

    var self = this;

    user.User.call(this, 'sww', 's0ftwarew0lf');

    // when online
    self.client.once('online', function() {

        var participants = [];

        // send the initial presence stanza
        self.client.send(new xmpp.Element('presence'));

        // when someone asks whether they can play, wait for 5 minutes
        self.once('message', function(stanza){
                // assume that anyone who contacts me wants to play
                util.log('the first player is ' + stanza.from);
                participants.push(stanza.from);
                var registration_window = function(message){
                    util.log('we have another player: ' + message.from);
                    participants.push(message.from);
                };
                self.on('message', registration_window);
                setTimeout(function(){
                    util.log('time is up, starting the game');
                    // close the registration window
                    self.client.removeListener('message', registration_window);
                    // start the game
                    self.mc = new Mc(participants);
                }, 150000);
                // after the 5 minutes are over, start up a new game with all participants that asked to be included in that time
            });
        });
};

util.inherits(GameCoordinator, user.User);

new GameCoordinator();


