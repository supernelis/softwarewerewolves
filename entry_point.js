const Mc = require('./mc');

var chatroom = 'village' + Math.floor(Math.random() * 1000);
var mc = new Mc(chatroom, ['fred_villager', 'mo_werewolf']);
