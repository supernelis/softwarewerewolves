import org.jivesoftware.smack.Chat;
import org.jivesoftware.smack.Connection;
import org.jivesoftware.smack.XMPPException;
import org.jivesoftware.smack.packet.Message;


public class WWBot implements BotXmppSupportEvents {

	public enum BOTSTATE {
		SETUP,
		WAITFORVOTE,
		DEAD
	}
	
	
	private String mc;
	private final BotXmppSupport support;
	private boolean werewolf;

	public WWBot(BotXmppSupport support){
		this.support = support;

	}
	
	public void play() throws XMPPException{
		support.askForNewGame(this);
		support.listenToInvites();
	}

	public static void main(String[] args) throws XMPPException, InterruptedException{
		Connection.DEBUG_ENABLED = true;
		WWBot joligeheidi = new WWBot(new BotXmppSupport("joligeheidi", "asjemenou","sww"));
		joligeheidi.play();
		
		while(true){
		}
	}

	@Override
	public void joinedVillage(String mc) {
		System.out.println("Invited in village by "+mc);
		this.mc = mc;
		support.sendMessageToVillage("Howdy!");
	}

	@Override
	public void privateMessageReceived(Message m) {
		System.out.println("Private Message received " + m.toString());		
	}

	@Override
	public void messageReceived(Chat chat, Message m) throws XMPPException {
		System.out.println("From "+ m.getFrom() + " received message "+ m.getBody());
		
		if(m.getFrom().equals(mc)){
			if(m.getBody().startsWith("You are selected as werewolf for this game")){
				werewolf = true;
			}
		
			if (werewolf && m.getBody().startsWith("Please choose who you want to eat")){
				String[] lines = m.getBody().split(":");
				String[] players = lines[1].split(",");
				chat.sendMessage("I eat "+players[0]);	
			}
		}
	}
	
	@Override
	public void subjectChangeReceived(String subject, String from) {
		System.out.println("Subject: " + subject + " From:  " + from);
		
	}

	@Override
	public void messageReceived(Message m) {
		String messageBody = m.getBody();
		System.out.println(m.getFrom() + ": " + messageBody);
		
//		if(m.getFrom().equals(mc)){		
			if (messageBody.startsWith("Please vote who should be hanged:")){
				String[] lines = messageBody.split(":");
				String[] players = lines[1].split(",");
				support.sendMessageToVillage("I vote for "+players[0]);	
			}
//		}
	}
}
