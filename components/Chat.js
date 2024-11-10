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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, limit, startAfter, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ChattingScreen = ({ route }) => {
  const { chatId, participants } = route.params;
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const firestore = getFirestore();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(8)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMessages((prevMessages) => {
          const prevMessageIds = prevMessages.map((msg) => msg.id);
          const filteredNewMessages = newMessages.filter(
            (msg) => !prevMessageIds.includes(msg.id)
          );

          return [...filteredNewMessages.reverse(), ...prevMessages];
        });

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);

        const chatRef = doc(firestore, 'users', currentUser.uid, 'chats', chatId);
        await updateDoc(chatRef, { unread: false });

        // Scroll to the end only when a new message is received
        flatListRef.current?.scrollToEnd({ animated: true });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, chatId]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
  
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);
  
  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      const messageData = {
        text: newMessage,
        senderId: currentUser.uid,
        timestamp: new Date(),
      };

      const otherParticipantId = participants.find(participant => participant !== currentUser.uid);

      if (!otherParticipantId) {
        console.error('Error: Could not identify the other participant.');
        return;
      }

      try {
        const messagesRef = collection(firestore, 'chats', chatId, 'messages');
        await addDoc(messagesRef, messageData);

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
        
        // Scroll to the end after sending a new message
        flatListRef.current?.scrollToEnd({ animated: true });
      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };
  
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
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
      setLoadingMore(false);
    } catch (error) {
      setLoadingMore(false);
      console.error('Error fetching more messages:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isSent = item.senderId === currentUser.uid;
    const messageTime = new Date(item.timestamp?.seconds * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={isSent ? styles.sentMessageContainer : styles.receivedMessageContainer}>
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
        <ActivityIndicator size="large" color="#4caf50" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          onScroll={({ nativeEvent }) => {
            if (nativeEvent.contentOffset.y === 0) {
              fetchMoreMessages();
            }
          }}
          ListFooterComponent={loadingMore && <ActivityIndicator size="small" color="#4caf50" />}
          style={{
            flex: 1,
            paddingBottom: keyboardHeight, 
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor="#a9a9a9"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          onFocus={() => {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
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
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    maxHeight: 100,
    backgroundColor: '#f1f3f6',
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
    backgroundColor: '#4caf50',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  receivedMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 5,
    paddingHorizontal: 10,
  },
  sentMessage: {
    backgroundColor: '#4caf50',
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  receivedMessage: {
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 15,
    maxWidth: '80%',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  messageTimestamp: {
    color: '#e0f7fa',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 5,
  },
});

export default ChattingScreen;
