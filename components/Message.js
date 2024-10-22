import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import onAuthStateChanged correctly

const MessagesScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const auth = getAuth(); // Initialize Firebase auth
  const currentUser = auth.currentUser;
  const firestore = getFirestore();

  useEffect(() => {
    let unsubscribe = null;

    // Function to fetch conversations
    const fetchConversations = (user) => {
      const chatsRef = collection(firestore, 'chats');
      const q = query(chatsRef, where('participants', 'array-contains', user.uid));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const chatList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setConversations(chatList);
      });
    };

    // Listen for authentication state changes
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConversations(user); // Fetch conversations when logged in
      } else {
        setConversations([]); // Clear conversations on logout
        if (unsubscribe) unsubscribe(); // Cleanup Firestore listener
      }
    });

    return () => {
      if (unsubscribe) unsubscribe(); // Cleanup Firestore listener
      authUnsubscribe(); // Cleanup authentication listener
    };
  }, [firestore, auth]);

  // Fetch profile details of the other participant
  const getOtherParticipantInfo = async (participants) => {
    const otherParticipantId = participants.find(participant => participant !== currentUser.uid);
    const otherParticipantRef = doc(firestore, 'users', otherParticipantId);
    const otherParticipantSnap = await getDoc(otherParticipantRef);

    if (otherParticipantSnap.exists()) {
      return { ...otherParticipantSnap.data(), id: otherParticipantId }; // Return { firstName, lastName, profileImage, id }
    }
    return null;
  };

  // Navigate to the ChattingScreen with the chatId
  const handleChatPress = (chatId, participants) => {
    navigation.navigate('ChattingScreen', {
      chatId,
      participants,
    });
  };

  return (
    <View style={styles.container}>
      {conversations.length === 0 ? (
        <Text style={styles.emptyMessageText}>No messages here yet. Start a conversation!</Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleChatPress(item.id, item.participants)}
              style={styles.chatItem}
            >
              <ConversationPreview
                participants={item.participants}
                getOtherParticipantInfo={getOtherParticipantInfo}
                lastMessage={item.lastMessage} // Assuming you have lastMessage stored
                unread={item.unread} // Assuming 'unread' indicates whether there are unread messages
                navigation={navigation} // Pass navigation for navigating to the instructor profile
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

// Conversation Preview Component
const ConversationPreview = ({ participants, getOtherParticipantInfo, lastMessage, unread, navigation }) => {
  const [otherParticipantInfo, setOtherParticipantInfo] = useState(null);

  useEffect(() => {
    const fetchOtherParticipantInfo = async () => {
      const info = await getOtherParticipantInfo(participants);
      setOtherParticipantInfo(info);
    };

    fetchOtherParticipantInfo();
  }, [participants, getOtherParticipantInfo]);

  if (!otherParticipantInfo) {
    return null; // Show loading or return null until participant info is fetched
  }

  // Navigate to the instructor's profile when the profile image is clicked
  const handleProfileImageClick = () => {
    navigation.navigate('InstructorProfile', {
      firstName: otherParticipantInfo.firstName,
      lastName: otherParticipantInfo.lastName,
      profileImage: otherParticipantInfo.profileImage,
      userId: otherParticipantInfo.id,
      email: otherParticipantInfo.email, // Add more info if needed
      phone: otherParticipantInfo.phone, // Add more info if needed
    });
  };

  return (
    <View style={styles.conversationContainer}>
      <TouchableOpacity onPress={handleProfileImageClick}>
        <Image
          source={{ uri: otherParticipantInfo.profileImage || 'https://via.placeholder.com/50' }}
          style={styles.profileImage}
        />
      </TouchableOpacity>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{`${otherParticipantInfo.firstName} ${otherParticipantInfo.lastName}`}</Text>
        <Text style={styles.lastMessage}>{lastMessage || 'No messages yet'}</Text>
      </View>
      {unread && <View style={styles.unreadIndicator} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyMessageText: {
    textAlign: 'center',
    fontSize: 18,
    color: '#888',
    marginTop: 50,
  },
  chatItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conversationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007bff',
  },
});

export default MessagesScreen;
