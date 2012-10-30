const should = require('should');
const gc = require('../lib/game_coordinator');

describe('GameCoordinator', function(){
    describe('#parse_user', function(){
        it('should return the user without the resource', function(){
            gc.parse_user('mo@jabber.org/pda')[1].should.equal('mo@jabber.org');
            gc.parse_user('mo_werewolf@jabber.org')[1].should.equal('mo_werewolf@jabber.org');
        })
    })
})