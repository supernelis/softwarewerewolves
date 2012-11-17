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


const BotXmppHelper = require('../lib/bot_xmpp_helper');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'BotXmppHelperTest@some.server';


function TestBotXmppHelper(){

    this.client = xmppClientStub;
    this.client.send = function(){};
    BotXmppHelper.call(this, '', '', '');
}

util.inherits(TestBotXmppHelper, BotXmppHelper);

describe('BotXmppHelper', function(){

    const helper = new TestBotXmppHelper();
    const originalEmitFn = helper.emit;

    describe('on receiving online event', function(){
            it('puts presence to available and contacts the gamecoordinator to play',function(done){

                helper.client.send = function(message){
                    util.log(message);
                    message.is('presence').should.be.true;
                    helper.client.send = msgsend2;
                }

                const msgsend2 = function(message){
                    message.is('presence').should.be.true;
                    helper.client.send = msgsend3;
                }

                const msgsend3 = function(message){
                    message.is('message').should.be.true;
                    message.getChild('body').getText().should.equal('I want to play');
                    done();
                }


                helper.client.emit('online');
            })
        }
    );

    describe('on receiving an invitation to a village', function(){
            it('joins the village and emits an event',function(done){

                helper.client.send = function(message){
                    util.log(message);
                    message.is('presence').should.be.true;
                    helper.client.send = msgsend2;
                }


                helper.client.emit('message',msg);
            })
        }
    );

});