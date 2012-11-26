/**
 * Created with JetBrains WebStorm.
 * User: nelis
 * Date: 16/11/12
 * Time: 16:06
 * To change this template use File | Settings | File Templates.
 */

const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const muc_ns = 'http://jabber.org/protocol/muc';

const BotXmppHelper = require('../lib/bot_xmpp_helper');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'BotXmppHelperTest@some.server';


function TestBotXmppHelper(jid, password, host, roomnick){

    this.client = xmppClientStub;
    this.client.send = function(){};
    BotXmppHelper.call(this, jid, password, host, roomnick);
}

util.inherits(TestBotXmppHelper, BotXmppHelper);

describe('BotXmppHelper', function(){

    const jid = 'joligeheide@jabber.org';
    const password = 'asjemenou';
    const host = 'jabber.org';
    const coordinatorjid = 'sww@jabber.org';
    const roomnick = 'joligeheidi';
    const room_jid = 'village1234@jabber.org';
    const helper = new TestBotXmppHelper(jid, password, host, roomnick);

    describe('on receiving online event', function(){
            it('puts presence to available',function(done){

                helper.client.send = function(message){
                    message.is('presence').should.be.true;
                    helper.client.send = msgsend2;
                };

                const msgsend2 = function(message){
                    message.is('presence').should.be.true;
                    done();
                };

                helper.client.emit('online');
            })
        }
    );

    describe('on receiving an invitation to a village', function(){
            it('joins the village and emits an event',function(done){



                helper.client.send = function(message){
                    message.is('presence').should.be.true;
                    message.to.should.equal(room_jid+'/'+roomnick);
                    done();
                };

                var invitation = new xmpp.Message({to: room_jid, from: room_jid});
                invitation.c('x', {xmlns: muc_ns + '#user', jid: room_jid})
                    .c('invite', {to: jid})
                    .c('reason')
                    .t('come and join the werewolf game');

                helper.client.emit('stanza',invitation);
            })
        }
    );

    describe('on receiving a private message from a participant', function(){
        it('sends out a whispering event', function(done){
            const moderator = room_jid + "/moderator";
            const messageText = 'messageBody';
            helper.on('whispering', function(from,message){
                from.should.equal(moderator);
                message.should.equal(messageText);
                done();
            });

            var privateMessage = new xmpp.Message({to: room_jid + "/" + roomnick, from: moderator, type: 'chat'});
            privateMessage.c('body')
                .t(messageText);

            helper.client.emit('stanza',privateMessage)
        });
    });

    describe('on receiving a presence message from a moderator', function(){
       it('sends out a god_is_omnipresent event', function(done){
           const fromin = "village516@conference.jabber.org/MC";
           const to = "fred_villager@jabber.org/1c78baec2b520fb0";

           helper.on('god_is_omnipresent',function(fromout){
               fromout.should.equal(fromin);
               done();
           });

           var msg = new xmpp.Presence({from:fromin, to: to, xmlns:'ttp://etherx.jabber.org/streams'});
                msg.c('x', { xmlns: 'http://jabber.org/protocol/muc#user' }).c('item',{ affliation:'owner', role:"moderator" });
           helper.client.emit('stanza',msg);
       });

    });

    describe('on receiving a presence message (non moderator)', function(){
        it('sends out a villager_spotted event', function(done){
            const fromin = "village516@conference.jabber.org/MC";
            const to = "fred_villager@jabber.org/1c78baec2b520fb0";

            helper.on('villager_spotted',function(fromout){
                fromout.should.equal(fromin);
                done();
            });

            var msg = new xmpp.Presence({from:fromin, to: to, xmlns:'ttp://etherx.jabber.org/streams'});
            msg.c('x', { xmlns: 'http://jabber.org/protocol/muc#user' }).c('item',{ affliation:'none', role:"participant" });
            helper.client.emit('stanza',msg);
        });

    });

    describe('on receiving a presence unavailable message (moderator)', function(){
        it('sends out a god_left event', function(done){
            const fromin = "village516@conference.jabber.org/MC";
            const to = "fred_villager@jabber.org/1c78baec2b520fb0";

            helper.on('god_left',function(fromout){
                fromout.should.equal(fromin);
                done();
            });

            var msg = new xmpp.Presence({from:fromin, to: to, xmlns:'ttp://etherx.jabber.org/streams', type:'unavailable'});
            msg.c('x', { xmlns: 'http://jabber.org/protocol/muc#user' }).c('item',{ affliation:'owner', role:"moderator" });
            helper.client.emit('stanza',msg);
        });

    });

    describe('on receiving a presence unavailable message (non moderator)', function(){
        it('sends out a villager_left event', function(done){
            const fromin = "village516@conference.jabber.org/MC";
            const to = "fred_villager@jabber.org/1c78baec2b520fb0";

            helper.on('villager_left',function(fromout){
                fromout.should.equal(fromin);
                done();
            });

            var msg = new xmpp.Presence({from:fromin, to: to, xmlns:'ttp://etherx.jabber.org/streams', type:'unavailable'});
            msg.c('x', { xmlns: 'http://jabber.org/protocol/muc#user' }).c('item',{ affliation:'none', role:"participant" });
            helper.client.emit('stanza',msg);
        });

    });
});