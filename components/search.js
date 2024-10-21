import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import * as Location from 'expo-location';  // Import Expo Location
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { app } from '../firebase';
import Icon from 'react-native-vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import { saveViewedProfile } from './storage_helpers';
import MapView, { Marker } from 'react-native-maps'; // Import MapView and Marker

const SearchScreen = () => {
  const [postcode, setPostcode] = useState('');
  const [location, setLocation] = useState(null);
  const [nearbyInstructors, setNearbyInstructors] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('rating');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isMapView, setIsMapView] = useState(false); // State to toggle map/list view
  const [hasSearched, setHasSearched] = useState(false); // Track if user has searched

  const navigation = useNavigation();
  const firestore = getFirestore(app);

  useEffect(() => {
    requestLocationPermission();
  }, []);

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
      setPostcode(''); // Clear the postcode if using current location
      setLocation({
        lat: userLocation.coords.latitude,
        lng: userLocation.coords.longitude,

      } 
    );
    handleSearch();
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
    const userLocation = postcode ? await geocodePostcode(postcode) : location; // Use the user's current location if postcode is not provided

    if (userLocation) {
      setLocation(userLocation);
      try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('activePlan', '!=', ''));
        const snapshot = await getDocs(q);
        const activeUsersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const instructorsWithCounts = await Promise.all(
          activeUsersData.map(async (instructor) => {
            const studentsCount = await getSubCollectionCount(instructor.id, 'students');
            const commentsCount = await getSubCollectionCount(instructor.id, 'comments');
            const ratingData = await fetchInstructorRating(instructor.id);
            return { ...instructor, studentsCount, commentsCount, ...ratingData };
          })
        );

        let nearby = instructorsWithCounts.filter((instructor) => {
          if (instructor.latitude && instructor.longitude) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              instructor.latitude,
              instructor.longitude
            );
            return distance <= 10;
          }
          return false;
        });

        sortInstructors(nearby, selectedFilter);
        setNearbyInstructors(nearby);
        setHasSearched(true); // Set to true after search is done
      } catch (error) {
        setErrorMessage('Failed to fetch instructors.');
      }
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
      carType: instructor.carType // Add carType to the navigation
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleSearch();
    setRefreshing(false);
  };

  const renderMapView = () => (
    <MapView
      style={{ flex: 1, height: 300, marginBottom: 20 }}
      initialRegion={{
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {nearbyInstructors.map((instructor) => (
        <Marker
          key={instructor.id}
          coordinate={{ latitude: instructor.latitude, longitude: instructor.longitude }}
          title={`${instructor.firstName} ${instructor.lastName}`}
          description={`Rating: ${instructor.rating || 0}`}
        />
      ))}
    </MapView>
  );

  const renderListView = () => (
    <FlatList
      data={nearbyInstructors}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleInstructorPress(item)}>
          <View style={styles.instructorContainer}>
            <View style={styles.instructorDetails}>
              <Text style={styles.instructorName}>
                {item.firstName} {item.lastName}
              </Text>

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
      <Text style={styles.title}>Search for Active Instructors</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter postcode"
          value={postcode}
          onChangeText={setPostcode}
        />
        <TouchableOpacity onPress={useCurrentLocation}>
          <Icon name="location-outline" size={24} color="gray" />
        </TouchableOpacity>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.buttonContainer}>
        <Button title="Search" onPress={handleSearch} />
        {hasSearched && (
          <Button
            title={isMapView ? "List View" : "Map View"}
            onPress={() => setIsMapView(!isMapView)}
          />
        )}
      </View>

      <View style={styles.filterContainer}>
        <Text>Sort by:</Text>
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
        isMapView ? renderMapView() : renderListView()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 40,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Align buttons next to each other
    marginBottom: 10,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  picker: {
    flex: 1,
    height: 40,
    borderRadius: 8,
  },
  instructorContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  instructorDetails: {
    flex: 1,
    marginRight: 15,
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
    color: 'green',
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
    marginRight: 10,
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
    marginRight: 15,
  },
  iconLabel: {
    marginLeft: 5,
    color: 'gray',
  },
});

export default SearchScreen;
