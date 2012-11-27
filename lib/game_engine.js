const GameCoordinator = require('./game_coordinator');
const Moderator = require('./moderator');
const Bot = require('./bot');
const BotXmppHelper = require('./bot_xmpp_helper');
const xmpp = require('node-xmpp');

const nicknames = ['fred_villager', 'joligeheidi', 'bimboooo', 'den_john', 'koude_man', 'pelvis', 'mo_werewolf'];
const passwords = ['fred_villager', 'asjemenou', 'bimboooo', 'den_john', 'koude_man', 'elvispelvis', 'mo_werewolf'];

const muc_ns = 'http://jabber.org/protocol/muc';


function GameEngine(gameCoordinatorJID, gameCoordinatorPw, moderatorJID, moderatorPw, xmppSrv) {

    function startBot(nickname, password, roomJID) {
        const jid = nickname + '@' + xmppSrv;
        return new Bot(nickname, new BotXmppHelper(jid, password, xmppSrv, nickname, roomJID));
    }

    const self = this;
    this.gc = new GameCoordinator(gameCoordinatorJID, gameCoordinatorPw, xmppSrv);
    this.gc.on('time to play', function (participants) {
        const bots = [];
        const roomJID = 'village' + Math.floor(Math.random() * 1000) + "@conference." + xmppSrv;
        const toInvite = participants;


        function onOnline(bot) {
            return function () {
                bots.push(bot);
            }
        }


        for (var i = participants.length; i < 7; i++) {
            var bot = startBot(nicknames[i], passwords[i], roomJID);
            bot.xmppHelper.on('online', onOnline(bot));
            toInvite.push(nicknames[i] + '@' + xmppSrv);
        }
        const moderator = self.createModerator(moderatorJID, moderatorPw, xmppSrv, toInvite, roomJID);
        moderator.on('game over', function (partingWords) {
            bots.forEach(function (bot) {
                bot.xmppHelper.end();
            });
            if (moderator.villageJID) {
                const iq = new xmpp.Iq({from:'softwarewolf@' + moderator.srv, to:moderator.villageJID, type:'set'});
                iq.c('query', {xmlns:muc_ns + '#owner'})
                    .c('destroy')
                    .c('reason')
                    .t(partingWords);
                moderator.client.send(iq);
            }
            moderator.end();
        });
    });
}

GameEngine.prototype.createModerator = function (moderatorJID, moderatorPw, xmppSrv, participants, roomJID) {
    return new Moderator(moderatorJID, moderatorPw, xmppSrv, participants, roomJID);
}

module.exports = GameEngine;