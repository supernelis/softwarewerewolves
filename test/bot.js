/**
 * Created with JetBrains WebStorm.
 * User: nelis
 * Date: 17/11/12
 * Time: 10:27
 * To change this template use File | Settings | File Templates.
 */

const should = require('should');
const util = require('util');

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();

const ME = 'fred_villager';

const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
const VILLAGER = magicStrings.getMagicString('VILLAGER');
const WHO_DO_YOU_WANT_TO_EAT = magicStrings.getMagicString('WHO_DO_YOU_WANT_TO_EAT');
const I_EAT = magicStrings.getMagicString('I_EAT');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const VOTE = magicStrings.getMagicString('VOTE');

const Bot = require('../lib/bot');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();

function TestBot() {
    xmppClientStub.publiclySpeakInVillage = function () {
    };
    xmppClientStub.privatallySpeakInVillage = function () {
    };
    Bot.call(this, ME, xmppClientStub);
}

util.inherits(TestBot, Bot);

describe('Bot', function () {
    const mcjid = 'village1234@some.server/MC';

    const testbot = new TestBot();

    before(function () {
        testbot.xmppHelper.emit('god_is_omnipresent', mcjid);
    });

    describe('when god asks who you want to eat as werewolf,', function () {
        it('chooses on of the given villagers to eat', function (done) {
            const names = [ME, 'piet', 'joris', 'korneel'];

            testbot.xmppHelper.privatelySpeakInVillage = function (to, message) {
                to.should.equal(mcjid);
                var expr = new RegExp("^" + I_EAT + "(.+)");
                const messagesplit = expr.exec(message);
                names.should.include(messagesplit[1]);
                done();
            };

            testbot.xmppHelper.emit('whispering', mcjid, WHO_DO_YOU_WANT_TO_EAT + names);
        });
        it('if there is only one villager, it chooses this villager to eat', function (done) {
            const names = ['jan'];

            testbot.xmppHelper.privatelySpeakInVillage = function (to, message) {
                to.should.equal(mcjid);
                var expr = new RegExp("^" + I_EAT + "(.+)");
                const messagesplit = expr.exec(message);
                names.should.include(messagesplit[1]);
                done();
            };

            testbot.xmppHelper.emit('whispering', mcjid, WHO_DO_YOU_WANT_TO_EAT + names);
        });
    });

    describe(', when the moderator asks who should be hanged,', function () {
        it('chooses one of the other villagers to hang', function (done) {
            const names = [ME, 'piet', 'joris', 'korneel'];

            testbot.xmppHelper.publiclySpeakInVillage = function (message) {
                var expr = new RegExp("^" + VOTE + "(.+)");
                const messagesplit = expr.exec(message);
                const votee = messagesplit[1];
                names.should.include(votee);
                votee.should.not.equal(ME);
                done();
            };

            testbot.xmppHelper.emit('villagechatter', mcjid, REQUEST_VOTE + names);

        });

        it('if there is only one villager, it chooses this villager to hang', function (done) {
            const names = ['jan'];

            testbot.xmppHelper.publiclySpeakInVillage = function (message) {
                var expr = new RegExp("^" + VOTE + "(.+)");
                const messagesplit = expr.exec(message);
                names.should.include(messagesplit[1]);
                done();
            };

            testbot.xmppHelper.emit('villagechatter', mcjid, REQUEST_VOTE + names);

        });
    });

});