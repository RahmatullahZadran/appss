import React, { useState, useEffect } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getFirestore, collection, getDocs, addDoc, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import Icon from 'react-native-vector-icons/Ionicons'; // Import Icon
import { Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import Stars from 'react-native-stars'; // Star rating library for Expo
import { AntDesign } from '@expo/vector-icons'; // Icons for stars
import { useNavigation } from '@react-navigation/native';
import StarRating from 'react-native-star-rating-widget';




const InstructorProfileScreen = ({ route }) => {
  const { firstName, lastName, phone, email, whatsapp, profileImage, price, activePlan, userId,carType } = route.params;
  const [comments, setComments] = useState([]);
  const [students, setStudents] = useState([]);
  const [newComment, setNewComment] = useState(''); // Input for new comment
  const [loading, setLoading] = useState(true); // Loading spinner for data
  const [visibleComments, setVisibleComments] = useState(5); // Control visible comments
  const [newReply, setNewReply] = useState(''); // Input for reply
  const [replyCommentId, setReplyCommentId] = useState(null); // Track the comment being replied to
  const [showCommentInput, setShowCommentInput] = useState(false);  // Track if the comment input is visible
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [averageRating, setAverageRating] = useState(0); // Store average rating
  const [totalVotes, setTotalVotes] = useState(0); // Store total number of votes
  const [userHasVoted, setUserHasVoted] = useState(false); // Track if the user has voted
  const [rating, setRating] = useState(0); // User's selected rating
  const navigation = useNavigation();


  const firestore = getFirestore(); // Initialize Firestore

  useEffect(() => {
    const fetchCommentsAndStudentsAndRating = async () => {
      try {
        // Fetch comments and students
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

        const sortedComments = commentsList.sort((a, b) => b.timestamp - a.timestamp);
        const studentsRef = collection(firestore, 'users', userId, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setComments(sortedComments);
        setStudents(studentsList);
        

        // Fetch ratings and calculate the average rating
        const ratingsRef = collection(firestore, 'users', userId, 'ratings');
        const ratingsSnapshot = await getDocs(ratingsRef);
        const allRatings = ratingsSnapshot.docs.map((doc) => doc.data().rating);
        const totalRatings = allRatings.reduce((sum, rating) => sum + rating, 0);
        const averageRating = allRatings.length > 0 ? totalRatings / allRatings.length : 0;

        setAverageRating(averageRating);
        setTotalVotes(allRatings.length);

        // Check if current user has already voted
        if (currentUser) {
          const userRatingDoc = await getDoc(doc(firestore, 'users', userId, 'ratings', currentUser.uid));
          if (userRatingDoc.exists()) {
            setRating(userRatingDoc.data().rating);
            setUserHasVoted(true);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommentsAndStudentsAndRating();
  }, [userId]);

  const handleRatingSubmit = async (newRating) => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to log in to rate.');
      return;
    }
  
    try {
      const ratingRef = doc(firestore, 'users', userId, 'ratings', currentUser.uid);
      const userRatingDoc = await getDoc(ratingRef);
  
      if (userRatingDoc.exists()) {
        // If the user has already voted, update their existing rating
        await setDoc(ratingRef, { rating: newRating }, { merge: true });
      } else {
        // If the user hasn't voted before, create a new rating document
        await setDoc(ratingRef, { rating: newRating });
      }
  
      setRating(newRating);
      setUserHasVoted(true); // This can now simply track if they've voted at least once
  
      // Fetch updated ratings and recalculate average
      const ratingsRef = collection(firestore, 'users', userId, 'ratings');
      const ratingsSnapshot = await getDocs(ratingsRef);
      const allRatings = ratingsSnapshot.docs.map((doc) => doc.data().rating);
      const totalRatings = allRatings.reduce((sum, rating) => sum + rating, 0);
      const averageRating = allRatings.length > 0 ? totalRatings / allRatings.length : 0;
  
      setAverageRating(averageRating);
      setTotalVotes(allRatings.length);
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Something went wrong while submitting your rating.');
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  const handleToggleCommentInput = () => {
    setShowCommentInput(!showCommentInput);  // Toggle the comment input visibility
  };
  const handleMessagePress = async () => {
  if (!currentUser) {
    Alert.alert('Please log in', 'You need to log in to start a conversation.');
    return;
  }

  // Check if the current user is trying to message themselves
  if (currentUser.uid === userId) {
    Alert.alert('Oops!', 'You cannot message yourself.');
    return;
  }

  try {
    const userChatsRef = collection(firestore, 'users', currentUser.uid, 'chats');
    const instructorChatsRef = collection(firestore, 'users', userId, 'chats');

    // Check if a chat already exists in the current user's subcollection
    const q = query(userChatsRef, where('participants', 'array-contains', userId));
    const chatSnapshot = await getDocs(q);

    let chatId;
    let existingChat = null;

    // Check if a chat with the same participants already exists
    chatSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.participants.includes(userId)) {
        existingChat = { id: doc.id, ...data };
      }
    });

    if (existingChat) {
      chatId = existingChat.id; // Use the existing chat ID
    } else {
      // No existing chat, so create a new one
      const newChatRef = await addDoc(collection(firestore, 'chats'), {
        participants: [currentUser.uid, userId],
        createdAt: Timestamp.now(),
      });
      chatId = newChatRef.id;

      // Store chat metadata in both user's `chats` subcollection
      const chatMetadata = {
        chatId,
        participants: [currentUser.uid, userId],
        instructorName: `${firstName} ${lastName}`, // Instructor's name for display purposes
        createdAt: Timestamp.now(),
      };

      // Add the new chat metadata to both users' chats subcollections
      await setDoc(doc(firestore, 'users', currentUser.uid, 'chats', chatId), chatMetadata);
      await setDoc(doc(firestore, 'users', userId, 'chats', chatId), chatMetadata);
    }

    // Navigate to the ChattingScreen with the chatId and instructor name
    navigation.navigate('ChattingScreen', {
      chatId,
      instructorName: `${firstName} ${lastName}`,
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    Alert.alert('Error', 'Something went wrong while trying to start a conversation.');
  }
};


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }
  
  // Handle adding a new comment
  const handleAddComment = async () => {
    if (!currentUser) {
      // Show an alert if the user is not logged in
      Alert.alert('Please log in', 'You need to log in to comment.');
      return; // Exit the function if the user is not logged in
    }

    if (newComment.trim()) {
      try {
        // Reference to the current user's document in Firestore
        const userDocRef = collection(firestore, 'users');
        const currentUserDoc = await getDocs(userDocRef);
        const currentUserDocData = currentUserDoc.docs.find((doc) => doc.id === currentUser.uid);
        
        if (currentUserDocData) {
          const firstName = currentUserDocData.data().firstName;
  
          // Reference to the comments collection
          const commentsRef = collection(firestore, 'users', userId, 'comments');
          const newCommentData = {
            text: newComment,
            name: firstName || currentUser.email, // Use the firstName from Firestore or fallback to email
            timestamp: Timestamp.now(), // Use Firestore timestamp
          };
  
          // Add the new comment to Firestore
          await addDoc(commentsRef, newCommentData);
  
          // Update local state to show the new comment
          const updatedComments = [newCommentData, ...comments].sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
  
          setComments(updatedComments);
          setNewComment(''); // Clear the comment input
        }
      } catch (error) {
        console.error('Error fetching user data or adding comment:', error);
      }
    }
  };

  // Handle adding a reply to a comment
// Handle adding a reply to a comment
const handleAddReply = async (commentId) => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to log in to reply.');
      return;
    }
  
    if (newReply.trim()) {
      try {
        // Reference to the current user's document in Firestore
        const userDocRef = collection(firestore, 'users');
        const currentUserDoc = await getDocs(userDocRef);
        const currentUserDocData = currentUserDoc.docs.find((doc) => doc.id === currentUser.uid);
  
        if (currentUserDocData) {
          const firstName = currentUserDocData.data().firstName;
  
          // Reference to the replies collection
          const repliesRef = collection(firestore, 'users', userId, 'comments', commentId, 'replies');
          const newReplyData = {
            text: newReply,
            name: firstName || currentUser.email, // Use the firstName from Firestore or fallback to email
            timestamp: Timestamp.now(), // Use Firestore timestamp
          };
  
          // Add the new reply to Firestore
          await addDoc(repliesRef, newReplyData);
  
          // Clear the input
          setNewReply('');
          setReplyCommentId(null);
  
          // Fetch updated comments with replies
          const commentsSnapshot = await getDocs(collection(firestore, 'users', userId, 'comments'));
          const commentsList = await Promise.all(
            commentsSnapshot.docs.map(async (doc) => {
              const repliesRef = collection(firestore, 'users', userId, 'comments', doc.id, 'replies');
              const repliesSnapshot = await getDocs(repliesRef);
              const replies = repliesSnapshot.docs.map(replyDoc => ({ id: replyDoc.id, ...replyDoc.data() }));
  
              return { id: doc.id, ...doc.data(), replies }; // Add replies to comment data
            })
          );
          setComments(commentsList.sort((a, b) => b.timestamp - a.timestamp));
        }
      } catch (error) {
        console.error('Error adding reply:', error);
      }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollViewContent}>
      {/* Instructor Profile Details */}
      <Image source={{ uri: profileImage || 'https://via.placeholder.com/150' }} style={styles.profileImage} />
      <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>

      <View style={styles.contactInfo}>
        <Icon name="call-outline" size={24} color="green" />
        <Text style={styles.infoText}>Phone: {phone}</Text>
      </View>
      
      <View style={styles.contactInfo}>
        <Icon name="mail-outline" size={24} color="orange" />
        <Text style={styles.infoText}>Email: {email}</Text>
      </View>

      <View style={styles.contactInfo}>
        <Icon name="logo-whatsapp" size={24} color="green" />
        <Text style={styles.infoText}>WhatsApp: {whatsapp}</Text>
      </View>
      <View style={styles.contactInfo}>
  <Icon name="car-outline" size={24} color="blue" />
  <Text style={styles.infoText}>Car Type: {carType}</Text>
</View>


      <View style={styles.priceRow}>
  <Text style={styles.priceLabel}>Price per hour: </Text>
  <Text style={styles.priceValue}>£{price}</Text>
</View>

      <View style={styles.ratingSection}>
  <View style={styles.starsAndVotesContainer}>
    <View style={styles.inlineContainer}>
    <StarRating
  rating={rating}
  onChange={(newRating) => handleRatingSubmit(newRating)}
  starSize={24} // You can adjust this size if needed
  enableHalfStar={true} // Enable half stars
  starStyle={{ marginHorizontal: 2 }} // Optional: Adjust the spacing between stars
  color="gold" // Optional: Customize the star color
  animationConfig={{
    scale: 1.3, // Optional: Add scaling animation for a more interactive effect
  }}
  disabled={userHasVoted} // Disable stars after voting
/>

      <Text style={styles.infoText}>{averageRating.toFixed(1)} / 5</Text>
      <Text style={styles.votesText}>({totalVotes} votes)</Text>
    </View>
  </View>
</View>


    
<TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
        <Text style={styles.buttonText}>Message</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comments</Text>
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
    renderItem={({ item }) => (
      <View style={styles.studentContainer}>
        <Image source={{ uri: item.image }} style={styles.studentImage} />
      </View>
    )}
    numColumns={3} // Display 3 students per row
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
  scrollViewContent: {
    paddingBottom: 50, // Add padding to the bottom to ensure the last item is fully visible
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
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
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
  inlineContainer: {
    flexDirection: 'row', // This ensures the children are aligned in a row
    justifyContent: 'space-between', // Distributes space between stars, rating, and votes
    alignItems: 'center', // Align items vertically
    width: '100%', // Adjust this width based on your layout needs
  },
  
  studentContainer: {
    marginRight: 15,
  },
  studentImage: { 
    width: 100,  // Set the width for the square image
    height: 100,  // Set the height to be the same as the width for a square
    borderRadius: 10,  // Optional: Add rounded corners for the image
  }, 
  priceRow: {
    flexDirection: 'row',  // Display label and price on the same line
   
    marginVertical: 10,  // Add some vertical spacing
  },
  priceLabel: {
    fontSize: 18,  // Standard font size for the label
    fontWeight: 'bold',  // Make the label bold
    color: '#333',  // Darker color for the label text
  },
  priceValue: {
    fontSize: 18,  // Same font size as the label
    fontWeight: 'bold',  // Make the price bold
    color: '#28a745',  // Green color for the price
  },
});

export default InstructorProfileScreen;
