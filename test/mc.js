const should = require('should');
const xmpp = require('node-xmpp');
const util = require('util');

const Player = require('../lib/player');
const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Mc = require('../lib/mc');

const EventEmitter = require('events').EventEmitter;
const xmppClientStub = new EventEmitter();
xmppClientStub.jid = 'MasterOfCeremoniesTest@some.server.org';
const VILLAGER = magicStrings.getMagicString('VILLAGER');
const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
const somePlayer = 'fred_villager@jabber.org';
const someOtherPlayer = 'mo_werewolf@jabber.org';
const participants = [somePlayer, someOtherPlayer];
const SOME_NICKNAME = 'some_nickname';

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
    it('invites all interested participants', function(done){
        const MUC_USER_NS = 'http://jabber.org/protocol/muc#user';
        const msg = new xmpp.Presence({from: village + '/MC', to: xmppClientStub.jid, 'xmlns:stream': 'http://etherx.jabber.org/streams'});
        msg.c('x', {xlmns: MUC_USER_NS})
            .c('status', {code: 110});
        var stillToInvite = participants.map(function(p){return p});
        mc.client.send = function(stanza){
            if (stanza.is('message')){
                const x = stanza.getChild('x');
                if (x && x.is('x', MUC_USER_NS) && x.attr('jid') == village){
                    const invite = x.getChild('invite');
                    if (invite){
                        const participant = invite.attr('to');
                        util.log('participant: ' + participant);
                        stillToInvite.indexOf(participant).should.not.be.below(0);
                        stillToInvite = stillToInvite.filter(function(p){return p != participant});
                        if (stillToInvite.length == 0){
                            done();
                        }
                    }
                }
            }
        };
        mc.client.emit('stanza', msg);
    });

    /*
     <presence from="village562@conference.jabber.org/fred_villager" to="softwarewolf@jabber.org/cc5ad4c54ce872b5" xmlns:stream="http://etherx.jabber.org/streams">
        <c xmlns="http://jabber.org/protocol/caps" node="http://pidgin.im/" hash="sha-1" ver="DdnydQG7RGhP9E3k9Sf+b+bF0zo="/>
        <x xmlns="http://jabber.org/protocol/muc#user">
            <item affiliation="none" role="participant"/>
        </x>
     </presence>
     <presence from="village562@conference.jabber.org/mo_werewolf" to="softwarewolf@jabber.org/cc5ad4c54ce872b5" xmlns:stream="http://etherx.jabber.org/streams">
        <x xmlns="http://jabber.org/protocol/muc#user">
            <item affiliation="none" role="participant"/>
        </x>
     </presence>
     */
    describe('when players enter the room', function(){
        it('remembers them', function(){
            const presence = new xmpp.Presence({from: village + '/' + SOME_NICKNAME})
            presence.c('x', {xlmns: "http://jabber.org/protocol/muc#user"}).c('item', {role: 'participant'});
            mc.client.emit('stanza', presence);
            mc.players.length.should.equal(1);
            mc.players.indexOf(SOME_NICKNAME).should.not.be.below(0);
        });
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
            mc.phase.should.equal('Day');

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
            mc.phase.should.equal('Night');

        });

    });

    describe('receiving a DAYTIME message at night', function(){
        it('resets the duration but lets the night continue', function(){
            const msg = new xmpp.Message({from: somePlayer});
            msg.c('body').t(magicStrings.getMagicString('DAYTIME') + targetNightOrDayDuration);
            mc.client.emit('stanza', msg);
            mc.phase.should.equal('Night');
        });
    });

    describe('when players tell the master of ceremonies that they want to be a werewolf', function(){
        it('tells the first player that he is the werewolf', function(done){
            const jid = village + '/' + SOME_NICKNAME;
            const id = 'something random';
            const msg = new xmpp.Message({from: jid, type: 'chat', id: id});
            msg.c('body').t('I want to be a ' + WEREWOLF);
            mc.client.send = function(message){
                if (message.is('message') && message.to == jid && message.type == 'chat'){
                    message.getChild('body').getText().should.equal(magicStrings.getMagicString('DESIGNATED_AS_WEREWOLF'));
                    message.id.should.equal(id);
                    done();
                }
            };
            mc.client.emit('stanza', msg);
        });
        it('remembers who is the werewolf', function(){
            mc.werewolves.length.should.equal(1);
            mc.werewolves.indexOf(SOME_NICKNAME).should.not.be.below(0);
        });
    });

    describe('#end', function(){
        it('destroys the room', function(){});
    });
});