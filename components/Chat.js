  import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
  import { SafeAreaView } from 'react-native-safe-area-context';
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
    Image,
    Keyboard,
  } from 'react-native';
  import { Ionicons } from '@expo/vector-icons';
  import { useNavigation } from '@react-navigation/native';
  import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, limit, startAfter, getDocs, doc, updateDoc } from 'firebase/firestore';
  import { getAuth } from 'firebase/auth';

  const ChattingScreen = ({ route }) => {
    const { chatId, participants, instructorName, profilePic } = route.params;
    const auth = getAuth();
    const currentUser = auth.currentUser;
    const firestore = getFirestore();
    const navigation = useNavigation();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastVisible, setLastVisible] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const flatListRef = useRef(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    useEffect(() => {
      const parentNavigator = navigation.getParent(); // Get the parent navigator
      if (parentNavigator) {
        parentNavigator.setOptions({
          tabBarStyle: { display: 'none' }, // Hide the bottom tab bar
        });
      }
    
      return () => {
        if (parentNavigator) {
          parentNavigator.setOptions({
            tabBarStyle: {}, // Restore the bottom tab bar
          });
        }
      };
    }, [navigation]);
    

    useEffect(() => {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerContainer}>
            <Image source={{ uri: profilePic }} style={styles.profileImage} />
            <Text style={styles.headerTitle}>{instructorName}</Text>
          </View>
        ),
      });
    }, [navigation, instructorName, profilePic]);

    useEffect(() => {
      const messagesRef = collection(firestore, 'chats', chatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(9));
    
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const newMessages = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
    
            // Update state only if there are new messages
            setMessages((prevMessages) => {
              const prevMessageIds = new Set(prevMessages.map((msg) => msg.id));
              const filteredNewMessages = newMessages.filter(
                (msg) => !prevMessageIds.has(msg.id)
              );
              return [...filteredNewMessages.reverse(), ...prevMessages];
            });
    
            setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    
            // Update the chat reference to mark unread as false only if it's not the local user
            const chatRef = doc(firestore, 'users', currentUser.uid, 'chats', chatId);
            updateDoc(chatRef, { unread: false });
            
            flatListRef.current?.scrollToEnd({ animated: true });
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching messages:', error);
          setLoading(false);
        }
      );
    
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
    
    const handleSendMessage = useCallback(async () => {
      if (newMessage.trim()) {
        const messageData = {
          text: newMessage,
          senderId: currentUser.uid,
          timestamp: new Date(),
        };
    
        const otherParticipantId = participants.find(
          (participant) => participant !== currentUser.uid
        );
    
        if (!otherParticipantId) {
          console.error('Error: Could not identify the other participant.');
          return;
        }
    
        try {
          const messagesRef = collection(firestore, 'chats', chatId, 'messages');
          const docRef = await addDoc(messagesRef, messageData);
    
          // Locally add the new message to avoid duplicate fetching
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: docRef.id, ...messageData },
          ]);
    
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
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } catch (error) {
          console.error('Error sending message:', error);
          Alert.alert('Error', 'Failed to send message. Please try again.');
        }
      }
    }, [newMessage, chatId, firestore, participants, currentUser.uid]);
    

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

    const renderMessage = useCallback(({ item }) => {
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
    }, [currentUser.uid]);

  
      return (
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
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
            <View style={[styles.inputContainer, { marginBottom: keyboardHeight }]}>
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
        </SafeAreaView>
      );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f7f8fa',
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
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
      marginBottom: 0,
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
