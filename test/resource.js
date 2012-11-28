const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const Resource = require('../lib/resource');

const EventEmitter = require('events').EventEmitter;


function TestResource(){

    this.client = new EventEmitter();
    this.client.jid = 'ResourceTest@some.server';
    this.client.socket = 'present';
    this.client.send = function(){};
    Resource.call(this, '', '', '');
}

util.inherits(TestResource, Resource);

describe('Resource: ', function(){

    const resource = new TestResource();

    describe('on initial connection', function(){
        it('sends an initial presence stanza', function(done){
            resource.client.send = function(stanza){
                stanza.is('presence').should;
                done();
            };
            resource.client.emit('online');
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
            resource.client.emit('stanza', msg);
         });
    });

    describe('#end', function(){
        it('sends an unavailable presence stanza', function(done){
            resource.client.end = function(){};
            resource.client.send = function(stanza){
                stanza.is('presence').should;
                stanza.type.should.equal('unavailable');
                done();
            };
            resource.end();
        })
    });
})

