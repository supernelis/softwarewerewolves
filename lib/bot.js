/**
 * Created with JetBrains WebStorm.
 * User: nelis
 * Date: 16/11/12
 * Time: 14:43
 * To change this template use File | Settings | File Templates.
 */
const magic_strings = require('./magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const util = require('util');

const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
const VILLAGER = magicStrings.getMagicString('VILLAGER');
const WHO_DO_YOU_WANT_TO_EAT = magicStrings.getMagicString('WHO_DO_YOU_WANT_TO_EAT');
const I_EAT = magicStrings.getMagicString('I_EAT');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const VOTE = magicStrings.getMagicString('VOTE');
const HANG_ANNOUNCEMENT = magicStrings.getMagicString('HANG_ANNOUNCEMENT');
const VICTIM_ANNOUNCEMENT = magicStrings.getMagicString('VICTIM_ANNOUNCEMENT');


const BotXmppHelper = require('./bot_xmpp_helper');

function Bot(nickname, xmppHelper){
    this.xmppHelper = xmppHelper;
    const self = this;

    xmppHelper.on('arrived_at_village',function(){
        xmppHelper.publiclySpeakInVillage("Howdy!");

    });

    xmppHelper.on('god_is_omnipresent',function(moderator){
        self.moderator = moderator;
    });

    xmppHelper.on('whispering',function(from, message){
        if(message.startsWith(WHO_DO_YOU_WANT_TO_EAT) ){
            var names = getNamesFromMessage(message);
            xmppHelper.privatelySpeakInVillage(from,I_EAT + names[0].trim());

        }
    });

    xmppHelper.on('villagechatter', onVoteRequest);

    xmppHelper.on('villagechatter', onHangingAnnouncement);

    xmppHelper.on('villagechatter', onDayBreak);

    function onVoteRequest(from, message){
        if(from == self.moderator && message.startsWith(REQUEST_VOTE) ){
            var names = getNamesFromMessage(message).remove(nickname);
            xmppHelper.publiclySpeakInVillage(VOTE + names[0].trim());
        }
    }

    function die() {
        xmppHelper.removeListener('villagechatter', onVoteRequest);
        xmppHelper.removeListener('villagechatter', onHangingAnnouncement);
        xmppHelper.removeListener('villagechatter', onDayBreak);
    }

    function onHangingAnnouncement(from, message){
        if(from == self.moderator && message == HANG_ANNOUNCEMENT + nickname){
            xmppHelper.publiclySpeakInVillage("it wasn't me!");
            die();
        }
    }

    function onDayBreak(from, message){
        if(from == self.moderator && message == VICTIM_ANNOUNCEMENT + nickname){
            die();
        }
    }

}

function getNamesFromMessage(message){
    var msplit = message.split(':');
    return msplit[1].split(',').map(function(name){return name.trim()});

}

if (typeof String.prototype.startsWith != 'function') {
        String.prototype.startsWith = function (str){
            return this.slice(0, str.length) == str;
        };
    }


Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};


module.exports = Bot;
