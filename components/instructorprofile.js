import React, { useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Icons for contact details and stars

const InstructorProfileScreen = ({ route }) => {
  const { firstName, lastName, phone, email, whatsapp } = route.params;

  // Dummy data for students, comments, and votes
  const students = [
    { id: 1, name: 'Student 1', image: 'https://via.placeholder.com/100' },
    { id: 2, name: 'Student 2', image: 'https://via.placeholder.com/100' },
    { id: 3, name: 'Student 3', image: 'https://via.placeholder.com/100' },
  ];

  const comments = [
    { id: 1, text: 'Great instructor, learned a lot!' },
    { id: 2, text: 'Very patient and friendly.' },
    { id: 3, text: 'Helped me pass my test on the first try!' },
  ];

  const [rating, setRating] = useState(0); // To store the user's selected rating
  const totalVotes = 120; // Dummy number of total votes

  // Helper function to render stars based on user selection
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={24}
            color={i <= rating ? '#FFD700' : '#ccc'} // Highlight selected stars
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <ScrollView style={styles.container}>
    
      <Image source={{ uri: 'https://via.placeholder.com/150' }} style={styles.profileImage} />
      <Text style={styles.profileName}>{`${firstName} ${lastName}`}</Text>

     
      <View style={styles.infoContainer}>
        <View style={styles.contactRow}>
          <Ionicons name="call-outline" size={20} color="#007bff" />
          <Text style={styles.infoText}>{phone}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="mail-outline" size={20} color="#007bff" />
          <Text style={styles.infoText}>{email}</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.infoText}>{whatsapp}</Text>
        </View>
      </View>

    
      <View style={styles.messageButton}>
        <Text style={styles.buttonText}>Message</Text>
      </View>

    
      <View style={styles.ratingContainer}>
        <View style={styles.starsContainer}>
          {renderStars()} 
        </View>
        <Text style={styles.votesText}>{totalVotes} votes</Text> 
      </View>

      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Comments</Text>
        {comments.map((comment) => (
          <View key={comment.id} style={styles.commentContainer}>
            <Text style={styles.commentText}>{comment.text}</Text>
          </View>
        ))}
      </View>

   
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Students</Text>
        <FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.studentContainer}>
              <Image source={{ uri: item.image }} style={styles.studentImage} />
              <Text style={styles.studentName}>{item.name}</Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginBottom: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    marginBottom: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 18,
    marginLeft: 10,
  },
  messageButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  votesText: {
    fontSize: 16,
    color: '#555',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  commentContainer: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  commentText: {
    fontSize: 16,
  },
  studentContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  studentImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  studentName: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default InstructorProfileScreen;
