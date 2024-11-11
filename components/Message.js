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

        chatList = chatList.filter(
          (chat) => chat.lastMessage?.senderId !== user.uid
        );

        chatList = chatList.sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
          const timeB = b.timestamp?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setConversations(chatList);

        const unreadMessageCount = chatList.filter((chat) => chat.unread === true).length;
        setUnreadMessageCount(unreadMessageCount);
      });
    };

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchConversations(user);
      } else {
        setConversations([]);
        setUnreadMessageCount(0);
        if (unsubscribe) unsubscribe();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      authUnsubscribe();
    };
  }, [firestore, auth, setUnreadMessageCount]);

  const getOtherParticipantInfo = async (participants) => {
    const otherParticipantId = participants.find(participant => participant !== auth.currentUser.uid);
    const otherParticipantRef = doc(firestore, 'users', otherParticipantId);
    const otherParticipantSnap = await getDoc(otherParticipantRef);

    if (otherParticipantSnap.exists()) {
      return { ...otherParticipantSnap.data(), id: otherParticipantId };
    }
    return null;
  };

  const handleChatPress = async (chatId, participants) => {
    const otherParticipantInfo = await getOtherParticipantInfo(participants);
    if (otherParticipantInfo) {
      navigation.navigate('ChattingScreen', {
        chatId,
        participants,
        instructorName: `${otherParticipantInfo.firstName} ${otherParticipantInfo.lastName}`, // Pass full name
        profilePic: otherParticipantInfo.profileImage, // Pass profile image
        role: otherParticipantInfo.role, // Pass the role (e.g., 'instructor' or 'student')
      });
    }
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
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

// Conversation Preview Component
const ConversationPreview = ({ participants, getOtherParticipantInfo, lastMessage, unread }) => {
  const [otherParticipantInfo, setOtherParticipantInfo] = useState(null);

  useEffect(() => {
    const fetchOtherParticipantInfo = async () => {
      const info = await getOtherParticipantInfo(participants);
      setOtherParticipantInfo(info);
    };

    fetchOtherParticipantInfo();
  }, [participants, getOtherParticipantInfo]);

  if (!otherParticipantInfo) {
    return null;
  }

  return (
    <View style={styles.conversationContainer}>
      <Image
        source={{ uri: otherParticipantInfo.profileImage || 'https://via.placeholder.com/50' }}
        style={styles.profileImage}
      />
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
