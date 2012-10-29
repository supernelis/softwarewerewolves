const xmpp = require('node-xmpp');
const util = require('util');


const user = require('./user');
const Mc = require('./mc');
const user_name = 'sww';
const password = 's0ftwarew0lf';
const muc_ns = 'http://jabber.org/protocol/muc';

function GameCoordinator(){

    var self = this;

    user.User.call(this, [user_name, password]);

    // when online
    self.client.once('online', function() {

        var participants = [];

        // send the initial presence stanza
        self.gc.send(new xmpp.Element('presence'));

        // when someone asks whether they can play, wait for 5 minutes
        self.gc.once('stanza', function(stanza){
            if (stanza.is('message')){
                util.log('message: ' + stanza);
                // assume that anyone who contacts me want to play
                participants.push(stanza.from);
                registration_window = function(){
                    participants.push(stanza.from);
                };
                self.gc.on('stanza', registration_window);
                setTimeout(function(){
                    // close the registration window
                    self.gc.removeListener('stanza', registration_window);
                    // start the game
                    self.mc = new Mc(participants);
                }, 300000);
                // after the 5 minutes are over, start up a new game with all participants that asked to be included in that time
            } else if (stanza.is('presence')) {
                util.log('presence: ' + stanza);
            } else {
                error('not yet implemented: ' + stanza);
            }

        })
    });

};

util.inherits(GameCoordinator, user.User);

new GameCoordinator();


