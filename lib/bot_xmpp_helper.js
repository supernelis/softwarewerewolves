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
            if(stanza.is('message') && stanza.to == self.roomjid+"/"+roomnick && stanza.from != self.roomjid+"/"+roomnick && stanza.type =="chat"){
                self.emit('wispering',stanza.from, stanza.getChild('body').getText());
            }
            if(stanza.is('message') && stanza.to == self.roomjid+"/"+roomnick && stanza.from != self.roomjid+"/"+roomnick && stanza.type =="groupchat"){
                self.emit('villagechatter',stanza.from, stanza.getChild('body').getText());
            }
        });

        self.on('invite', function(message){
            util.log(message);
            const invite = message.getChild('x').getChild('invite');
            self.roomjid = message.from;

            // join room (and request no chat history)
            var presence = new xmpp.Presence({ to: self.roomjid +'/' + roomnick });
            presence.c('x', { xmlns: 'http://jabber.org/protocol/muc' });
            self.client.send(presence);

            self.emit('arrived_at_village');

            // send keepalive data or server will disconnect us after 150s of inactivity
            setInterval(function() {
                self.client.send(' ');
            }, 30000);


        });

        self.on('presence',function(message){
            const from = message.from;
            const type = message.type;
            const x = message.getChild('x');

            if (x && from != self.roomjid + "/" + roomnick) {
                const item = x.getChild('item');
                if (item){
                    if(item.attrs.role == 'moderator'){
                        if (type != 'unavailable') {
                            self.emit('god_is_omnipresent',from);
                        }else{
                            self.emit('god_left',from);
                        }

                    }else{
                        if (type != 'unavailable') {
                            self.emit('villager_spotted', from);
                        }else{
                            self.emit('villager_left', from);
                        }
                    }
                }
            }

        });
    });

    self.client.on('offline', function(){
        util.log("We're offline!");
        self.end();
    });
}

util.inherits(BotXmppHelper, Resource);

BotXmppHelper.prototype.publiclySpeakInVillage = function(message){
    const msg = new xmpp.Message({to: this.roomjid, type: 'groupchat'});
    msg.c('body')
        .t(message);
    util.log(msg);
    this.client.send(msg);
};

BotXmppHelper.prototype.privatallySpeakInVillage = function(name , message){
    const msg = new xmpp.Message({to: name, type: 'chat'});
    msg.c('body')
        .t(message);
    this.client.send(msg);
};

module.exports = BotXmppHelper;