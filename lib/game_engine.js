const GameCoordinator = require('./game_coordinator');
const Moderator = require('./moderator');
const Bot = require('./bot');
const BotXmppHelper = require('./bot_xmpp_helper');
const Game = require('./game');

const nicknames = ['fred_villager', 'joligeheidi', 'bimboooo', 'den_john', 'pelvis', 'koude_man', 'mo_werewolf'];
const passwords = ['fred_villager', 'asjemenou', 'bimboooo', 'den_john', 'elvispelvis', 'koude_man', 'mo_werewolf'];


function GameEngine(gameCoordinatorJID, gameCoordinatorPw, moderatorJID, moderatorPw, xmppSrv) {

    const games = [];

    this.__defineGetter__('games', function () {
        return games.map(function (game) {
            return new Game(game.moderator, game.bots);
        });
    });

    function startBot(nickname, password) {
        const jid = nickname + '@' + xmppSrv;
        return new Bot(nickname, new BotXmppHelper(jid, password, xmppSrv, nickname));
    }

    const self = this;
    this.gc = new GameCoordinator(gameCoordinatorJID, gameCoordinatorPw, xmppSrv);
    this.gc.on('time to play', function (participants) {
        var toInvite = participants;
        var bots = [];
        for (var i = participants.length; i < 7; i++) {
            bots.push(startBot(nicknames[i], passwords[i]));
            toInvite.push(nicknames[i] + '@' + xmppSrv);
        }
        const moderator = self.createModerator(moderatorJID, moderatorPw, xmppSrv, toInvite);
        games.push(new Game(moderator, bots));
        moderator.on('game over', function () {
            bots.forEach(function (bot) {
                bot.xmppHelper.end();
            });
        });
    });
}

GameEngine.prototype.createModerator = function (moderatorJID, moderatorPw, xmppSrv, participants) {
    return new Moderator(moderatorJID, moderatorPw, xmppSrv, participants);
}

module.exports = GameEngine;