import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { auth, firestore, storage } from '../firebase';  // Firebase config
import { signOut } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';  // Firestore methods
import * as ImagePicker from 'expo-image-picker';  // Image Picker
import { useNavigation } from '@react-navigation/native';  // For navigation

const StudentProfile = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150');  // Default image
  const [isUploading, setIsUploading] = useState(false);  // Uploading state
  const [uploadProgress, setUploadProgress] = useState(0);  // Track upload progress
  const navigation = useNavigation();

  // Fetch current user's profile details on component mount
  useEffect(() => {
    fetchUserProfile();  // Fetch profile picture and name when component mounts
  }, []);

  // Fetch the current user's profile from Firestore
  const fetchUserProfile = async () => {
    try {
      const userId = auth.currentUser.uid;  // Get the current logged-in user's ID
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFirstName(userData.firstName || '');  // Set first name
        setLastName(userData.lastName || '');  // Set last name
        if (userData.profileImage) {
          setProfileImage(userData.profileImage);  // Set profile image from Firestore
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // Handle picking an image from the library
  const pickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,  // Lowering quality to 50%
    });

    if (!pickerResult.cancelled && pickerResult.assets && pickerResult.assets.length > 0) {
      await uploadImageToStorage(pickerResult.assets[0].uri);
    }
  };

  // Request permission to access the media library
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sorry, we need camera roll permissions to make this work!');
      return false;
    }
    return true;
  };

  // Upload the selected image to Firebase Storage
  const uploadImageToStorage = async (imageUri) => {
    setIsUploading(true);
    try {
      const userId = auth.currentUser.uid;  // Get current user's ID
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profile_pictures/${userId}.jpg`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Error during upload:', error);
          Alert.alert('Error uploading image:', error.message);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setProfileImage(downloadURL);

          // Update the user's profile image in Firestore
          const userDocRef = doc(firestore, 'users', userId);
          await setDoc(userDocRef, { profileImage: downloadURL }, { merge: true });

          setIsUploading(false);
          Alert.alert('Success', 'Profile picture updated successfully!');
        }
      );
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error uploading image:', error.message);
      setIsUploading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);  // Sign out from Firebase Auth
      navigation.replace('Login');  // Navigate back to the login screen
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
          <Text style={styles.editImageText}>Edit Profile Picture</Text>
        </TouchableOpacity>
        <View style={styles.infoContainer}>
          <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>
        </View>
      </View>

      {isUploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text>Uploading... {Math.round(uploadProgress)}%</Text>
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  topSection: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginRight: 20,
  },
  editImageText: {
    color: '#007bff',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default StudentProfile;
