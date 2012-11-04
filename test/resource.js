const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const Resource = require('../lib/resource');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'ResourceTest@some.server';


function TestResource(){

    this.client = xmppClientStub;
    this.client.send = function(){};
    Resource.call(this, '', '', '');
}

util.inherits(TestResource, Resource);

describe('Resource: ', function(){

    const resource = new TestResource();

    describe('on initial connection', function(){
        it('sends an initial presence stanza', function(done){
            xmppClientStub.send = function(stanza){
                stanza.is('presence').should;
                done();
            };
            xmppClientStub.emit('online');
         })
    });

    describe('stanza containing a message', function(){
        it('is propagated as a message', function(done){
            const requester = 'test_user@some.server.org';
            const msg = new xmpp.Message({from: requester});
            resource.emit = function(tp, stanza){
                stanza.from.should.equal(requester);
                tp.should.equal('message');
                done();
            };
            xmppClientStub.emit('stanza', msg);
         });
    });

    describe('#end', function(){
        it('sends an unavailable presence stanza', function(done){
            xmppClientStub.end = function(){};
            xmppClientStub.send = function(stanza){
                stanza.is('presence').should;
                stanza.type.should.equal('unavailable');
                done();
            };
            resource.end();
        })
    });
})

