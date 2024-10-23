import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getFirestore, collection, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const MessagesScreen = ({ navigation, setHasUnreadMessages }) => {
  const [conversations, setConversations] = useState([]);
  const auth = getAuth();
  const firestore = getFirestore();

  useEffect(() => {
    let unsubscribe = null;

    // Function to fetch conversations from the user's chats subcollection
    const fetchConversations = (user) => {
      const userChatsRef = collection(firestore, 'users', user.uid, 'chats');

      unsubscribe = onSnapshot(userChatsRef, (snapshot) => {
        const chatList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setConversations(chatList);

        // Check if any chat has unread messages
        const hasUnreadMessages = chatList.some((chat) => chat.unread === true);
        setHasUnreadMessages(hasUnreadMessages); // Update the unread status for the tab bar
      });
    };

    // Listen for authentication state changes
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConversations(user); // Fetch conversations when the user is logged in
      } else {
        setConversations([]);
        setHasUnreadMessages(false); // Reset the unread status when the user logs out
        if (unsubscribe) unsubscribe(); // Cleanup Firestore listener
      }
    });

    return () => {
      if (unsubscribe) unsubscribe(); // Cleanup Firestore listener
      authUnsubscribe(); // Cleanup authentication listener
    };
  }, [firestore, auth, setHasUnreadMessages]);

  // Fetch profile details of the other participant
  const getOtherParticipantInfo = async (participants) => {
    const otherParticipantId = participants.find(participant => participant !== auth.currentUser.uid);
    const otherParticipantRef = doc(firestore, 'users', otherParticipantId);
    const otherParticipantSnap = await getDoc(otherParticipantRef);

    if (otherParticipantSnap.exists()) {
      return { ...otherParticipantSnap.data(), id: otherParticipantId }; // Return the participant's full user info
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
                unread={item.unread} // Assuming 'unread' indicates unread messages
                navigation={navigation}
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
    return null; // Return null or a loading indicator until the participant's info is fetched
  }

  // Navigate to the appropriate profile (Instructor or Student) when the profile image is clicked
  const handleProfileImageClick = () => {
    if (otherParticipantInfo.role === 'instructor') {
      navigation.navigate('InstructorProfile', {
        firstName: otherParticipantInfo.firstName,
        lastName: otherParticipantInfo.lastName,
        phone: otherParticipantInfo.phone,
        email: otherParticipantInfo.email,
        whatsapp: otherParticipantInfo.whatsapp,
        profileImage: otherParticipantInfo.profileImage,
        price: otherParticipantInfo.price,
        activePlan: otherParticipantInfo.activePlan,
        userId: otherParticipantInfo.id,
        studentsCount: otherParticipantInfo.studentsCount,
        commentsCount: otherParticipantInfo.commentsCount,
        rating: otherParticipantInfo.rating,
        totalVotes: otherParticipantInfo.totalVotes,
        carType: otherParticipantInfo.carType,
        distance: otherParticipantInfo.distance,
      });
    } else if (otherParticipantInfo.role === 'student') {
      navigation.navigate('StudentProfile', {
        firstName: otherParticipantInfo.firstName,
        lastName: otherParticipantInfo.lastName,
        profileImage: otherParticipantInfo.profileImage,
        userId: otherParticipantInfo.id,
      });
    }
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
