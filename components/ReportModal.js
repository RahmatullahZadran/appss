import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, Image } from 'react-native';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ReportModal = ({ 
  visible, 
  onClose, 
  userId, 
  reportedUserName, 
  reportedUserPic, 
  reportTitle = "Report Issue", 
  placeholderText = "Describe the issue...", 
  successMessage = "Your report has been submitted successfully.", 
  errorMessage = "Something went wrong while submitting your report.", 
  collectionName = 'reports' 
}) => {
  const [reportText, setReportText] = useState('');
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const firestore = getFirestore();

  const handleSubmitReport = async () => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to log in to submit a report.');
      return;
    }

    if (reportText.trim()) {
      try {
        // Reference to the specified collection in Firestore
        const reportsRef = collection(firestore, collectionName);
        await addDoc(reportsRef, {
          reportText,
          reportedBy: currentUser.uid,
          reportedUserId: userId,
          timestamp: Timestamp.now(),
        });

        Alert.alert(reportTitle, successMessage);
        setReportText(''); // Clear the input
        onClose(); // Close the modal
      } catch (error) {
        console.error('Error submitting report:', error);
        Alert.alert('Error', errorMessage);
      }
    } else {
      Alert.alert('Empty Report', 'Please enter some details in your report.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <Image source={{ uri: reportedUserPic }} style={styles.profilePic} />
            <Text style={styles.profileName}>Reporting {reportedUserName}</Text>
          </View>

          <Text style={styles.modalTitle}>{reportTitle}</Text>
          <TextInput
            style={styles.input}
            placeholder={placeholderText}
            value={reportText}
            onChangeText={setReportText}
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReport}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 100,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 5,
    alignItems: 'center',
    marginRight: 10,
  },
  submitButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#007bff',
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ReportModal;
