import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'; // Firestore methods
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { app } from '../firebase'; // Firebase config

const SearchScreen = () => {
  const [postcode, setPostcode] = useState('');
  const [location, setLocation] = useState(null); // Store user's location (lat/lng)
  const [activeUsers, setActiveUsers] = useState([]); // Store active instructors
  const [nearbyInstructors, setNearbyInstructors] = useState([]); // Store instructors within 10 miles

  const navigation = useNavigation(); // Initialize navigation
  const firestore = getFirestore(app); // Initialize Firestore

  // Function to fetch lat/lng from postcode using Postcodes.io with fetch
  const geocodePostcode = async (postcode) => {
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
      const data = await response.json();
      if (data.status === 200) {
        const { latitude: lat, longitude: lng } = data.result;
        return { lat, lng };
      } else {
        throw new Error('Invalid postcode');
      }
    } catch (error) {
      console.error('Error fetching geocode:', error);
      return null;
    }
  };

  // Haversine formula to calculate the distance between two lat/lng points in miles
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in miles
  };

  // Fetch active users from Firestore
  const fetchActiveUsers = async () => {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('activePlan', '!=', '')); // Fetch only active users
      const snapshot = await getDocs(q);
      const activeUsersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveUsers(activeUsersData); // Store active users
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  // Function to handle the search and find nearby instructors
  const handleSearch = async () => {
    const userLocation = await geocodePostcode(postcode);
    if (userLocation) {
      setLocation(userLocation); // Store user's lat/lng
      await fetchActiveUsers(); // Fetch active instructors

      // Filter instructors within 10 miles of user's location
      const nearby = activeUsers.filter(instructor => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          instructor.latitude,
          instructor.longitude
        );
        return distance <= 10; // Only show instructors within 10 miles
      });

      setNearbyInstructors(nearby); // Store nearby instructors for displaying
    }
  };

  // Function to navigate to the selected instructor's profile
  const handleInstructorPress = (instructor) => {
    navigation.navigate('InstructorProfile', instructor); // Pass instructor details to profile screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search for Active Instructors</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter postcode"
        value={postcode}
        onChangeText={(text) => setPostcode(text)}
      />

      <Button title="Search" onPress={handleSearch} />

      {/* Display results if we have any nearby instructors */}
      {nearbyInstructors.length > 0 ? (
        <FlatList
          data={nearbyInstructors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleInstructorPress(item)}>
              <View style={styles.instructorContainer}>
                <Image 
                  source={{ uri: item.profileImage || 'https://via.placeholder.com/100' }} 
                  style={styles.profileImage} 
                />
                <Text>{item.firstName} {item.lastName}</Text>
                <Text>Phone: {item.phone}</Text>
                <Text>Email: {item.email}</Text>
                <Text>WhatsApp: {item.whatsapp}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text style={styles.noResults}>No instructors found within 10 miles.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  instructorContainer: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row', // Align image and text in a row
    alignItems: 'center', // Center align text and image
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15, // Space between image and text
  },
  noResults: {
    marginTop: 20,
    textAlign: 'center',
    color: 'gray',
  },
});

export default SearchScreen;
