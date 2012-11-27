/*
all the magic strings that are observable by users should be in here.
 */

function MagicStrings(){
	this.magicStrings = {};
    // to set the maximum duration of a game
    this.loadMagicString('GAMETIME', 'GAMETIME ');
    // to request or to set the time to wait between the first player registering interest and the game actually starting
    this.loadMagicString('WAITTIME', 'WAITTIME ');
    // the string sent to the user who requests or sets the time to wait between the first player registering interest and the game actually starting
	this.loadMagicString('WAITTIME_RESPONSE', ['currently the game co-ordinator is waiting ', 's before opening the chat room']);
    // to set the duration of the period between the time this command is sent and the game starting
    this.loadMagicString('WEREWOLF_ELECTION_TIME', 'WEREWOLF_ELECTION_TIME ');
    // to request or to set the duration of a day
    this.loadMagicString('DAYTIME', 'DAYTIME ');
    // the string sent to the user who requests or sets the duration of a day
    this.loadMagicString('DAYTIME_RESPONSE', ['currently the day takes ', 's']);
    // to request or to set the duration of a day
    this.loadMagicString('NIGHTTIME', 'NIGHTTIME ');
    // the string sent to the user who requests or sets the duration of a day
    this.loadMagicString('NIGHTTIME_RESPONSE', ['currently the night takes ', 's']);
    // the string announcing the dawning of the day
    this.loadMagicString('DAY', 'Day');
    // the string announcing the falling of the night
    this.loadMagicString('NIGHT', 'Night');
    // the string a user has to send in the message body to indicate he wants to play
    this.loadMagicString('PLAY_REQUEST_STRING', 'I want to play');
    // the string to concatenate to the PLAY_REQUEST_STRING if you have villager capabilities
    this.loadMagicString('VILLAGER', 'villager');
    // if this string occurs in a private chatroom message to the moderator, you will become the werewolf
    this.loadMagicString('WEREWOLF', 'werewolf');
    // the string received if you will be the werewolf in the game
    this.loadMagicString('DESIGNATED_AS_WEREWOLF', 'You are selected as werewolf for this game.');
    // the string received to ask who you want to eat as a werewolf
    this.loadMagicString('WHO_DO_YOU_WANT_TO_EAT', 'Please choose who you want to eat: ');
    // how you announce who you will eat
    this.loadMagicString('I_EAT', 'I eat ');
    // announcing the victim of an attack
    this.loadMagicString('VICTIM_ANNOUNCEMENT', 'The werewolf ate ');
    // requesting votes
    this.loadMagicString('REQUEST_VOTE', 'Please vote who should be hanged: ');
    // cast vote
    this.loadMagicString('VOTE', 'I vote for ');
    // prompt revote after having voted for self
    this.loadMagicString('NO_VOTES_FOR_SELF', ', you cannot be serious! You cannot hang yourself! Please vote again.')
    // prompt revote if the vote was cast for someone who is not alive
    this.loadMagicString('ONLY_VOTES_FOR_LIVE_PLAYERS', ', you can only vote for live players: ');
    // prompt message if player already voted
    this.loadMagicString('NO_DOUBLE_VOTE', ', nice try but you can only vote once!');
    // announce hanging
    this.loadMagicString('HANG_ANNOUNCEMENT', 'The villagers hanged ')
    // announce that werewolves win
    this.loadMagicString('WEREWOLVES_WIN_ANNOUNCEMENT', 'Oh no! Villagers do not outnumber werewolves anymore, so the werewolves know they are stronger and mount a daytime massacre and slaughter all remaining villagers! The werewolves win.')
    // announce that villagers win
    this.loadMagicString('VILLAGERS_WIN_ANNOUNCEMENT', 'Yes! The last werewolve is dead! Finally peace in the village! The villagers win.')

}

MagicStrings.prototype.getMagicString = function (key) {
    if (this.magicStrings[key] == undefined) throw new Error('retrieving value for non-existing key ' + key);
    return this.magicStrings[key];
};

MagicStrings.prototype.loadMagicString = function(key, value){
	this.magicStrings[key] = value;
};

module.exports.MagicStrings = MagicStrings;