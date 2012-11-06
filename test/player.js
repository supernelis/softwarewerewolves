const should = require('should');
const util = require('util');
const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Player = require('../lib/player');

describe('Player', function(){

    const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
    const VILLAGER = magicStrings.getMagicString('VILLAGER');
    const PLAYER_JID = 'some_player@some.server';
    const SOME_PLAYER = new Player(PLAYER_JID);

    describe('when created', function(){
        it('remembers the nickname', function(){
            SOME_PLAYER.nickname.should.equal(PLAYER_JID);
        });
        it('initially has a villager role', function(){
            SOME_PLAYER.role.should.equal(VILLAGER);
        })
        it('remembers its role', function(){
            SOME_PLAYER.role = WEREWOLF;
            SOME_PLAYER.role.should.equal(WEREWOLF);
        });
    });
});
