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
    xmppClientStub.emit('online');

    describe('#parse_user', function(){
        it('returns the user without the resource', function(){
            gc.parse_user('mo@jabber.org/pda')[1].should.equal('mo@jabber.org');
            gc.parse_user('mo_werewolf@jabber.org')[1].should.equal('mo_werewolf@jabber.org');
        })
    });

    describe('receiving a WAITTIME message', function() {
        it('sends a response when no new delay has been specified', function(done){
            const requester = 'testUser@some.server.org';
            const msg = new xmpp.Message({from: requester});
            msg.c('body').t('WAITTIME');
            xmppClientStub.send = function(stanza){
                const waittimeResponseParts = magicStrings.getMagicString('WAITTIME_RESPONSE');
                stanza.is('message').should.be.true;
                stanza.to.should.equal(requester);
                stanza.getChild('body').getText()
                    .should.match(new RegExp('^' + waittimeResponseParts[0] + '\\d+' + waittimeResponseParts[1] + '$'));
                done();
            };
            xmppClientStub.emit('stanza', msg);
        });

		it('sends a response when a new delay has been specified', function(done){
		            const requester = 'testUser@some.server.org';
		            const msg = new xmpp.Message({from: requester});
		            msg.c('body').t('WAITTIME 23');
		            xmppClientStub.send = function(stanza){
	                    const waittimeResponseParts = magicStrings.getMagicString('WAITTIME_RESPONSE');
		                stanza.is('message').should.be.true;
		                stanza.to.should.equal(requester);
		                stanza.getChild('body').getText()
		                    .should.match(new RegExp('^' + waittimeResponseParts[0] + '23' + waittimeResponseParts[1] + '$'));
		                done();
		            };
		            xmppClientStub.emit('stanza', msg);
		        });
    });

})