const GameCoordinator = require('./game_coordinator');
const Moderator = require('./moderator');
const Bot = require('./bot');
const BotXmppHelper = require('./bot_xmpp_helper');

const nicknames = ['fred_villager', 'joligeheidi', 'bimboooo', 'den_john', 'pelvis', 'koude_man', 'mo_werewolf'];
const passwords = ['fred_villager', 'asjemenou', 'bimboooo', 'den_john', 'elvispelvis', 'koude_man', 'mo_werewolf'];


function GameEngine(gameCoordinator, gameCoordinatorPw, moderator, moderatorPw, xmppSrv) {

    function startBot(nickname, password) {
        const jid = nickname + '@' + xmppSrv;
        return new Bot(nickname, new BotXmppHelper(jid, password, xmppSrv, nickname));
    }

    const self = this;
    this.gc = new GameCoordinator(gameCoordinator, gameCoordinatorPw, xmppSrv);
    this.gc.on('time to play', function (participants) {
        var toInvite = participants;
        for (var i = participants.length; i < 7; i++){
            startBot(nicknames[i], passwords[i]);
            toInvite.push(nicknames[i] + '@' + xmppSrv);
        }
        self.createModerator(moderator, moderatorPw, xmppSrv, toInvite);
    });
}

GameEngine.prototype.createModerator = function (moderator, moderatorPw, xmppSrv, participants) {
    return new Moderator(moderator, moderatorPw, xmppSrv, participants);
}

module.exports = GameEngine;