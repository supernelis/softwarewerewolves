var msgs = {}

function Messages(){}

Messages.prototype.get_message = function(key){
	return msgs[key];
}

Messages.prototype.load_message = function(key, value){
	msgs[key] = value;
}

exports.Messages = Messages;