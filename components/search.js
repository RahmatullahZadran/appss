import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import * as Location from 'expo-location';  // Import Expo Location
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { app } from '../firebase';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { saveViewedProfile } from './storage_helpers';

const SearchScreen = () => {
  const [postcode, setPostcode] = useState('');
  const [location, setLocation] = useState(null);
  const [nearbyInstructors, setNearbyInstructors] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('rating');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false); // Track if user has searched
  const [selectedDistance, setSelectedDistance] = useState(10); // Default to 10 miles


  const navigation = useNavigation();
  const firestore = getFirestore(app);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (location) {
      handleSearch();
    }
  }, [location]);
  

  // Request location permission and get the current location
  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMessage('Permission to access location was denied');
      return;
    }
  };

  const useCurrentLocation = async () => {
    try {
      let userLocation = await Location.getCurrentPositionAsync({});
      setPostcode(''); // Clear the postcode when using current location
      setLocation({
        lat: userLocation.coords.latitude,
        lng: userLocation.coords.longitude,
      });
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Unable to retrieve current location');
    }
  };
  
  

  const geocodePostcode = async (postcode) => {
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
      const data = await response.json();
      if (data.status === 200) {
        setErrorMessage('');
        const { latitude: lat, longitude: lng } = data.result;
        return { lat, lng };
      } else {
        throw new Error('Invalid postcode');
      }
    } catch (error) {
      setErrorMessage('Invalid postcode');
      return null;
    }
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const toRadians = (degrees) => degrees * (Math.PI / 180);
    const R = 3958.8; // Earth radius in miles
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getSubCollectionCount = async (userId, subCollectionName) => {
    try {
      const subCollectionRef = collection(firestore, 'users', userId, subCollectionName);
      const snapshot = await getDocs(subCollectionRef);
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  };

  const fetchInstructorRating = async (userId) => {
    try {
      const ratingsRef = collection(firestore, 'users', userId, 'ratings');
      const snapshot = await getDocs(ratingsRef);
      const totalVotes = snapshot.size;
      const totalRating = snapshot.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0);
      const averageRating = totalVotes > 0 ? totalRating / totalVotes : 0;
      return { rating: averageRating, totalVotes };
    } catch (error) {
      return { rating: 0, totalVotes: 0 };
    }
  };
  
  const handleSearch = async () => {
    setLoading(true);
    try {
      let searchLocation = location;
  
      // If the user provided a postcode, geocode it
      if (postcode) {
        const geocodedLocation = await geocodePostcode(postcode);
        if (!geocodedLocation) {
          setLoading(false);
          return;
        }
        searchLocation = geocodedLocation; // Update the search location to the geocoded location
      }
  
      if (!searchLocation) {
        Alert.alert('Error', 'Please provide a valid postcode or allow location access.');
        setLoading(false);
        return;
      }
  
      const usersRef = collection(firestore, 'users');
      const q = query(
        usersRef,
        where('role', '==', 'instructor'),
        where('subscriptionEndDate', '>', new Date())
      );
      const snapshot = await getDocs(q);
  
      const instructorsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const instructorsWithCounts = await Promise.all(
        instructorsData.map(async (instructor) => {
          const studentsCount = await getSubCollectionCount(instructor.id, 'students');
          const commentsCount = await getSubCollectionCount(instructor.id, 'comments');
          const ratingData = await fetchInstructorRating(instructor.id);
          const distance =
            instructor.latitude && instructor.longitude
              ? calculateDistance(searchLocation.lat, searchLocation.lng, instructor.latitude, instructor.longitude)
              : null;
  
          return { ...instructor, studentsCount, commentsCount, ...ratingData, distance };
        })
      );
  
      let nearby = instructorsWithCounts.filter((instructor) => {
        if (instructor.latitude && instructor.longitude) {
          const distance = calculateDistance(
            searchLocation.lat,
            searchLocation.lng,
            instructor.latitude,
            instructor.longitude
          );
          return distance <= selectedDistance;
        }
        return false;
      });
  
      sortInstructors(nearby, selectedFilter);
      setNearbyInstructors(nearby);
      setHasSearched(true);
    } catch (error) {
      setErrorMessage('Failed to fetch instructors.');
    }
    setLoading(false);
  };
  
  
  
  

  
  

  const sortInstructors = (instructors, filter) => {
    let sortedInstructors = [...instructors];
    if (filter === 'rating') {
      sortedInstructors.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (filter === 'price') {
      sortedInstructors.sort((a, b) => (a.price || 0) - (b.price || 0));
    }
    setNearbyInstructors(sortedInstructors);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    sortInstructors(nearbyInstructors, filter);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return stars;
  };

  const handleInstructorPress = async (instructor) => {
    await saveViewedProfile(instructor);
    navigation.navigate('InstructorProfile', {
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      phone: instructor.phone,
      email: instructor.email,
      whatsapp: instructor.whatsapp,
      profileImage: instructor.profileImage,
      price: instructor.price,
      activePlan: instructor.activePlan,
      userId: instructor.id,
      studentsCount: instructor.studentsCount,
      commentsCount: instructor.commentsCount,
      rating: instructor.rating,
      totalVotes: instructor.totalVotes,
      carType: instructor.carType, // Add carType to the navigation
      distance: instructor.distance,
      gender: instructor.gender
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleSearch();
    setRefreshing(false);
  };
  const renderListView = () => (
    <FlatList
      data={nearbyInstructors}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        !hasSearched ? (
          <Text style={styles.searchRadiusText}>
            Searching for instructors within a {selectedDistance}-mile radius
          </Text>
        ) : null
      }
      ListEmptyComponent={
        hasSearched ? (
          <Text style={styles.noResultsText}>No instructors found within this radius.</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleInstructorPress(item)}>
          <View style={styles.instructorContainer}>
            <View style={styles.instructorDetails}>
              <Text style={styles.instructorName}>
                {item.firstName} {item.lastName}
              </Text>
              
              {/* Gender Display */}
              <View style={styles.iconText}>
                <Icon name="person-outline" size={18} color="gray" />
                <Text style={styles.iconLabel}>{item.gender}</Text>
              </View>
  
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
  
              <View style={styles.iconText}>
                <Icon name="car-outline" size={18} color="gray" />
                <Text style={styles.iconLabel}>{item.carType}</Text>
              </View>
  
              <View style={styles.ratingContainer}>
                <View style={styles.stars}>{renderStars(item.rating || 0)}</View>
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
  
                {item.distance !== null && (
                  <View style={styles.iconText}>
                    <Icon name="location-outline" size={18} color="gray" />
                    <Text style={styles.iconLabel}>{item.distance.toFixed(1)} miles</Text>
                  </View>
                )}
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
  );
  
  
  

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter postcode"
          value={postcode}
          onChangeText={setPostcode}
        />
        <TouchableOpacity onPress={useCurrentLocation}>
          <Icon name="location-outline" size={30} color="gray" style={styles.locationIcon} />
        </TouchableOpacity>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonDistanceContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
        <Picker
          selectedValue={selectedDistance}
          style={styles.distancePicker}
          onValueChange={(value) => setSelectedDistance(value)}
        >
          <Picker.Item label="5 miles" value={5} />
          <Picker.Item label="10 miles" value={10} />
          <Picker.Item label="15 miles" value={15} />
          <Picker.Item label="20 miles" value={20} />
          <Picker.Item label="50 miles" value={50} />
        </Picker>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterText}>Sort by:</Text>
        <Picker
          selectedValue={selectedFilter}
          style={styles.picker}
          onValueChange={handleFilterChange}
        >
          <Picker.Item label="Rating" value="rating" />
          <Picker.Item label="Price" value="price" />
        </Picker>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        renderListView()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FAFAFA',
  },
  title: {
    fontSize: 22,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#B0B0B0',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    height: 48,
    padding: 5,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#FF4D4D',
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  buttonDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8, // Increases height
    paddingHorizontal: 20, // Adds width
    borderRadius: 10,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 23, // Increase font size
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
    
  },
  picker: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  distancePicker: {
    height: 48,
    width: 160,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
  },
  instructorContainer: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  instructorDetails: {
    flex: 1,
    marginRight: 15,
  },
  locationIcon: {
    marginRight: 5,
    color: '#007AFF',
    fontSize: 35,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  instructorName: {
    fontWeight: '600',
    fontSize: 18,
    color: '#2E3A59',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 10,
  },
  votesText: {
    color: '#777',
    fontSize: 12,
  },
  iconContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  iconText: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  iconLabel: {
    marginLeft: 6,
    color: '#555',
  },
  searchRadiusText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 22,
    color: '#7A7A7A',
    fontStyle: 'italic',
  },
  filterText : {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  noResultsText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
    color: '#888',
  },
});




export default SearchScreen;
