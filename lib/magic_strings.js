function MagicStrings(){
	this.magicStrings = {}
	this.loadMagicString('WAITTIME_RESPONSE', ['currently the game co-ordinator is waiting ', 's before opening the chat room']);
}

MagicStrings.prototype.getMagicString = function(key){
	if (this.magicStrings[key] == undefined) throw new Error('retrieving value for non-existing key');this
	return this.magicStrings[key];
}

MagicStrings.prototype.loadMagicString = function(key, value){
	this.magicStrings[key] = value;
}

module.exports.MagicStrings = MagicStrings;