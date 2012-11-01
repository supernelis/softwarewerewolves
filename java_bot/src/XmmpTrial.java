import org.jivesoftware.smack.Chat;
import org.jivesoftware.smack.ChatManager;
import org.jivesoftware.smack.Connection;
import org.jivesoftware.smack.MessageListener;
import org.jivesoftware.smack.XMPPConnection;
import org.jivesoftware.smack.XMPPException;
import org.jivesoftware.smack.packet.Message;


public class XmmpTrial {

	public static void main(String[] args) throws XMPPException{
		// Create a connection to the jabber.org server.
		//Connection.DEBUG_ENABLED = true;
		
		Connection connection = new XMPPConnection("jabber.org");
		connection.connect();
				
		connection.login("joligeheidi", "asjemenou");
	
		Connection connection2 = new XMPPConnection("jabber.org");
		connection2.connect();
				
		connection2.login("joligeheidi", "asjemenou");
		
		ChatManager chatmanager = connection.getChatManager();
		Chat newChat = chatmanager.createChat("werewolves@jabber.org", new MessageListener() {
		    public void processMessage(Chat chat, Message message) {
		        System.out.println("Joligeheidi received message: " + message.getBody());
		    }
		});

		ChatManager chatmanager2 = connection2.getChatManager();
		Chat newChat2 = chatmanager2.createChat("werewolves@jabber.org", new MessageListener() {
		    public void processMessage(Chat chat, Message message) {
		        System.out.println("fred_villager received message: " + message.getBody());
		    }
		});
		
		try {
		    newChat.sendMessage("Howdy1!");
		}
		catch (XMPPException e) {
		    System.out.println("Error Delivering block");
		}
		
	
		

		try {
		    newChat2.sendMessage("Howdy2!");
		}
		catch (XMPPException e) {
		    System.out.println("Error Delivering block");
		}
		
		
		System.out.println("Test");
	

		
		connection.disconnect();
		connection2.disconnect();
	}
	
}
