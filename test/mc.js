const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');
const sinon = require('sinon');

const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Mc = require('../lib/mc');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'MasterOfCeremoniesTest@some.server.org';
const somePlayer = 'fred_villager@jabber.org';
const someOtherPlayer = 'mo_werewolf@jabber.org';
const participants = [somePlayer, someOtherPlayer];

function TestMc(){

    this.client = xmppClientStub;
    this.client.send = function(){};
    Mc.call(this, '', '', '', participants);
}

util.inherits(TestMc, Mc);

describe('Mc', function(){


    const mc = new TestMc();
    const matcher = sinon.match;
    const targetNightOrDayDuration = '1';
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

    describe('receiving a DAYTIME message', function(){
        const daytimeResponseParts = magicStrings.getMagicString('DAYTIME_RESPONSE');
        it('responds with the current daytime duration', function(done){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('DAYTIME'));
            mc.client.send = function(message){
                const body = message.getChild('body');
                if (message.is('message') && body){
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + daytimeResponseParts[0] + '\\d+' + daytimeResponseParts[1] + '$'));
                    if (matchResult){
                        done();
                    }
                }
            };
            mc.client.emit('stanza', msg);
        });

        it('resets the duration', function(done){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('DAYTIME') + targetNightOrDayDuration);
            mc.client.send = function(message){
                const body = message.getChild('body');
                if (message.is('message') && body){
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + daytimeResponseParts[0] + '(\\d+)' + daytimeResponseParts[1] + '$'));
                    if (matchResult){
                        matchResult[1].should.equal(targetNightOrDayDuration);
                        done();
                    }
                }
            };
            mc.client.emit('stanza', msg);

        });

    });

    describe('receiving a NIGHTTIME message', function(){
        const nighttimeResponseParts = magicStrings.getMagicString('NIGHTTIME_RESPONSE');
        it('responds with the current nighttime duration', function(done){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('NIGHTTIME'));
            mc.client.send = function(message){
                const body = message.getChild('body');
                if (message.is('message') && body){
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + nighttimeResponseParts[0] + '\\d+' + nighttimeResponseParts[1] + '$'));
                    if (matchResult){
                        done();
                    }
                }
            };
            mc.client.emit('stanza', msg);
        });

        it('resets the duration', function(done){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('NIGHTTIME') + targetNightOrDayDuration);
            mc.client.send = function(message){
                const body = message.getChild('body');
                if (message.is('message') && body){
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + nighttimeResponseParts[0] + '(\\d+)' + nighttimeResponseParts[1] + '$'));
                    if (matchResult){
                        matchResult[1].should.equal(targetNightOrDayDuration);
                        done();
                    }
                }
            };
            mc.client.emit('stanza', msg);

        });

    });

});