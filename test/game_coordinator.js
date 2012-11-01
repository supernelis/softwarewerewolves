const should = require('should');
const xmpp = require('node-xmpp');
const sinon = require('sinon');

describe('GameCoordinator', function(){

    const EventEmitter = require('events').EventEmitter;
    const xmppClientStub = new EventEmitter();
    xmppClientStub.jid = 'GameCoordinatorTest@some.server.org';
    xmppClientStub.send = function(){};
    const rsrc = require('../lib/resource');
    rsrc.helpers.createClient = function(){
        return xmppClientStub;
    }
    const GameCoordinator = require('../lib/game_coordinator');
    const gc = new GameCoordinator();
    xmppClientStub.emit('online');

    describe('#parse_user', function(){
        it('returns the user without the resource', function(){
            gc.parse_user('mo@jabber.org/pda')[1].should.equal('mo@jabber.org');
            gc.parse_user('mo_werewolf@jabber.org')[1].should.equal('mo_werewolf@jabber.org');
        })
    });

    describe('receiving a WAITTIME message', function() {
        it('sends a response', function(done){
            const requester = 'testUser@some.server.org';
            const msg = new xmpp.Message({from: requester});
            msg.c('body').t('WAITTIME');
            xmppClientStub.send = function(stanza){
                stanza.is('message').should.be.true;
                stanza.to.should.equal(requester);
                done();
            };
            xmppClientStub.emit('stanza', msg);
        });
    });

})