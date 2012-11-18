/**
 * Created with JetBrains WebStorm.
 * User: nelis
 * Date: 18/11/12
 * Time: 10:01
 * To change this template use File | Settings | File Templates.
 */

const BotXmppHelper = require('../lib/bot_xmpp_helper');
const Bot = require('../lib/bot');

new Bot(new BotXmppHelper('fred_villager@jabber.org','fred_villager', 'jabber.org','sww@jabber.org','fredje'));
new Bot(new BotXmppHelper('joligeheidi@jabber.org','asjemenou', 'jabber.org','sww@jabber.org','joligeheidi'));
new Bot(new BotXmppHelper('bimboooo@jabber.org','bimboooo', 'jabber.org','sww@jabber.org','bimbo'));
new Bot(new BotXmppHelper('den_john@jabber.org','den_john', 'jabber.org','sww@jabber.org','den john'));
new Bot(new BotXmppHelper('pelvis@jabber.org','elvispelvis', 'jabber.org','sww@jabber.org','elvis'));