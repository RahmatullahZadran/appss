import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { auth, firestore, storage } from '../firebase';  // Firebase config
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';  // Firestore methods
import { useNavigation } from '@react-navigation/native';  // For navigation
import Icon from 'react-native-vector-icons/Ionicons';  // Import icons from react-native-vector-icons
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';  // Image Picker
import { Timestamp } from 'firebase/firestore'; 
import RNPickerSelect from 'react-native-picker-select';
import SubscriptionModal from './SubscriptionModal';

const InstructorProfile = ({ firstName, lastName, phone, email, whatsapp, postcode, activePlan, userId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [updatedPhone, setUpdatedPhone] = useState(phone);
    const [visibleComments, setVisibleComments] = useState(5);  // Init
    const [price, setPrice] = useState(35);  // Add default or fetched price
    const [updatedEmail, setUpdatedEmail] = useState('');  // Editable contact email state

    const [rating, setRating] = useState(0); // Store the user's rating
    const [totalVotes, setTotalVotes] = useState(0); //

    const [updatedPrice, setUpdatedPrice] = useState(price);  // Editable price state
    const [updatedWhatsapp, setUpdatedWhatsapp] = useState(whatsapp);
    const [updatedPostcode, setUpdatedPostcode] = useState(postcode);
    const [plan, setPlan] = useState(activePlan);
    const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150');  // Placeholder image
    const [isUploading, setIsUploading] = useState(false);  // To handle upload state
    const [uploadProgress, setUploadProgress] = useState(0); // Track upload progress
    const [students, setStudents] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [replyCommentId, setReplyCommentId] = useState(null); // State to track the comment being replied to
    const [newReply, setNewReply] = useState(''); // State to track reply text
    const navigation = useNavigation();
    const [showCommentInput, setShowCommentInput] = useState(false);  // Track if the comment input is visible
    const [carType, setCarType] = useState('Both'); // Default to "Both"
    const [isSubscriptionModalVisible, setSubscriptionModalVisible] = useState(false);

    
    

  
    useEffect(() => {
      fetchProfilePicture();
      fetchStudents();
      fetchComments(); // Fetch students and comments when the component loads
      fetchUserData();
      fetchUserRating();
    }, []);
// Handle removing a comment


const pickerSelectStyles = {
    inputIOS: {
      fontSize: 16,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#007bff',
      borderRadius: 8,
      color: '#007bff',
      paddingRight: 30, // to ensure the text is never behind the icon
    },
    inputAndroid: {
      fontSize: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: '#007bff',
      borderRadius: 8,
      color: '#007bff',
      paddingRight: 30, // to ensure the text is never behind the icon
    },
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={24}
          color={i <= rating ? '#FFD700' : '#ccc'}  // Highlight stars based on the rating
        />
      );
    }
    return stars;
  };
  

  const handleActiveButtonPress = () => {
    setSubscriptionModalVisible(true); // Show subscription modal regardless of active status
  };
  const handleSubscriptionSuccess = async() => {
    setPlan('Premium'); // Update the plan locally
    setSubscriptionModalVisible(false); // Close modal
    // Update Firestore with the subscription status
    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(userDocRef, { activePlan: 'Premium' }, { merge: true });
  };

  const fetchUserRating = async () => {
    try {
      const ratingsRef = collection(firestore, 'users', userId, 'ratings');
      const snapshot = await getDocs(ratingsRef);
      const totalVotes = snapshot.size;
      const totalRating = snapshot.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0);
      const averageRating = totalVotes > 0 ? totalRating / totalVotes : 0;
      
      setRating(averageRating);
      setTotalVotes(totalVotes);
    } catch (error) {
      console.error('Error fetching rating:', error);
    }
  };
  

const fetchCoordinates = async (postcode) => {
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
      const data = await response.json();
  
      if (data.status === 200) {
        return {
          latitude: data.result.latitude,
          longitude: data.result.longitude,
        };
      } else {
        Alert.alert('Error', 'Invalid postcode');
        return null;
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      Alert.alert('Error', 'Could not fetch coordinates.');
      return null;
    }
  };
  

const handleToggleCommentInput = () => {
    setShowCommentInput(!showCommentInput);  // Toggle the comment input visibility
  };
  const fetchProfilePicture = async () => {
    try {
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.profileImage) {
          setProfileImage(userData.profileImage); // Set profile image if available
        } else {
          setProfileImage('https://via.placeholder.com/150'); // Use placeholder if not available
        }
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);  // Sign out from Firebase Auth
      navigation.replace('Login');  // Navigate back to the login screen
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Fetch students data from Firestore
  const fetchStudents = async () => {
    try {
      const studentsRef = collection(firestore, 'users', userId, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      const studentsList = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsList);
      setIsLoadingStudents(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setIsLoadingStudents(false);
    }
  };
  

  // Fetch comments data from Firestore
  const fetchComments = async () => {
    try {
      const commentsRef = collection(firestore, 'users', userId, 'comments');
      const commentsSnapshot = await getDocs(commentsRef);
      const commentsList = await Promise.all(
        commentsSnapshot.docs.map(async (doc) => {
          const repliesRef = collection(firestore, 'users', userId, 'comments', doc.id, 'replies');
          const repliesSnapshot = await getDocs(repliesRef);
          const replies = repliesSnapshot.docs.map((replyDoc) => ({ id: replyDoc.id, ...replyDoc.data() }));
          return { id: doc.id, ...doc.data(), replies };
        })
      );
  
      // Sort comments by timestamp in descending order (most recent first)
      const sortedComments = commentsList.sort((a, b) => b.timestamp - a.timestamp);
  
      setComments(sortedComments);  // Set the sorted comments
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };
  const handleShowMoreComments = () => {
    setVisibleComments(prevVisibleComments => prevVisibleComments + 5);  // Show 5 more comments
  };

  // Handle profile picture upload
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera roll permissions to make this work!');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;
  
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,  // Lowering quality to 50%
    });
  
    if (!pickerResult.cancelled && pickerResult.assets && pickerResult.assets.length > 0) {
      console.log('Selected image URI:', pickerResult.assets[0].uri);
      await uploadImageToStorage(pickerResult.assets[0].uri);
    } else {
      console.log('Image selection cancelled');
    }
  };
  

  const uploadImageToStorage = async (imageUri) => {
    setIsUploading(true);

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profile_pictures/${userId}.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Error during upload:', error);
          Alert.alert('Error uploading image:', error.message);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Image uploaded successfully. URL:', downloadURL);
          setProfileImage(downloadURL);

          const userDocRef = doc(firestore, 'users', userId);
          await setDoc(userDocRef, { profileImage: downloadURL }, { merge: true });

          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error uploading image:', error.message);
      setIsUploading(false);
    }
  };
 


  // Handle adding a new comment
  const handleAddComment = async () => {
    if (newComment.trim()) {
      const commentsRef = collection(firestore, 'users', userId, 'comments');
      const newCommentData = { 
        text: newComment, 
        name: firstName,  // Add the user's first name
        timestamp: Timestamp.now()  // Use Firestore Timestamp instead of JavaScript Date
      };
  
      await addDoc(commentsRef, newCommentData);  // Save to Firestore
      setComments([...comments, newCommentData]);  // Update local state
      setNewComment('');  // Clear input
      fetchComments();  // Refresh comments
    }
  };

  const handleSaveProfile = async () => {
    if (isEditing) {
      try {
        const userDocRef = doc(firestore, 'users', userId);
    
        // Fetch coordinates based on the postcode
        const coordinates = await fetchCoordinates(updatedPostcode);
    
        if (!coordinates) {
          return; // Exit if the postcode is invalid or coordinates can't be fetched
        }
    
        // Update Firestore with the profile data and the coordinates
        await setDoc(userDocRef, {
          phone: updatedPhone,
          email: updatedEmail,
          whatsapp: updatedWhatsapp,
          postcode: updatedPostcode,
          price: updatedPrice,  // Save the updated price
          carType: carType, // Save the selected car type in Firestore
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }, { merge: true });
    
        setPrice(updatedPrice);  // Update the displayed price
        setIsEditing(false);  // Exit edit mode
        Alert.alert('Success', 'Profile updated successfully!');
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Error', 'Could not save profile.');
      }
    } else {
      setIsEditing(true);  // Enter edit mode
    }
  };
  
  
  const fetchUserData = async () => {
    try {
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
  
        if (userData.price) {
          setPrice(userData.price);
          setUpdatedPrice(userData.price);
        }
  
        if (userData.rating) {
          setRating(userData.rating);  // Make sure rating is being set here
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };
  

  // Handle removing a student
 const handleRemoveStudent = async (studentId) => {
  try {
    // Reference to the student's Firestore document
    const studentDocRef = doc(firestore, 'users', userId, 'students', studentId);
    
    // Get the student's document data to retrieve the image URL
    const studentDoc = await getDoc(studentDocRef);

    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      const studentImageURL = studentData.image;

      // Delete the image from Firebase Storage
      if (studentImageURL) {
        const imageRef = ref(storage, studentImageURL);  // Reference to the storage file
        await deleteObject(imageRef);  // Delete the file from storage
        console.log('Student image deleted successfully.');
      }

      // Delete the student document from Firestore
      await deleteDoc(studentDocRef);
      console.log('Student document deleted successfully.');

      // Update local state to remove the student
      setStudents(students.filter(student => student.id !== studentId));
    }
  } catch (error) {
    console.error('Error removing student:', error);
    Alert.alert('Error', 'Could not remove the student');
  }
};

  const handleReplyButtonClick = (commentId) => {
    if (replyCommentId === commentId) {
      // Hide input if the same reply button is clicked again
      setReplyCommentId(null);
    } else {
      // Show input for the clicked comment
      setReplyCommentId(commentId);
    }
  };
  const handlePriceChange = (value) => {
    // Prevent showing NaN when the input is empty, default to 0
    const parsedValue = value === '' ? 0 : parseFloat(value);
    setUpdatedPrice(parsedValue);
  };

  // Handle adding a student (image only)
  const handlePickStudentImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;
  
    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,  // Lowering quality to 50%
    });
  
    if (!pickerResult.cancelled && pickerResult.assets && pickerResult.assets.length > 0) {
      console.log('Selected student image URI:', pickerResult.assets[0].uri);
      await uploadStudentImage(pickerResult.assets[0].uri);
    } else {
      console.log('Student image selection cancelled');
    }
  };
  
  const handleAddReply = async (commentId) => {
    if (newReply.trim()) {
      const repliesRef = collection(firestore, 'users', userId, 'comments', commentId, 'replies');
      const newReplyData = { 
        text: newReply, 
        name: firstName,  // Add the user's first name
        timestamp: Timestamp.now()  // Store the current timestamp
      };
  
      await addDoc(repliesRef, newReplyData);  // Save reply to Firestore
      setNewReply('');  // Clear input
      setReplyCommentId(null);  // Hide reply input after sending the reply
      fetchComments();  // Refresh comments to display the new reply
    }
  };


  const uploadStudentImage = async (imageUri) => {
    setIsUploading(true);

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const studentImageRef = ref(storage, `student_pictures/${userId}_${Date.now()}.jpg`);
      const uploadTask = uploadBytesResumable(studentImageRef, blob);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Student image upload is ' + progress + '% done');
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Error uploading student image:', error);
          Alert.alert('Error uploading student image:', error.message);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('Student image uploaded successfully. URL:', downloadURL);

          // Add student to Firestore
          const studentsRef = collection(firestore, 'users', userId, 'students');
          await addDoc(studentsRef, {
            image: downloadURL,
          });

          fetchStudents(); // Refresh student list
          setIsUploading(false); // Reset upload state
        }
      );
    } catch (error) {
      console.error('Error adding student:', error);
      setIsUploading(false);
    }
  };

  // Render stars for rating

  return (
    <ScrollView style={styles.container}>
   <View style={styles.topSection}>
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
          <Text style={styles.editImageText}>Edit Profile Picture</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>

          {/* Star Rating Section */}
          <View style={styles.ratingContainer}>
            {renderStars(rating)}  
            <Text style={styles.votesText}>({totalVotes} votes)</Text>  
          </View>

          {/* Active Status Button */}
          <View style={styles.container}>
      <TouchableOpacity
        style={[styles.activeButton, { backgroundColor: activePlan ? 'green' : 'red' }]}
        onPress={handleActiveButtonPress}
      >
        <Text style={styles.activeButtonText}>{activePlan ? 'Active' : 'Inactive'}</Text>
      </TouchableOpacity>

      <SubscriptionModal
  visible={isSubscriptionModalVisible}
  onClose={() => setSubscriptionModalVisible(false)}
  userId={userId}
  activePlan={plan}  // Pass the current plan to determine if the user has an active subscription
  onSubscriptionSuccess={(newPlan) => {
    setPlan(newPlan);  // Update the plan state based on activation or cancellation
    setSubscriptionModalVisible(false); // Close the modal
  }}
/>

    </View>
        </View> 
      </View>

      {/* Editable Profile Info */}
      <View style={styles.contactRow}>
        <Icon name="call-outline" size={20} color="#007bff" />
        <TextInput
          style={styles.input}
          editable={isEditing}
          value={updatedPhone}
          onChangeText={setUpdatedPhone}
          placeholder="Phone"
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.contactRow}>
  <Icon name="mail-outline" size={20} color="#007bff" />
  <TextInput
    style={styles.input}
    editable={isEditing}
    value={updatedEmail}  // Allow users to input or update the contact email
    onChangeText={setUpdatedEmail}
    placeholder="Email"  // Show placeholder text if no email is provided
    keyboardType="email-address"
  />
</View>
      <View style={styles.contactRow}>
        <Icon name="logo-whatsapp" size={20} color="#25D366" />
        <TextInput
          style={styles.input}
          editable={isEditing}
          value={updatedWhatsapp}
          onChangeText={setUpdatedWhatsapp}
          placeholder="WhatsApp"
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.contactRow}>
        <Icon name="location-outline" size={20} color="#007bff" />
        <TextInput
          style={styles.input}
          editable={isEditing}
          value={updatedPostcode}
          onChangeText={setUpdatedPostcode}
          placeholder="Postcode"
        />
      </View>

      {/* Price per Hour Section with £ symbol */}
      <View style={styles.contactRow}>
        <Icon name="cash-outline" size={20} color="#007bff" />
        <TextInput
          style={styles.input}
          editable={isEditing}
          value={isEditing ? String(updatedPrice) : `£${price}`}  // Show "£" when not editing
          onChangeText={handlePriceChange}
          placeholder="Price per Hour"
          keyboardType="numeric"
        />
      </View>
      <View style={styles.carTypeSection}>
  <Icon name="car-outline" size={24} color="#007bff" style={styles.carIcon} />
  <View style={styles.pickerContainer}>
    {isEditing ? (
      <RNPickerSelect
        onValueChange={(value) => setCarType(value)}
        items={[
          { label: 'Manual', value: 'Manual' },
          { label: 'Automatic', value: 'Automatic' },
          { label: 'Both', value: 'Both' },
        ]}
        value={carType}
        style={pickerSelectStyles}
        placeholder={{ label: 'Select Car Type', value: null }}
      />
    ) : (
      <Text style={styles.carTypeText}>{carType}</Text> // Display the selected car type when not editing
    )}
  </View>
</View>


      <Text style={styles.contactInfo}>Active Plan: {activePlan || 'None'}</Text>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.smallButton} onPress={handleSaveProfile}>
          <Text style={styles.buttonText}>{isEditing ? 'Save' : 'Edit Profile'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallButton} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>


      

      
      <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>My Comments</Text>
      <TouchableOpacity onPress={handleToggleCommentInput}>
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
      {comments.slice(0, visibleComments).map((comment) => (
        <View key={comment.id} style={styles.commentContainer}>
          <Text style={styles.commentText}>
            <Text style={styles.commenterName}>{comment.name}: </Text>
            {comment.text}
          </Text>
          <Text style={styles.commentTimestamp}>{new Date(comment.timestamp?.toDate()).toLocaleString()}</Text>

          {/* Reply Section */}
          <TouchableOpacity 
            onPress={() => handleReplyButtonClick(comment.id)} 
            style={styles.replyButton}
          >
            <Icon name="chatbox-ellipses-outline" size={20} color="blue" />
          </TouchableOpacity>

          {replyCommentId === comment.id && (
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Write a reply..."
                value={newReply}
                onChangeText={setNewReply}
              />
              <TouchableOpacity onPress={() => handleAddReply(comment.id)}>
                <Icon name="send" size={24} color="#007bff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Display replies */}
          {comment.replies && comment.replies.length > 0 && (
            <View style={styles.repliesContainer}>
              {comment.replies.map((reply) => (
                <View key={reply.id} style={styles.replyContainer}>
                  <Text style={styles.replyText}>
                    <Text style={styles.replyerName}>{reply.name}: </Text>
                    {reply.text}
                  </Text>
                  <Text style={styles.replyTimestamp}>{new Date(reply.timestamp?.toDate()).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}


      {/* "More" button to show more comments */}
      {visibleComments < comments.length && (
        <TouchableOpacity onPress={handleShowMoreComments}>
          <Text style={styles.moreText}>Show more comments</Text>
        </TouchableOpacity>
      )}
    </View>

      {/* Students Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Students</Text>
          <TouchableOpacity onPress={handlePickStudentImage}>
            <Icon name="add-circle-outline" size={24} color="#007bff" />
          </TouchableOpacity>
        </View>
        {isLoadingStudents ? (
          <ActivityIndicator size="large" color="#007bff" />
        ) : (
            <FlatList
            data={students}
            keyExtractor={(item) => item.id.toString()}
            numColumns={3}  // Set the number of columns to 3
            renderItem={({ item }) => (
              <View style={styles.studentContainer}>
                <Image source={{ uri: item.image }} style={styles.studentImage} />
                <TouchableOpacity 
                  onPress={() => handleRemoveStudent(item.id)} 
                  style={styles.deleteButton}
                >
                  <Icon name="close-circle" size={20} color="red" />
                </TouchableOpacity>
              </View>
            )}
          />
          
        )}
      </View>
    </ScrollView>
  );
};




const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: '#f5f5f5', 
      padding: 20 
    },
    topSection: { 
      flexDirection: 'row', 
      marginBottom: 20, 
      alignItems: 'center' 
    },
    commentContainer: {
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        marginBottom: 10,
        position: 'relative',
      },
      commentText: {
        fontSize: 16,
        color: '#333',
      },
      commentText: {
        fontSize: 16,
        color: '#333',
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
      repliesContainer: {
        marginTop: 10,
        marginLeft: 20,
      },
      replyContainer: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
      },
      carTypeSection: {
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 20,
      },
      carIcon: {
        marginRight: 10,
      },
      pickerContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
      },
      replyText: {
        fontSize: 14,
        color: '#333',
      },
      replyerName: {
        fontWeight: 'bold',
      },
      deleteCommentButton: {
        position: 'absolute',
        top: 5,
        right: 5,
      },
      commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 10,
      }, commentInput: {
        flex: 1,
        padding: 10,
        fontSize: 16,
      },
      replyTimestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
      },
      commentTimestamp: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
      },
    deleteButton: {
        position: 'absolute',
        top: -5,  // Adjust the position to move slightly outside the image
        right: -5,  // Adjust the position to move slightly outside the image
        backgroundColor: 'white',  // Optional: white background for contrast
        borderRadius: 50,  // Round the background for a circle effect
      },
    profileImage: { 
      width: 120, 
      height: 120, 
      borderRadius: 60, 
      marginRight: 20 
    },
    editImageText: { 
      color: '#007bff', 
      textAlign: 'center', 
      marginTop: 5, 
      fontSize: 16 
    },
    infoContainer: { 
      flex: 1, 
      justifyContent: 'center' 
    },
    profileName: { 
      fontSize: 24, 
      fontWeight: 'bold', 
      color: '#333', 
      marginBottom: 10 
    },
    uploadingContainer: { 
      marginTop: 20, 
      alignItems: 'center' 
    },
    section: { 
      marginBottom: 20 
    },
    sectionHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    },
    sectionTitle: { 
      fontSize: 20, 
      fontWeight: 'bold', 
      marginBottom: 10 
    },
  
    // Student section updates for square images
    studentContainer: { 
        flex: 1 / 3,  // Each student will take up 1/3rd of the row width
        alignItems: 'center', 
        marginBottom: 20,
        marginHorizontal: 5,
        position: 'relative',  // Enable absolute positioning inside this container
      },
    studentImage: { 
        width: 100,  // Set the width for the square image
        height: 100,  // Set the height to be the same as the width for a square
        borderRadius: 10,  // Optional: Add rounded corners for the image
      },
    studentName: { 
      fontSize: 16, 
      fontWeight: '600', 
      textAlign: 'center' 
    },
    studentComment: { 
      fontSize: 14, 
      color: '#555', 
      textAlign: 'center' 
    },
  
    modalContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      padding: 20 
    },
    ratingContainer: {
        flexDirection: 'row', 
        marginTop: -7, 
        alignItems: 'center'
      },
    modalTitle: { 
      fontSize: 24, 
      fontWeight: 'bold', 
      marginBottom: 20, 
      textAlign: 'center' 
    },
    activeButton: {
        padding: 10,
        borderRadius: 20,
        marginTop: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
      },
      carTypeText: {
        fontSize: 16,
        color: '#333',
        paddingVertical: 12,
      },
      activeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
      },
    input: { 
      borderBottomWidth: 1, 
      borderBottomColor: '#ddd', 
      marginBottom: 20, 
      padding: 10 
    },
    uploadImageText: { 
      color: '#007bff', 
      textAlign: 'center', 
      marginBottom: 10 
    },
    previewImage: { 
      width: 100, 
      height: 100, 
      alignSelf: 'center', 
      marginBottom: 20 
    },
    modalButtons: { 
      flexDirection: 'row', 
      justifyContent: 'space-between' 
    },
    button: { 
      backgroundColor: '#007bff', 
      padding: 15, 
      borderRadius: 10, 
      alignItems: 'center', 
      flex: 1, 
      marginHorizontal: 5 
    },
    buttonText: { 
      color: '#fff', 
      fontSize: 16, 
      fontWeight: '600' 
    },
    buttonRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginBottom: 20 
    },
    smallButton: { 
      backgroundColor: '#007bff', 
      paddingVertical: 10, 
      paddingHorizontal: 15, 
      borderRadius: 10, 
      alignItems: 'center', 
      justifyContent: 'center', 
      flex: 1, 
      marginHorizontal: 5 
    },
    starsContainer: { 
      flexDirection: 'row' 
    },
    moreText: {
        color: '#007bff',
        textAlign: 'center',
        marginTop: 10,
    },
    votesText: { 
      fontSize: 16, 
      color: '#555' 
    },
  });
  

export default InstructorProfile;
