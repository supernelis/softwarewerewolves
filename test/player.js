const should = require('should');
const util = require('util');
const magic_strings = require('../lib/magic_strings');
const magicStrings = new magic_strings.MagicStrings();
const Player = require('../lib/player');

describe('Player', function(){

    const WEREWOLF = magicStrings.getMagicString('WEREWOLF');
    const VILLAGER = magicStrings.getMagicString('VILLAGER');
    const SOME_PLAYER = 'some_player@some.server';

    describe('when created', function(){
        it('remembers the user', function(){
            const player = new Player(SOME_PLAYER, WEREWOLF);
            player.user.should.equal(SOME_PLAYER);
        })
        it('remembers its capability', function(){
            const player = new Player(SOME_PLAYER, WEREWOLF);
            player.capabilities.indexOf(WEREWOLF).should.not.be.below(0);
        });
        it('remembers several capabilities', function(){
            const player = new Player(SOME_PLAYER, [VILLAGER, WEREWOLF]);
            const capabilities = player.capabilities;
            capabilities.length.should.equal(2);
            capabilities.indexOf(WEREWOLF).should.not.be.below(0);
            capabilities.indexOf(VILLAGER).should.not.be.below(0);
        });

    });
});
