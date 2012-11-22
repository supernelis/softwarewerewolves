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

const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
const VILLAGER = magicStrings.getMagicString('VILLAGER');
const WHO_DO_YOU_WANT_TO_EAT = magicStrings.getMagicString('WHO_DO_YOU_WANT_TO_EAT');
const I_EAT = magicStrings.getMagicString('I_EAT');
const REQUEST_VOTE = magicStrings.getMagicString('REQUEST_VOTE');
const VOTE = magicStrings.getMagicString('VOTE');

const Bot = require('../lib/bot');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();

function TestBot(){
    xmppClientStub.publiclySpeakInVillage = function(){};
    xmppClientStub.privatallySpeakInVillage = function(){};
    Bot.call(this, xmppClientStub);
}

util.inherits(TestBot, Bot);

describe('Bot',function(){
    const mcjid = 'village1234@jabber.org/MC';
    const jid = 'joligeheidi@jabber.org';
    const password = 'asjemenou';
    const host = 'jabber.org';
    const coordinatorjid = 'sww@jabber.org';
    const roomnick = 'joligeheidi';

    const testbot = new TestBot();

before(function(){
           testbot.xmppHelper.emit('god_is_omnipresent',mcjid);
       });

   /* xmppHelper.on('wispering',function(from, message){
        util.log("Wispering From: "+from + " Message: "+message);
        if(from == this.godname && message.startsWith(WHO_DO_YOU_WANT_TO_EAT) ){
            var msplit = message.split(':');
            var names = msplit[1].split(',');
            util.log(names);
        }
    })*/

    describe('when god asks who you want to eat as werewolf,', function(){
       it('chooses on of the given villagers to eat', function(done){
           const names = ['jan','piet','joris','korneel'];

           testbot.xmppHelper.privatallySpeakInVillage = function(to,message){
               to.should.equal(mcjid);
               var expr = new RegExp("^"+I_EAT+"(.+)");
               const messagesplit = expr.exec(message);
               names.should.include(messagesplit[1]);
               done();
           };

           testbot.xmppHelper.emit('wispering',mcjid,WHO_DO_YOU_WANT_TO_EAT + names);
       });
        it('if there is only one villager, it chooses this villager to eat', function(done){
            const names = ['jan'];

            testbot.xmppHelper.privatallySpeakInVillage = function(to,message){
                to.should.equal(mcjid);
                var expr = new RegExp("^"+I_EAT+"(.+)");
                const messagesplit = expr.exec(message);
                names.should.include(messagesplit[1]);
                done();
            };

            testbot.xmppHelper.emit('wispering',mcjid,WHO_DO_YOU_WANT_TO_EAT + names);
        });
    });

    describe('when god asks who you want to hang as villager,', function(){
        it('chooses on of the given villagers to hang', function(done){
            const names = ['jan','piet','joris','korneel'];

            testbot.xmppHelper.publiclySpeakInVillage = function(message){
                var expr = new RegExp("^"+VOTE+"(.+)");
                const messagesplit = expr.exec(message);
                names.should.include(messagesplit[1]);
                done();
            };

            testbot.xmppHelper.emit('villagechatter',mcjid,REQUEST_VOTE + names);

        });

        it('if there is only one villager, it chooses this villager to hang', function(done){
            const names = ['jan'];

            testbot.xmppHelper.publiclySpeakInVillage = function(message){
                var expr = new RegExp("^"+VOTE+"(.+)");
                const messagesplit = expr.exec(message);
                names.should.include(messagesplit[1]);
                done();
            };

            testbot.xmppHelper.emit('villagechatter',mcjid,REQUEST_VOTE + names);

        });
    });

});