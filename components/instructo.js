import React, { useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { auth, firestore } from '../firebase';  // Firebase config
import { signOut } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';  // Firebase Storage
import { useNavigation } from '@react-navigation/native';  // For navigation
import Icon from 'react-native-vector-icons/Ionicons';  // Import icons from react-native-vector-icons
import * as ImagePicker from 'expo-image-picker';  // Import Expo Image Picker

const InstructorProfile = ({ firstName, lastName, phone, email, whatsapp, postcode, activePlan, userId }) => {
  const [isEditing, setIsEditing] = useState(false);  // Toggle between edit mode
  const [updatedPhone, setUpdatedPhone] = useState(phone);
  const [updatedEmail, setUpdatedEmail] = useState(email);
  const [updatedWhatsapp, setUpdatedWhatsapp] = useState(whatsapp);
  const [updatedPostcode, setUpdatedPostcode] = useState(postcode);
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150');  // Placeholder image
  const [isUploading, setIsUploading] = useState(false);  // To handle upload state
  const storage = getStorage();  // Initialize Firebase Storage
  const navigation = useNavigation();

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);  // Sign out from Firebase Auth
      navigation.replace('Login');  // Navigate back to the login screen
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // Handle selecting an image
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    let pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!pickerResult.cancelled) {
      setProfileImage(pickerResult.uri);  // Set the selected image URI locally
      uploadImageToStorage(pickerResult.uri);  // Upload image to Firebase Storage
    }
  };

  // Upload the selected image to Firebase Storage
  const uploadImageToStorage = async (imageUri) => {
    setIsUploading(true);  // Set upload state to true
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();  // Convert image URI to blob

      const storageRef = ref(storage, `profile_pictures/${userId}.jpg`);  // Reference to Firebase Storage
      await uploadBytes(storageRef, blob);  // Upload image to Firebase Storage

      const downloadURL = await getDownloadURL(storageRef);  // Get the download URL of the uploaded image
      setProfileImage(downloadURL);  // Update profile image with Firebase URL
      updateProfileImage(downloadURL);  // Save image URL to Firestore
    } catch (error) {
      Alert.alert('Error uploading image:', error.message);
    } finally {
      setIsUploading(false);  // Reset upload state
    }
  };

  // Update the profile picture URL in Firestore
  const updateProfileImage = async (downloadURL) => {
    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(userDocRef, { profileImage: downloadURL }, { merge: true });  // Save the profile picture URL in Firestore
    Alert.alert('Profile image updated successfully!');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topSection}>
        {/* Profile Image */}
        <TouchableOpacity onPress={pickImage}>
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
          <Text style={styles.editImageText}>Edit Image</Text>
        </TouchableOpacity>
        <View style={styles.infoContainer}>
          <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>

          {/* Contact Info with Icons */}
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
              value={updatedEmail}
              onChangeText={setUpdatedEmail}
              placeholder="Email"
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
        </View>
      </View>

      {/* Save, Logout, etc. */}
      <View style={styles.buttonRow}>
        {isEditing ? (
          <TouchableOpacity style={styles.smallButton} onPress={() => setIsEditing(false)}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.smallButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.smallButton} onPress={handleLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Show uploading status */}
      {isUploading && <Text>Uploading Image...</Text>}
    </ScrollView>
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
    textAlign: 'center',
    marginTop: 5,
    color: '#007bff',
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
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    color: '#333',
    paddingVertical: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  smallButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InstructorProfile;
