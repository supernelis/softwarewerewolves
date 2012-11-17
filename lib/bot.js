/**
 * Created with JetBrains WebStorm.
 * User: nelis
 * Date: 16/11/12
 * Time: 14:43
 * To change this template use File | Settings | File Templates.
 */


const BotXmppHelper = require('./bot_xmpp_helper');

function Bot(jid, password, host, coordinatorjid, roomnick){
    var xmppHelper = new BotXmppHelper(jid,password,host,coordinatorjid,roomnick);

    xmppHelper.on('arrived_at_village',function(){
        xmppHelper.sendMessageToVillage("Howdy!")
    });


}

