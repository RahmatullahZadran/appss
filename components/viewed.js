import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';  // For star and delete icons
import { getViewedProfiles } from './storage_helpers';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RecentlyViewedProfiles = () => {
  const [viewedProfiles, setViewedProfiles] = useState([]);
  const navigation = useNavigation();

  // Fetch the last 15 viewed profiles from AsyncStorage
  const fetchViewedProfiles = async () => {
    const profiles = await getViewedProfiles();
    setViewedProfiles(profiles);
  };

  // Use useFocusEffect to fetch the profiles every time the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchViewedProfiles(); // Fetch viewed profiles when screen is focused
    }, [])
  );

  // Function to delete a profile from the list and update AsyncStorage
  const deleteProfile = async (id) => {
    const updatedProfiles = viewedProfiles.filter(profile => profile.id !== id);
    setViewedProfiles(updatedProfiles); // Update the state to remove the profile
    await AsyncStorage.setItem('viewedProfiles', JSON.stringify(updatedProfiles)); // Update AsyncStorage
  };

  // Function to render stars based on rating (if rating exists)
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

  // Function to handle profile click and navigate to the profile screen
  const handleProfileClick = (profile) => {
    navigation.navigate('InstructorProfile', {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
      email: profile.email,
      whatsapp: profile.whatsapp,
      profileImage: profile.profileImage,
      price: profile.price,
      activePlan: profile.activePlan,
      userId: profile.id,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recently Viewed Profiles</Text>

      {viewedProfiles.length > 0 ? (
        <FlatList
          data={viewedProfiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.profileContainer}>
              <TouchableOpacity onPress={() => handleProfileClick(item)} style={styles.profileDetails}>
                <Text style={styles.profileName}>{item.firstName} {item.lastName}</Text>
                
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

                {/* Rating Section */}
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
              </TouchableOpacity>

              {/* Profile Image */}
              <Image 
                source={{ uri: item.profileImage || 'https://via.placeholder.com/100' }} 
                style={styles.profileImage} 
              />

              {/* Delete Button (X icon) */}
              <TouchableOpacity onPress={() => deleteProfile(item.id)} style={styles.deleteButton}>
                <Icon name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <Text style={styles.noProfilesText}>No recently viewed profiles found.</Text>
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
  noProfilesText: {
    fontSize: 16,
    textAlign: 'center',
  },
  profileContainer: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row', // Align image and details in a row
    justifyContent: 'space-between', // Space between text and image
    alignItems: 'center', // Align items vertically
    position: 'relative', // To position delete button
  },
  profileDetails: {
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
  profileName: {
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
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  noResults: {
    marginTop: 20,
    textAlign: 'center',
    color: 'gray',
  },
});

export default RecentlyViewedProfiles;
