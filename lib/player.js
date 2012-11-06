function Player(user, caps){

    var capabilities = [];

    if (caps instanceof Array){
        capabilities = caps;
    } else {
        capabilities.push(caps);
    }

    this.__defineGetter__('capabilities', function(){
        const length = capabilities.length;
        const result =  [];
        for (var i = 0; i < length; i++){
            result.push(capabilities[i]);
        }
        return result;
    });

    this.__defineGetter__('user', function(){
        return user;
    });

};

module.exports = Player;