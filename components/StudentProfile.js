import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const StudentProfile = ({ route }) => {
  const { firstName, lastName, profileImage } = route.params;

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: profileImage || 'https://via.placeholder.com/150' }}
        style={styles.profileImage}
      />
      <Text style={styles.nameText}>{`${firstName} ${lastName}`}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default StudentProfile;
