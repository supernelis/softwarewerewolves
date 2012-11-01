const should = require('should');
const xmpp = require('node-xmpp');

describe('Resource: ', function(){

    const EventEmitter = require('events').EventEmitter;
    const xmppClientStub = new EventEmitter();
    const rsrc = require('../lib/resource');
    rsrc.helpers.createClient = function(){
        return xmppClientStub;
    }
    const resource = new rsrc.Resource();
    xmppClientStub.jid = 'ResourceTest@some.server';



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


