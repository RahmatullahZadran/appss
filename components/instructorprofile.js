import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { getFirestore, collection, getDocs, addDoc } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons';
import { Timestamp } from 'firebase/firestore';

const InstructorProfileScreen = ({ route }) => {
  const { firstName, lastName, phone, email, whatsapp, profileImage, price, activePlan, userId } = route.params;
  const [comments, setComments] = useState([]);
  const [students, setStudents] = useState([]);
  const [newComment, setNewComment] = useState(''); // Input for new comment
  const [loading, setLoading] = useState(true); // Loading spinner for data
  const [visibleComments, setVisibleComments] = useState(5); // Control visible comments
  const [newReply, setNewReply] = useState(''); // Input for reply
  const [replyCommentId, setReplyCommentId] = useState(null); // Track the comment being replied to
  const [showCommentInput, setShowCommentInput] = useState(false);  // Track if the comment input is visible

  const firestore = getFirestore(); // Initialize Firestore

  useEffect(() => {
    // Fetch comments and students when the component loads
    const fetchCommentsAndStudents = async () => {
      try {
        // Fetch comments
        const commentsRef = collection(firestore, 'users', userId, 'comments');
        const commentsSnapshot = await getDocs(commentsRef);
        const commentsList = await Promise.all(
          commentsSnapshot.docs.map(async (doc) => {
            const repliesRef = collection(firestore, 'users', userId, 'comments', doc.id, 'replies');
            const repliesSnapshot = await getDocs(repliesRef);
            const replies = repliesSnapshot.docs.map(replyDoc => ({ id: replyDoc.id, ...replyDoc.data() }));

            return { id: doc.id, ...doc.data(), replies }; // Add replies to comment data
          })
        );

        // Fetch students
        const studentsRef = collection(firestore, 'users', userId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setComments(commentsList);
        setStudents(studentsList);
      } catch (error) {
        console.error('Error fetching comments or students:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommentsAndStudents();
  }, [userId]);

  const handleToggleCommentInput = () => {
    setShowCommentInput(!showCommentInput);  // Toggle the comment input visibility
  };

  // Handle adding a new comment
  const handleAddComment = async () => {
    if (newComment.trim()) {
      const commentsRef = collection(firestore, 'users', userId, 'comments');
      const newCommentData = {
        text: newComment,
        name: firstName, // This could be replaced with actual commenter's name if available
        timestamp: Timestamp.now(), // Use Firestore timestamp
      };

      await addDoc(commentsRef, newCommentData); // Add comment to Firestore
      setComments([newCommentData, ...comments]); // Update the local state
      setNewComment(''); // Clear the input
    }
  };

  // Handle adding a reply to a comment
  const handleAddReply = async (commentId) => {
    if (newReply.trim()) {
      const repliesRef = collection(firestore, 'users', userId, 'comments', commentId, 'replies');
      const newReplyData = {
        text: newReply,
        name: firstName, // This could be replaced with actual commenter's name if available
        timestamp: Timestamp.now(), // Use Firestore timestamp
      };

      await addDoc(repliesRef, newReplyData); // Add reply to Firestore
      setNewReply(''); // Clear the input
      setReplyCommentId(null); // Reset reply input visibility

      // Fetch updated comments
      const updatedComments = await getDocs(collection(firestore, 'users', userId, 'comments'));
      setComments(updatedComments.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  };

  // Toggle reply input visibility
  const handleReplyButtonClick = (commentId) => {
    setReplyCommentId(replyCommentId === commentId ? null : commentId);
  };

  // Show more comments
  const handleShowMoreComments = () => {
    setVisibleComments(prevVisibleComments => prevVisibleComments + 5); // Show 5 more comments
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Instructor Profile Details */}
      <Image source={{ uri: profileImage || 'https://via.placeholder.com/150' }} style={styles.profileImage} />
      <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>
      <Text style={styles.infoText}>Phone: {phone}</Text>
      <Text style={styles.infoText}>Email: {email}</Text>
      <Text style={styles.infoText}>WhatsApp: {whatsapp}</Text>
      <Text style={styles.infoText}>Price: £{price}</Text>
      <Text style={styles.infoText}>Active Plan: {activePlan}</Text>

      {/* Message Button */}
      <TouchableOpacity style={styles.messageButton}>
        <Text style={styles.buttonText}>Message</Text>
      </TouchableOpacity>

       
      <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>My Comments</Text>
      <TouchableOpacity onPress={handleToggleCommentInput} style={styles.commentInputButton}>
        <Icon name={showCommentInput ? "remove-circle-outline" : "add-circle-outline"} size={24} color="#007bff" />
      </TouchableOpacity>
    </View>
    {showCommentInput && (
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a new comment"
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity onPress={handleAddComment}>
          <Icon name="send" size={24} color="#007bff" />
        </TouchableOpacity>
      </View>
    )}

        {/* Display Comments */}
        <FlatList
          data={comments.slice(0, visibleComments)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View key={item.id} style={styles.commentContainer}>
              <Text style={styles.commentText}>
                <Text style={styles.commenterName}>{item.name}: </Text>
                {item.text}
              </Text>
              <Text style={styles.commentTimestamp}>
                {new Date(item.timestamp?.toDate()).toLocaleString()}
              </Text>

              {/* Display replies for each comment */}
              {item.replies && item.replies.map((reply) => (
                <View key={reply.id} style={styles.replyContainer}>
                  <Text style={styles.replyText}>
                    <Text style={styles.replyerName}>{reply.name}: </Text>
                    {reply.text}
                  </Text>
                  <Text style={styles.replyTimestamp}>
                    {new Date(reply.timestamp?.toDate()).toLocaleString()}
                  </Text>
                </View>
              ))}

              {/* Reply Section */}
              <TouchableOpacity onPress={() => handleReplyButtonClick(item.id)} style={styles.replyButton}>
                <Icon name="chatbox-ellipses-outline" size={20} color="blue" />
              </TouchableOpacity>

              {replyCommentId === item.id && (
                <View style={styles.replyInputContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write a reply..."
                    value={newReply}
                    onChangeText={setNewReply}
                  />
                  <TouchableOpacity onPress={() => handleAddReply(item.id)}>
                    <Icon name="send" size={24} color="#007bff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={
            visibleComments < comments.length && (
              <TouchableOpacity onPress={handleShowMoreComments}>
                <Text style={styles.showMoreText}>Show more comments</Text>
              </TouchableOpacity>
            )
          }
        />
      </View>

      {/* Students Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Students</Text>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          horizontal
          renderItem={({ item }) => (
            <View style={styles.studentContainer}>
              <Image source={{ uri: item.image }} style={styles.studentImage} />
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInputButton: {
    position: 'absolute',
    top: 26,
    right: 5,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
  messageButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  commentsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  commentContainer: {
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 10,
  },
  commentText: {
    fontSize: 16,
  },
  commenterName: {
    fontWeight: 'bold',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  replyButton: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    marginLeft: 20,
  },
  replyInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  replyContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginLeft: 20,
  },
  replyText: {
    fontSize: 14,
  },
  replyerName: {
    fontWeight: 'bold',
  },
  
  replyTimestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  showMoreText: {
    color: '#007bff',
    textAlign: 'center',
    marginTop: 10,
  },
  studentContainer: {
    marginRight: 15,
  },
  studentImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
});

export default InstructorProfileScreen;
