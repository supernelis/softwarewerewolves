const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');
const sinon = require('sinon');

const magic_strings = require('../lib/magic_strings');
const Mc = require('../lib/mc');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'MasterOfCeremoniesTest@some.server.org';
const participants = ['fred_villager@jabber.org', 'mo_werewolf@jabber.org'];

function TestMc(){

    this.client = xmppClientStub;
    this.client.send = function(){};
    Mc.call(this, '', '', '', participants);
}

util.inherits(TestMc, Mc);

describe('Mc', function(){


    const mc = new TestMc();
    const matcher = sinon.match;
    var village;

    it('creates a room', function(done){
       mc.client.send = function(stanza){
            const to = stanza.to;
            if (stanza.is('presence') && to){
                const matchResult = to.match(/^(village\d+@[^\/]+)\/MC$/);
                if (matchResult){
                    village = matchResult[1];
                    done();
                }
            }
        };
        mc.client.emit('online');
    });

    it('starts the game at night', function(){
        const spy = sinon.spy(mc.client.send);
        spy.withArgs(matcher.instanceOf(xmpp.Message)
            .and(matcher.has('type', 'groupchat'))
            .and(sinon.match(function(message){
            return 'Night' == message.getChild('subject').getText();
        spy.calledOnce.should.equal.true;
        })));
    });

    /*
     message that should trigger invitations:
     <presence from="village496@conference.jabber.org/MC" to="softwarewolf@jabber.org/451cae9449f7c380" xmlns:stream="http://etherx.jabber.org/streams">
        <x xmlns="http://jabber.org/protocol/muc#user">
            <item affiliation="owner" role="moderator"/>
            <status code="110"/>
        </x>
     </presence>
     */
    it('invites all the participants', function(done){
        const MUC_USER_NS = 'http://jabber.org/protocol/muc#user';
        const msg = new xmpp.Presence({from: village + '/MC', to: xmppClientStub.jid, 'xmlns:stream': 'http://etherx.jabber.org/streams'});
        msg.c('x', {xlmns: MUC_USER_NS})
            .c('status', {code: 110});
        var stillToInvite = participants.length;
        mc.client.send = function(stanza){
            if (stanza.is('message')){
                const x = stanza.getChild('x');
                if (x && x.is('x', MUC_USER_NS) && x.attr('jid') == village){
                    const invite = x.getChild('invite');
                    if (invite){
                        const participant = invite.attr('to');
                        const idx = participants.indexOf(participant);
                        if (idx >= 0){
                            stillToInvite--;
                            util.log('still ' + stillToInvite + ' participants to invite');
                            if (stillToInvite == 0){
                                done();
                            }
                        }
                    }
                }
            }
        };
        mc.client.emit('stanza', msg);
    });

});