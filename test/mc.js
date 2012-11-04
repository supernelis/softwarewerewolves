const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');
const sinon = require('sinon');

const magic_strings = require('../lib/magic_strings');
const Mc = require('../lib/mc');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'MasterOfCeremoniesTest@some.server.org';

function TestMc(){

    this.client = xmppClientStub;
    this.client.send = function(){};
    Mc.call(this, '', '', '', []);
}

util.inherits(TestMc, Mc);

describe('Mc', function(){


    const mc = new TestMc();

    it('creates a room', function(){
        const spy = sinon.spy(mc.client.send);
        spy.withArgs(sinon.match.instanceOf(xmpp.Presence).and(sinon.match.has('to', /^village\d+@.+'/)));
        mc.client.emit('online');
        spy.calledOnce.should.equal.true;
    });

    it('starts the game at night', function(){
        const spy = sinon.spy(mc.client.send);
        spy.withArgs(sinon.match.instanceOf(xmpp.Message)
            .and(sinon.match.has('type', 'groupchat'))
            .and(sinon.match(function(message){
            return 'Night' == message.getChild('subject').getText();
        spy.calledOnce.should.equal.true;
        })));
    });

});