const MagicStrings = require('./magic_strings');
const magicStrings = new MagicStrings.MagicStrings();
const VILLAGER = magicStrings.getMagicString('VILLAGER');

function Player(nickname){

    this.role = VILLAGER;

    this.__defineGetter__('nickname', function(){
        return nickname;
    });

};

module.exports = Player;