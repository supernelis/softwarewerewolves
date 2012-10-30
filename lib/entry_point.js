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
                    self.mc = new Mc(participants);
                }, 150000);
                // after the 5 minutes are over, start up a new game with all participants that asked to be included in that time
            });
        });
};

util.inherits(GameCoordinator, user.User);

GameCoordinator.prototype.parse_user = function (user){
    var regexp = new RegExp("^([a-zA-Z][a-zA-Z0-9-_]*@" + this.srv + ")(\/.+)?$");
    return user.match(regexp);
};

module.exports = new GameCoordinator();




