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

function BotXmppHelper(jid, password, host, coordinatorjid){

    const self = this;

    Resource.call(this, jid, password, host);

    self.client.once('online', function() {

        self.on('message', function(stanza){

        });
    });

    self.client.on('offline', function(){
        util.log("We're offline!");
        self.end();
    });
/*
    const playrequest = magicStrings.getMagicString('PLAY_REQUEST_STRING');
    const msg = new xmpp.Message({to: coordinatorjid});
    msg
        .c('body')
        .t(playrequest);

    self.client.send(msg);*/
}

util.inherits(BotXmppHelper, Resource);

module.exports = BotXmppHelper;