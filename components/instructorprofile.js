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
import ReportModal from './ReportModal';
import FancyAlert from './fancyalert';




const InstructorProfileScreen = ({ route }) => {
  const { firstName, lastName, phone, email, whatsapp, profileImage, price, activePlan, userId, carType, distance, gender } = route.params;
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
const [alertTitle, setAlertTitle] = useState('');
const [alertMessage, setAlertMessage] = useState('');
const [alertIcon, setAlertIcon] = useState('alert-circle');
  



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
  const showFancyAlert = (title, message, icon = 'alert-circle') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertIcon(icon);
    setAlertVisible(true);
  };


  const handleReportPress = () => {
    setReportModalVisible(true);
  };

  const handleRatingSubmit = async (newRating) => {
    if (!currentUser) {
      showFancyAlert('Please log in', 'You need to log in to rate.');
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
      showFancyAlert('Error', 'Something went wrong while submitting your rating.');
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
      showFancyAlert('Please log in', 'You need to log in to start a conversation.');
      return;
    }
  
    // Check if the current user is trying to message themselves
    if (currentUser.uid === userId) {
      showFancyAlert('Oops!', 'You cannot message yourself.');
      return;
    }
  
    try {
      const userChatsRef = collection(firestore, 'users', currentUser.uid, 'chats');
      const instructorChatsRef = collection(firestore, 'users', userId, 'chats');
  
      // Check if a chat already exists in the current user's subcollection
      const q = query(userChatsRef, where('participants', 'array-contains', userId));
      const chatSnapshot = await getDocs(q);
  
      let chatId;
      if (!chatSnapshot.empty) {
        // If a chat already exists, get the chat ID
        chatId = chatSnapshot.docs[0].id;
      } else {
        // If no chat exists, create a new chat
        const newChatRef = await addDoc(collection(firestore, 'chats'), {
          participants: [currentUser.uid, userId],
          createdAt: Timestamp.now(),
        });
        chatId = newChatRef.id;
  
        // Store chat metadata in both user's `chats` subcollection
        const chatMetadata = {
          chatId,
          participants: [currentUser.uid, userId],
          instructorName: `${firstName} ${lastName}`, // Instructor's name for display
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
        participants: [currentUser.uid, userId], // Pass participants for ChattingScreen
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      showFancyAlert('Error', 'Something went wrong while trying to start a conversation.');
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
      showFancyAlert('Please log in', 'You need to log in to comment.');
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
      showFancyAlert('Please log in', 'You need to log in to reply.');
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
  <Icon name="person-outline" size={24} color="purple" />
  <Text style={styles.infoText}>Gender: {gender || 'Not specified'}</Text>
</View>
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
        starSize={24}
        enableHalfStar={true}
        starStyle={{ marginHorizontal: 2 }}
        color="gold"
        animationConfig={{
          scale: 1.3,
        }}
        disabled={userHasVoted}
      />
      <Text style={styles.infoText}>{averageRating.toFixed(1)} / 5</Text>
      <Text style={styles.votesText}>({totalVotes} votes)</Text>
    </View>
  </View>
</View>


<View style={styles.buttonRow}>
        <TouchableOpacity style={styles.messageButton} onPress={handleMessagePress}>
          <Text style={styles.buttonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportButton} onPress={handleReportPress}>
          <Text style={styles.buttonText}>Report</Text>
        </TouchableOpacity>
      </View>

      <ReportModal
  visible={reportModalVisible}
  onClose={() => setReportModalVisible(false)}
  userId={userId}
  reportedUserName={`${firstName} ${lastName}`} // Pass full name
  reportedUserPic={profileImage} // Pass profile image URL
/>

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
<FancyAlert
  visible={alertVisible}
  onClose={() => setAlertVisible(false)}
  title={alertTitle}
  message={alertMessage}
  icon={alertIcon}
/>



    </ScrollView>
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e5eaf0', // Softer background
  },
  scrollViewContent: {
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#ddd',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#f8fafb',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  priceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a7f37',
    marginLeft: 8,
  },
  ratingSection: {
    marginVertical: 12,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  votesText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginVertical: 10,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginVertical: 10,
    backgroundColor: '#f9f9f9',
  },
  commentInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Place icon on the same line as the title
    alignItems: 'center',
    marginBottom: 10,
  },
  commentContainer: {
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  commentText: {
    fontSize: 16,
    color: '#444',
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  studentContainer: {
    flex: 1,
    alignItems: 'center',
    margin: 10, // Adds even spacing between images
  }, replyButton: {
    position: 'absolute', // Positions the button absolutely within the comment container
    top: 8, // Distance from the top edge
    right: 8, // Distance from the right edge
  },
  studentImage: {
    width: 100,
    height: 100,
    borderRadius: 15, // Optional: slight rounding of image corners
  },
  replyContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f5',
    borderRadius: 8,
    marginLeft: 20,
  },
  replyText: {
    fontSize: 14,
    color: '#333',
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 10,
    marginLeft: 20,
    backgroundColor: '#f9f9f9',
  },
  replyInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    color: '#333',
  },
  studentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 10,
  },
});



export default InstructorProfileScreen;
