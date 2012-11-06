/*
all the magic strings that are observable by users should be in here.
 */

function MagicStrings(){
	this.magicStrings = {};
    // to request or to set the time to wait between the first player registering interest and the game actually starting
    this.loadMagicString('WAITTIME', 'WAITTIME ');
    // the string sent to the user who requests or sets the time to wait between the first player registering interest and the game actually starting
	this.loadMagicString('WAITTIME_RESPONSE', ['currently the game co-ordinator is waiting ', 's before opening the chat room']);
    // to request or to set the duration of a day
    this.loadMagicString('DAYTIME', 'DAYTIME ');
    // the string sent to the user who requests or sets the duration of a day
    this.loadMagicString('DAYTIME_RESPONSE', ['currently the day takes ', 's']);
    // to request or to set the duration of a day
    this.loadMagicString('NIGHTTIME', 'NIGHTTIME ');
    // the string sent to the user who requests or sets the duration of a day
    this.loadMagicString('NIGHTTIME_RESPONSE', ['currently the night takes ', 's']);
    // the string a user has to send in the message body to indicate he wants to play
    this.loadMagicString('PLAY_REQUEST_STRING', 'I want to play');
    // the string to concatenate to the PLAY_REQUEST_STRING if you have villager capabilities
    this.loadMagicString('VILLAGER', 'villager');
    // the string to concatenate to the PLAY_REQUEST_STRING if you have werewolf capabilities
    this.loadMagicString('WEREWOLF', 'werewolf');
    // the string received if you will be the werewolf in the game
    this.loadMagicString('DESIGNATED_AS_WEREWOLF', 'You are selected as werewolf for this game.');
}

MagicStrings.prototype.getMagicString = function (key) {
    if (this.magicStrings[key] == undefined) throw new Error('retrieving value for non-existing key ' + key);
    return this.magicStrings[key];
};

MagicStrings.prototype.loadMagicString = function(key, value){
	this.magicStrings[key] = value;
};

module.exports.MagicStrings = MagicStrings;