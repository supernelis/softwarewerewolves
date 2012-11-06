const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();


const GameCoordinator = require('../lib/game_coordinator');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'GameCoordinatorTest@some.server';


function TestGameCoordinator(){

    this.client = xmppClientStub;
    this.client.send = function(){};
    GameCoordinator.call(this, '', '', '');
}

util.inherits(TestGameCoordinator, GameCoordinator);

describe('GameCoordinator', function(){

    const gc = new TestGameCoordinator();
    const originalEmitFn = gc.emit;
    const SOME_PLAYER = 'testUser@some.server.org';
    const SOME_OTHER_PLAYER = 'other_user@some.server.org';
    const WAITTIME_REQUEST = magicStrings.getMagicString('WAITTIME');
    const WAITTIME_RESPONSE_PARTS = magicStrings.getMagicString('WAITTIME_RESPONSE');
    const WAIT_TIME = 1;
    const PLAY_REQUEST_STRING = magicStrings.getMagicString('PLAY_REQUEST_STRING');

    before(function(){
        xmppClientStub.emit('online');
    });

    describe('#parse_user', function(){
        it('returns the user without the resource', function(){
            gc.parse_user('mo@jabber.org/pda')[1].should.equal('mo@jabber.org');
            gc.parse_user('mo_werewolf@jabber.org')[1].should.equal('mo_werewolf@jabber.org');
        })
    });

    describe('receiving a WAITTIME message', function() {;
        var msg;

        beforeEach(function(){
            msg= new xmpp.Message({from: SOME_PLAYER});
        });

        afterEach(function(){
           xmppClientStub.send = function(){};
        });

        it('sends a response when no new delay has been specified', function(done){
            msg.c('body').t(WAITTIME_REQUEST);
            xmppClientStub.send = function(stanza){
                stanza.is('message').should.be.true;
                stanza.to.should.equal(SOME_PLAYER);
                stanza.getChild('body').getText()
                    .should.match(new RegExp('^' + WAITTIME_RESPONSE_PARTS[0] + '\\d+' + WAITTIME_RESPONSE_PARTS[1] + '$'));
                done();
            };
            xmppClientStub.emit('stanza', msg);
        });

        it('sends a response when a new delay has been specified', function(done){
            msg.c('body').t(WAITTIME_REQUEST + WAIT_TIME);
            xmppClientStub.send = function(stanza){
                stanza.is('message').should.be.true;
                stanza.to.should.equal(SOME_PLAYER);
                stanza.getChild('body').getText()
                    .should.match(new RegExp('^' + WAITTIME_RESPONSE_PARTS[0] + WAIT_TIME + WAITTIME_RESPONSE_PARTS[1] + '$'));
                done();
            };
            xmppClientStub.emit('stanza', msg);
        });
    });

    describe('when it receives a request for participation', function(){

        const numberOfQueuedPlayers = gc.numberOfQueuedPlayers();
        const START = new Date().getTime();

        const waittimeMsg = new xmpp.Message({from: SOME_PLAYER});
        waittimeMsg.c('body').t(WAITTIME_REQUEST + WAIT_TIME);

        const playRequestMsg = new xmpp.Message({from: SOME_PLAYER});
        playRequestMsg.c('body').t(PLAY_REQUEST_STRING);

        afterEach(function(){
            gc.emit = originalEmitFn;
        });

        it('adds the sender to the currently queued participants', function(){
            gc.client.emit('stanza', waittimeMsg);
            gc.client.emit('stanza', playRequestMsg);
            gc.numberOfQueuedPlayers().should.equal(numberOfQueuedPlayers + 1);
            gc.receivedPlayRequestFrom(SOME_PLAYER).should.be.true;

            const msg = new xmpp.Message({from: SOME_OTHER_PLAYER});
            msg.c('body').t(PLAY_REQUEST_STRING);
            xmppClientStub.emit('stanza', msg);
            gc.numberOfQueuedPlayers().should.equal(numberOfQueuedPlayers + 2);
            gc.receivedPlayRequestFrom(SOME_OTHER_PLAYER).should.be.true;
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
            gc.client.emit('stanza', playRequestMsg);
            gc.client.emit('stanza', playRequestMsg);
            gc.numberOfQueuedPlayers().should.equal(1);
        });

    });

})
