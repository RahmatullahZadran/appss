import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, limit, startAfter, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ChattingScreen = ({ route }) => {
  const { chatId } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const firestore = getFirestore();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null); // Store the last visible message for pagination
  const [loadingMore, setLoadingMore] = useState(false); // Loading indicator for pagination
  const flatListRef = useRef(null); // To control scrolling
  const [isInitialLoad, setIsInitialLoad] = useState(true); // To check if it's the initial load

  useEffect(() => {
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(10));
  
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
  
        setMessages((prevMessages) => {
          const newMessageIds = newMessages.map((msg) => msg.id);
          const filteredPrevMessages = prevMessages.filter((msg) => !newMessageIds.includes(msg.id));
          return [...filteredPrevMessages, ...newMessages.reverse()];
        });
  
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
  
        // Mark the chat as read for the current user
        const chatRef = doc(firestore, 'users', currentUser.uid, 'chats', chatId);
        await updateDoc(chatRef, { unread: false }); // Mark as read
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setLoading(false);
    });
  
    return () => unsubscribe();
  }, [firestore, chatId]);
  

  // Function to handle sending a new message
  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const messageData = {
        text: newMessage,
        senderId: currentUser.uid,
        timestamp: new Date(),
      };
  
      // Find the other participant's ID
      const otherParticipantId = route.params.participants.find(participant => participant !== currentUser.uid);
  
      if (!otherParticipantId) {
        console.error('Error: Could not identify the other participant.');
        return;
      }
  
      try {
        // Add the new message to Firestore
        const messagesRef = collection(firestore, 'chats', chatId, 'messages');
        await addDoc(messagesRef, messageData);
  
        // Mark the chat as unread for the other participant
        const chatRefOther = doc(firestore, 'users', otherParticipantId, 'chats', chatId);
        const chatRefCurrent = doc(firestore, 'users', currentUser.uid, 'chats', chatId);
  
        await updateDoc(chatRefOther, {
          unread: true,
          lastMessage: newMessage,
          timestamp: new Date(),
        });
  
        await updateDoc(chatRefCurrent, {
          lastMessage: newMessage,
          timestamp: new Date(),
        });
  
        setNewMessage('');
        flatListRef.current?.scrollToEnd({ animated: true }); // Scroll to the bottom after sending a message
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };
  
  

  // Fetch more messages for pagination when scrolling to the top
  const fetchMoreMessages = async () => {
    if (loadingMore || !lastVisible) return;

    setLoadingMore(true);
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), startAfter(lastVisible), limit(6));

    try {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const moreMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMessages(prevMessages => [...moreMessages.reverse(), ...prevMessages]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]); // Update last visible message for pagination
      }
      setLoadingMore(false);
    } catch (error) {
      setLoadingMore(false);
      console.error('Error fetching more messages:', error);
    }
  };

  // Render each message with timestamp and avatar for received messages
  const renderMessage = ({ item }) => {
    const isSent = item.senderId === currentUser.uid;
    const messageTime = new Date(item.timestamp?.seconds * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={isSent ? styles.sentMessageContainer : styles.receivedMessageContainer}>
        {!isSent && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.senderId.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={isSent ? styles.sentMessage : styles.receivedMessage}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTimestamp}>{messageTime}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          // Trigger pagination when scrolling to the top, not the bottom
          onScroll={({ nativeEvent }) => {
            if (nativeEvent.contentOffset.y === 0) {
              fetchMoreMessages();
            }
          }}
          ListFooterComponent={loadingMore && <ActivityIndicator size="small" color="#007bff" />}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={(contentWidth, contentHeight) => {
            if (!loadingMore && !isInitialLoad) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }} // Scroll to bottom when new messages arrive
        />
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity 
          onPress={handleSendMessage} 
          style={styles.sendButton}
          accessibilityLabel="Send Message"
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    maxHeight: 100,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sentMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 5,
  },
  receivedMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 5,
  },
  sentMessage: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  receivedMessage: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageTimestamp: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChattingScreen;
