/**
 * Created with JetBrains WebStorm.
 * User: nelis
 * Date: 12/11/12
 * Time: 21:42
 * To change this template use File | Settings | File Templates.
 */

const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const Resource = require('./resource');

function listenForChatRoomInvitation(){
    self.on('');

}

function BotXmppHelper(jid, password, host, coordinatorjid, roomnick){
    const self = this;
    this.roomjid = "";

    Resource.call(this, jid, password, host);

    self.client.once('online', function() {

        // set ourselves as online
        const msg1 = new xmpp.Presence({ type: 'available' });
        msg1.c('show').t('chat');
        self.client.send(msg1);

        const playrequest = magicStrings.getMagicString('PLAY_REQUEST_STRING');
        const msg = new xmpp.Message({to: coordinatorjid});
        msg
            .c('body')
            .t(playrequest);

        self.client.send(msg);

        self.on('message', function(stanza){
            const x = stanza.getChild('x');
            if (stanza.is('message') && x && x.getChild('invite')){
               self.emit('invite', stanza);
            }
        });

        self.on('invite', function(message){
            //util.log(message);
            const invite = message.getChild('x').getChild('invite');
            self.roomjid = message.from;

            // join room (and request no chat history)
            var presence = new xmpp.Presence({ to: self.roomjid +'/' + roomnick });
            presence.c('x', { xmlns: 'http://jabber.org/protocol/muc' })
            self.client.send(presence);

            self.emit('arrived_at_village');

            // send keepalive data or server will disconnect us after 150s of inactivity
            setInterval(function() {
                self.client.send(' ');
            }, 30000);


        });
    });

    self.client.on('offline', function(){
        util.log("We're offline!");
        self.end();
    });
}

BotXmppHelper.prototype.publicallySpeakInVillage = function(message){
    const msg = new xmpp.Message({to: this.roomjid});
    msg.c('body')
        .t(message);
    this.client.send(msg);
}

BotXmppHelper.prototype.privatallySpeakInVillage = function(name,message){
    const msg = new xmpp.Message({to: this.roomjid + '/' + name});
    msg.c('body')
        .t(message);
    this.client.send(msg);
}

util.inherits(BotXmppHelper, Resource);

module.exports = BotXmppHelper;