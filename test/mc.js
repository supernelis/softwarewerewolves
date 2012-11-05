const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

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
    const targetNightOrDayDuration = '1';
    var village;
    function lookForSubjectChange(subject, done, message){
        util.log('looking for subject change in ' + message);
        if (message.is('message') && message.type == 'groupchat'){
            const subjectElt = message.getChild('subject');
            if (subjectElt){
                subjectElt.getText().should.equal(subject);
                done();
            }
        }
    };

    afterEach(function(){
        mc.client.send = function(){};
    });

    it('creates a room and starts the first night', function(done){
        const validateRoomCreated = function(stanza){
            const to = stanza.to;
            var result = false;
            if (stanza.is('presence') && to){
                const matchResult = to.match(/^(village\d+@[^\/]+)\/MC$/);
                if (matchResult){
                    village = matchResult[1];
                    result = true;
                }
            }
            return result;
        };
        mc.client.send = function(stanza){
            if (validateRoomCreated(stanza)){
                mc.client.send = lookForSubjectChange.bind(null, 'Night', done);
            }
        };
        mc.client.emit('online');
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

    describe('receiving a NIGHTTIME message at night', function(){
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

        it('resets the duration and terminates the night', function(done){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('NIGHTTIME') + targetNightOrDayDuration);
            const validateSetDurationIsEchoed = function(message){
                var result = false;
                const body = message.getChild('body');
                if (message.is('message') && body){
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + nighttimeResponseParts[0] + '(\\d+)' + nighttimeResponseParts[1] + '$'));
                    if (matchResult){
                        result = (matchResult[1] == targetNightOrDayDuration);
                    }
                }
                return result;
            };
            mc.client.send = function(message){
                if (validateSetDurationIsEchoed(message)){
                    mc.client.send = lookForSubjectChange.bind(null, 'Day', done);
                }
            };
            mc.client.emit('stanza', msg);
            mc.phase().should.equal('Day');

        });

    });

    describe('receiving a DAYTIME message during the day', function(){
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

        it('resets the duration and terminates the day', function(done){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('DAYTIME') + targetNightOrDayDuration);
            const validateSetDurationIsEchoed = function(message){
                var result = false;
                const body = message.getChild('body');
                if (message.is('message') && body){
                    const text = body.getText();
                    const matchResult = text.match(new RegExp('^' + daytimeResponseParts[0] + '(\\d+)' + daytimeResponseParts[1] + '$'));
                    if (matchResult){
                        result = (matchResult[1] == targetNightOrDayDuration);
                    }
                }
                return result;
            };
            mc.client.send = function(message){
                if (validateSetDurationIsEchoed(message)){
                    mc.client.send = lookForSubjectChange.bind(null, 'Night', done);
                }
            };
            mc.client.emit('stanza', msg);
            mc.phase().should.equal('Night');

        });

    });

    describe('receiving a DAYTIME message at night', function(){
        it('resets the duration but lets the night continue', function(){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('DAYTIME') + targetNightOrDayDuration);
            mc.client.emit('stanza', msg);
            mc.phase().should.equal('Night');
        });
    });
});