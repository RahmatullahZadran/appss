import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore'; // Firestore methods
import { useNavigation } from '@react-navigation/native'; // Import useNavigation
import { app } from '../firebase'; // Firebase config
import Icon from 'react-native-vector-icons/Ionicons';  // Import Ionicons for star and other icons
import { Picker } from '@react-native-picker/picker';  // Correct import for Picker in Expo

const SearchScreen = () => {
  const [postcode, setPostcode] = useState('');
  const [location, setLocation] = useState(null); // Store user's location (lat/lng)
  const [activeUsers, setActiveUsers] = useState([]); // Store active instructors
  const [nearbyInstructors, setNearbyInstructors] = useState([]); // Store instructors within 10 miles
  const [selectedFilter, setSelectedFilter] = useState('rating'); // Default filter for sorting
  const [errorMessage, setErrorMessage] = useState(''); // Store error message for invalid postcode

  const navigation = useNavigation(); // Initialize navigation
  const firestore = getFirestore(app); // Initialize Firestore

  // Function to fetch lat/lng from postcode using Postcodes.io with fetch
  const geocodePostcode = async (postcode) => {
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
      const data = await response.json();
      if (data.status === 200) {
        setErrorMessage(''); // Clear any previous error message
        const { latitude: lat, longitude: lng } = data.result;
        return { lat, lng };
      } else {
        throw new Error('Invalid postcode');
      }
    } catch (error) {
      console.error('Error fetching geocode:', error);
      setErrorMessage('Invalid postcode'); // Set the error message if postcode is invalid
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
      
      // For each instructor, fetch student and comment counts
      const instructorsWithCounts = await Promise.all(
        activeUsersData.map(async (instructor) => {
          const studentsCount = await getSubCollectionCount(instructor.id, 'students');
          const commentsCount = await getSubCollectionCount(instructor.id, 'comments');
          return { ...instructor, studentsCount, commentsCount };
        })
      );

      setActiveUsers(instructorsWithCounts); // Store active users with counts
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  // Helper function to fetch sub-collection document count
  const getSubCollectionCount = async (userId, subCollectionName) => {
    try {
      const subCollectionRef = collection(firestore, 'users', userId, subCollectionName);
      const snapshot = await getDocs(subCollectionRef);
      return snapshot.size;  // Return the number of documents in the sub-collection
    } catch (error) {
      console.error(`Error fetching ${subCollectionName} count for user ${userId}:`, error);
      return 0;  // Return 0 if there's an error
    }
  };

  // Function to handle the search and find nearby instructors
  const handleSearch = async () => {
    const userLocation = await geocodePostcode(postcode);
    if (userLocation) {
      setLocation(userLocation); // Store user's lat/lng
      await fetchActiveUsers(); // Fetch active instructors

      // Filter instructors within 10 miles of user's location
      let nearby = activeUsers.filter(instructor => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          instructor.latitude,
          instructor.longitude
        );
        return distance <= 10; // Only show instructors within 10 miles
      });

      // Apply selected filter (e.g., by rating or price)
      if (selectedFilter === 'rating') {
        nearby = nearby.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (selectedFilter === 'price') {
        nearby = nearby.sort((a, b) => (a.price || 0) - (b.price || 0));
      }

      setNearbyInstructors(nearby); // Store nearby instructors for displaying
    }
  };

  // Function to render stars based on rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFD700' : '#ccc'}  // Yellow for filled stars, gray for empty
        />
      );
    }
    return stars;
  };

  // Function to navigate to the selected instructor's profile
  // Handle navigation to the profile screen without fetching comments and students here
const handleInstructorPress = (instructor) => {
  navigation.navigate('InstructorProfile', {
    firstName: instructor.firstName,
    lastName: instructor.lastName,
    phone: instructor.phone,
    email: instructor.email,
    whatsapp: instructor.whatsapp,
    profileImage: instructor.profileImage,
    price: instructor.price,
    activePlan: instructor.activePlan,
    userId: instructor.id, // Pass the user ID to retrieve comments/students in the profile screen
  });
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

      {/* Display error message if postcode is invalid */}
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Button title="Search" onPress={handleSearch} />

      {/* Filter Picker */}
      <View style={styles.filterContainer}>
        <Text>Sort by:</Text>
        <Picker
          selectedValue={selectedFilter}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedFilter(itemValue)}
        >
          <Picker.Item label="Rating" value="rating" />
          <Picker.Item label="Price" value="price" />
        </Picker>
      </View>

      {nearbyInstructors.length > 0 ? (
        <FlatList
          data={nearbyInstructors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleInstructorPress(item)}>
              <View style={styles.instructorContainer}>
                <View style={styles.instructorDetails}>
                  <Text style={styles.instructorName}>{item.firstName} {item.lastName}</Text>
                  
                  {/* Icons for Contact Info */}
                  <View style={styles.iconText}>
                    <Icon name="call-outline" size={18} color="gray" />
                    <Text style={styles.iconLabel}>{item.phone}</Text>
                  </View>
                  <View style={styles.iconText}>
                    <Icon name="mail-outline" size={18} color="gray" />
                    <Text style={styles.iconLabel}>{item.email}</Text>
                  </View>
                  <View style={styles.iconText}>
                    <Icon name="logo-whatsapp" size={18} color="gray" />
                    <Text style={styles.iconLabel}>{item.whatsapp}</Text>
                  </View>
                
                  <Text style={styles.price}>£{item.price}</Text>

                  <View style={styles.ratingContainer}>
                    <View style={styles.stars}>
                      {renderStars(item.rating || 0)}  
                    </View>
                    <Text style={styles.votesText}>({item.totalVotes || 0} votes)</Text>
                  </View>

                  <View style={styles.iconContainer}>
                    <View style={styles.iconText}>
                      <Icon name="people-outline" size={18} color="gray" />
                      <Text style={styles.iconLabel}>{item.studentsCount || 0} students</Text>
                    </View>

                    <View style={styles.iconText}>
                      <Icon name="chatbubble-ellipses-outline" size={18} color="gray" />
                      <Text style={styles.iconLabel}>{item.commentsCount || 0} comments</Text>
                    </View>
                  </View>
                </View>

                <Image 
                  source={{ uri: item.profileImage || 'https://via.placeholder.com/100' }} 
                  style={styles.profileImage} 
                />
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
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  picker: {
    flex: 1,
    height: 40,
  },
  instructorContainer: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row', // Align image and details in a row
    justifyContent: 'space-between', // Space between text and image
    alignItems: 'center', // Align items vertically
  },
  instructorDetails: {
    flex: 1, // Take up available space for the details
    marginRight: 15, // Space between details and profile image
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  instructorName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  price: {
    fontSize: 18,
    color: 'green', // Display price in green
    fontWeight: 'bold',
    marginTop: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 10, // Space between stars and votes
  },
  votesText: {
    color: 'gray',
  },
  iconContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  iconText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15, // Space between icons
  },
  iconLabel: {
    marginLeft: 5, // Space between icon and label
    color: 'gray',
  },
  noResults: {
    marginTop: 20,
    textAlign: 'center',
    color: 'gray',
  },
});

export default SearchScreen;
