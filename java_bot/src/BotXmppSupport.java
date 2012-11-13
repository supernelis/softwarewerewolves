import org.jivesoftware.smack.Chat;
import org.jivesoftware.smack.ChatManager;
import org.jivesoftware.smack.ChatManagerListener;
import org.jivesoftware.smack.Connection;
import org.jivesoftware.smack.MessageListener;
import org.jivesoftware.smack.PacketListener;
import org.jivesoftware.smack.SmackConfiguration;
import org.jivesoftware.smack.XMPPConnection;
import org.jivesoftware.smack.XMPPException;
import org.jivesoftware.smack.packet.Message;
import org.jivesoftware.smack.packet.Packet;
import org.jivesoftware.smackx.muc.DiscussionHistory;
import org.jivesoftware.smackx.muc.InvitationListener;
import org.jivesoftware.smackx.muc.MultiUserChat;
import org.jivesoftware.smackx.muc.SubjectUpdatedListener;


public class BotXmppSupport {

	public static final String SERVER = "jabber.org";
	private XMPPConnection connection;
	private final String gc;
	private final String pwd;
	private MultiUserChat room;
	private final String username;
	private BotXmppSupportEvents events;
	
	public BotXmppSupport(String username, String password, String gamecoordinator) throws XMPPException {
		this.username = username;
		pwd = password;
		this.gc = gamecoordinator;
		
		initialize();
	}
	public String getUsername() {
		return username;
	}
	public void initialize() throws XMPPException{
		connection = new XMPPConnection(SERVER);
		connection.connect();		
		connection.login(getUsername(), getPassword());
	}
	private String getJabberName(String name) {
		// TODO Auto-generated method stub
		return name + "@" + SERVER;
		
	}
	private String getPassword() {
		return pwd;
		
	}
	public void listenToInvites() {
			MultiUserChat.addInvitationListener(connection, new InvitationListener() {
				
				@Override
				public void invitationReceived(Connection connection, String roomName, String inviter,
						String reason, String password, Message arg5) {
						
						room = new MultiUserChat(connection,roomName);
						try {
							DiscussionHistory history = new DiscussionHistory();
						     history.setMaxStanzas(0);
							
							room.join(username,"",history,SmackConfiguration.getPacketReplyTimeout());
							events.joinedVillage(inviter);
							
							MultiUserChat.removeInvitationListener(connection, this);
							room.addMessageListener(new PacketListener() {
								
								@Override
								public void processPacket(Packet arg0) {
									Message m = ((Message) arg0);
									if(!m.getFrom().endsWith(getUsername())){
										events.messageReceived(m);
									}
								}
							});
							
							room.addSubjectUpdatedListener(new SubjectUpdatedListener() {
								
								@Override
								public void subjectUpdated(String arg0, String arg1) {
									events.subjectChangeReceived(arg0,arg1);
									
								}
							});
						
							
	//						room.addSubjectUpdatedListener(listener)
						} catch (XMPPException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						}
					
				}
			}); 
			
		}
	protected void askForNewGame(final BotXmppSupportEvents events) throws XMPPException{
		this.events = events;
		ChatManager chatmanager = connection.getChatManager();
		Chat newChat = chatmanager.createChat(getJabberName(gc), new MessageListener() {
		    public void processMessage(Chat chat, Message message) {
		        try {
					events.messageReceived(chat, message);
				} catch (XMPPException e) {
					// TODO Auto-generated catch block
					e.printStackTrace();
				}
		    }
		});
		
		chatmanager.addChatListener(new ChatManagerListener() {
			
			@Override
			public void chatCreated(Chat chat, boolean arg1) {
				chat.addMessageListener(new MessageListener() {
					
					@Override
					public void processMessage(Chat chat, Message m) {
						try {
							events.messageReceived(chat,m);
						} catch (XMPPException e) {
							// TODO Auto-generated catch block
							e.printStackTrace();
						}			
					}
				});
				
			}
		});
		newChat.sendMessage("I want to play");	
	}
	public void sendMessageToVillage(String message) {
		try {
			room.sendMessage(message);
		} catch (XMPPException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
	}

}
