import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getViewedProfiles } from './storage_helpers';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RecentlyViewedProfiles = () => {
  const [viewedProfiles, setViewedProfiles] = useState([]);
  const navigation = useNavigation();

  const fetchViewedProfiles = async () => {
    const profiles = await getViewedProfiles();
    setViewedProfiles(profiles);
  };

  useFocusEffect(
    useCallback(() => {
      fetchViewedProfiles();
    }, [])
  );

  const deleteProfile = (id) => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to delete this profile from the list?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteProfile(id) },
      ]
    );
  };

  const handleDeleteProfile = async (id) => {
    const updatedProfiles = viewedProfiles.filter(profile => profile.id !== id);
    setViewedProfiles(updatedProfiles);
    await AsyncStorage.setItem('viewedProfiles', JSON.stringify(updatedProfiles));
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={18}
          color={i <= rating ? '#FFD700' : '#ccc'}
        />
      );
    }
    return stars;
  };

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

              <Image
                source={{ uri: item.profileImage || 'https://via.placeholder.com/100' }}
                style={styles.profileImage}
              />

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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileContainer: {
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  profileDetails: {
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
  profileName: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5,
    color: '#333',
  },
  price: {
    fontSize: 18,
    color: '#28a745',
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
    color: '#555',
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
    color: '#555',
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  noProfilesText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    color: '#999',
  },
});

export default RecentlyViewedProfiles;
