function Game(moderator, bots){
    this.__defineGetter__('moderator', function(){
        return moderator;
    });

    this.__defineGetter__('bots', function(){
        return bots.map(function(bot){
            return bot;
        });
    });
}

module.exports = Game;