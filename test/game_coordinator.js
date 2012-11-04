const should = require('should');
const xmpp = require('node-xmpp');

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();

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
    const originalEmitFn = gc.emit;
    const requester = 'testUser@some.server.org';
    const waittimeRequest = magicStrings.getMagicString('WAITTIME');
    const WAIT_TIME = 1;

    xmppClientStub.emit('online');

    describe('#parse_user', function(){
        it('returns the user without the resource', function(){
            gc.parse_user('mo@jabber.org/pda')[1].should.equal('mo@jabber.org');
            gc.parse_user('mo_werewolf@jabber.org')[1].should.equal('mo_werewolf@jabber.org');
        })
    });

    describe('receiving a WAITTIME message', function() {
        const waittimeResponseParts = magicStrings.getMagicString('WAITTIME_RESPONSE');
        var msg;

        beforeEach(function(){
            msg= new xmpp.Message({from: requester});
        });

        afterEach(function(){
           xmppClientStub.send = function(){};
        });

        it('sends a response when no new delay has been specified', function(done){
            msg.c('body').t(waittimeRequest);
            xmppClientStub.send = function(stanza){
                stanza.is('message').should.be.true;
                stanza.to.should.equal(requester);
                stanza.getChild('body').getText()
                    .should.match(new RegExp('^' + waittimeResponseParts[0] + '\\d+' + waittimeResponseParts[1] + '$'));
                done();
            };
            xmppClientStub.emit('stanza', msg);
        });

        it('sends a response when a new delay has been specified', function(done){
            msg.c('body').t(waittimeRequest + WAIT_TIME);
            xmppClientStub.send = function(stanza){
                stanza.is('message').should.be.true;
                stanza.to.should.equal(requester);
                stanza.getChild('body').getText()
                    .should.match(new RegExp('^' + waittimeResponseParts[0] + WAIT_TIME + waittimeResponseParts[1] + '$'));
                done();
            };
            xmppClientStub.emit('stanza', msg);
        });
    });

    describe('when it receives a request for participation', function(){

        const numberOfQueuedPlayers = gc.numberOfQueuedPlayers();
        const START = new Date().getTime();

        const waittimeMsg = new xmpp.Message({from: requester});
        waittimeMsg.c('body').t(waittimeRequest + WAIT_TIME);

        const PLAY_REQUEST_STRING = magicStrings.getMagicString('PLAY_REQUEST_STRING');
        const playRequestMsg = new xmpp.Message({from: requester});
        playRequestMsg.c('body').t(PLAY_REQUEST_STRING);

        before(function(){
            xmppClientStub.emit('stanza', waittimeMsg);
            xmppClientStub.emit('stanza', playRequestMsg);
        });

        afterEach(function(){
            gc.emit = originalEmitFn;
        });

        it('adds the sender to the currently queued participants', function(){

            gc.numberOfQueuedPlayers().should.equal(numberOfQueuedPlayers + 1);
            gc.receivedPlayRequestFrom(requester).should.be.true;

            const from = 'other_user@some.server.org';
            const msg = new xmpp.Message({from: from});
            msg.c('body').t(PLAY_REQUEST_STRING);
            xmppClientStub.emit('stanza', msg);
            gc.numberOfQueuedPlayers().should.equal(numberOfQueuedPlayers + 2);
            gc.receivedPlayRequestFrom(from).should.be.true;
        });

        it('waits WAITTIME seconds and emits a TIME_TO_PLAY event', function(done){
            gc.emit = function(type, data){
                const NOW = new Date().getTime();
                NOW.should.below(START + 1100);
                NOW.should.above(START + 900);
                type.should.equal('time to play');
                data.should.be.an.instanceOf(Array);
                data.length.should.equal(2);
                done();
            }
        });

        it('only adds a given player once', function(){
            xmppClientStub.emit('stanza', playRequestMsg);
            xmppClientStub.emit('stanza', playRequestMsg);
            gc.numberOfQueuedPlayers().should.equal(1);
        });

    });

})