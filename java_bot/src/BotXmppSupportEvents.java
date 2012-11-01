import org.jivesoftware.smack.Chat;
import org.jivesoftware.smack.XMPPException;
import org.jivesoftware.smack.packet.Message;


public interface BotXmppSupportEvents {

	public void joinedVillage(String mc);
	
	public void privateMessageReceived(Message m);
	
	public void messageReceived(Chat chat, Message m) throws XMPPException;
	
	public void subjectChangeReceived(String subject, String from);

	public void messageReceived(Message m);

}
