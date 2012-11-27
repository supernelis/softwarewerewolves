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

function BotXmppHelper(jid, password, host, roomnick, roomJID) {
    const self = this;
    var isInVillage = false;

    this.__defineGetter__('isInVillage', function(){return isInVillage;});
    this.__defineGetter__('roomjid', function(){return roomJID});

    Resource.call(this, jid, password, host);

    util.log('bot ' + self.client.jid + ' waiting to go online');

    self.client.once('online', function () {
       // set ourselves as online
        const msg = new xmpp.Presence();
        msg.c('show').t('chat');
        self.client.send(msg);

        self.on('message', function (stanza) {
            const x = stanza.getChild('x');
            if (stanza.is('message') && x && x.getChild('invite')) {
                self.emit('invite', stanza);
            }
            if (stanza.is('message') && stanza.from != self.roomjid + "/" + roomnick) {
                const body = stanza.getChild('body');
                if (body) {
                    if (stanza.type == "chat") {
                        self.emit('whispering', stanza.from, body.getText());
                    } else {
                        const subject = stanza.getChild("subject");
                        if (stanza.type == "groupchat" && subject) util.log(subject.getText());
                        if (stanza.type == "groupchat" && !subject) self.emit('villagechatter', stanza.from, body.getText());
                    }
                }
            }
        });

        function onInvite(message) {
            const invite = message.getChild('x').getChild('invite');
            if(message.from == roomJID){
                self.removeListener('invite', onInvite);

                // join room (and request no chat history)
                var presence = new xmpp.Presence({ to:self.roomjid + '/' + roomnick });
                presence.c('x', { xmlns:'http://jabber.org/protocol/muc' });
                self.client.send(presence);

                isInVillage = true;
                self.emit('arrived_at_village');
            }
        }

        self.on('invite', onInvite);

        self.on('presence', function (message) {
            const from = message.from;
            const type = message.type;
            const x = message.getChild('x');
            if (x && from != self.roomjid + "/" + roomnick) {
                const item = x.getChild('item');
                if (item) {
                    if (item.attrs.role == 'moderator') {
                        if (type != 'unavailable') {
                            self.emit('god_is_omnipresent', from);
                        } else {
                            self.emit('god_left', from);
                        }

                    } else {
                        if (type != 'unavailable') {
                            self.emit('villager_spotted', from);
                        } else {
                            self.emit('villager_left', from);
                        }
                    }
                }
            }

        });

        self.emit('online');
    });
}

util.inherits(BotXmppHelper, Resource);

BotXmppHelper.prototype.publiclySpeakInVillage = function (message) {
    const msg = new xmpp.Message({to:this.roomjid, type:'groupchat'});
    msg.c('body')
        .t(message);
    this.client.send(msg);
};

BotXmppHelper.prototype.privatelySpeakInVillage = function (name, message) {
    const msg = new xmpp.Message({to:name, type:'chat'});
    msg.c('body')
        .t(message);
    this.client.send(msg);
};

module.exports = BotXmppHelper;