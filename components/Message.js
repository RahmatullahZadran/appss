import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { getFirestore, collection, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const MessagesScreen = ({ navigation, setUnreadMessageCount }) => {
  const [conversations, setConversations] = useState([]);
  const auth = getAuth();
  const firestore = getFirestore();

  useEffect(() => {
    let unsubscribe = null;

    const fetchConversations = (user) => {
      const userChatsRef = collection(firestore, 'users', user.uid, 'chats');

      unsubscribe = onSnapshot(userChatsRef, (snapshot) => {
        let chatList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data
          };
        });

        // Filter out chats where the last message was sent by the current user to avoid irrelevant updates
        chatList = chatList.filter(
          (chat) => chat.lastMessage?.senderId !== user.uid
        );

        // Sort chatList by the most recent message, using `timestamp` or fallback to `createdAt`
        chatList = chatList.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
          const timeB = b.timestamp?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setConversations(chatList);

        // Calculate the count of unread messages
        const unreadMessageCount = chatList.filter((chat) => chat.unread === true).length;
        setUnreadMessageCount(unreadMessageCount);
      });
    };

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConversations(user); // Fetch conversations when the user is logged in
      } else {
        setConversations([]);
        setUnreadMessageCount(0); // Reset the unread count when the user logs out
        if (unsubscribe) unsubscribe(); // Cleanup Firestore listener
      }
    });

    return () => {
      if (unsubscribe) unsubscribe(); // Cleanup Firestore listener
      authUnsubscribe(); // Cleanup authentication listener
    };
  }, [firestore, auth, setUnreadMessageCount]);

  const getOtherParticipantInfo = async (participants) => {
    const otherParticipantId = participants.find(participant => participant !== auth.currentUser.uid);
    const otherParticipantRef = doc(firestore, 'users', otherParticipantId);
    const otherParticipantSnap = await getDoc(otherParticipantRef);

    if (otherParticipantSnap.exists()) {
      return { ...otherParticipantSnap.data(), id: otherParticipantId }; // Return the participant's full user info
    }
    return null;
  };

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
                lastMessage={item.lastMessage}
                unread={item.unread}
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

  const handleProfileImageClick = () => {
    if (otherParticipantInfo.role === 'instructor') {
      navigation.navigate('InstructorProfile', { ...otherParticipantInfo });
    } else if (otherParticipantInfo.role === 'student') {
      navigation.navigate('StudentProfile', { ...otherParticipantInfo });
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