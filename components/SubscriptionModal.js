import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { purchaseSubscription } from './billing'; 
import { firestore } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const SubscriptionModal = ({ visible, onClose, userId, onSubscriptionSuccess, activePlan }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('Inactive'); // new field for tracking status

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      setSubscriptionEndDate(data.subscriptionEndDate?.toDate());
      setSubscriptionStatus(data.subscriptionStatus || 'Inactive');
    }
  };

  const handleSubscription = async (subscriptionType) => {
    setIsLoading(true);
    const price = subscriptionType === 'weekly' ? 5 : 15;
    try {
      const result = await purchaseSubscription(userId, subscriptionType, price);
      if (result.success) {
        await saveSubscriptionToDatabase(subscriptionType);
        onSubscriptionSuccess(subscriptionType);
        Alert.alert("Success", `${subscriptionType === 'weekly' ? 'Weekly' : 'Monthly'} subscription activated!`);
      } else {
        Alert.alert("Failed", "Subscription could not be completed.");
      }
    } catch (error) {
      console.error("Subscription Error:", error);
      Alert.alert("Error", "An error occurred while processing your subscription.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateNow = async (subscriptionType) => {
    try {
      await saveSubscriptionToDatabase(subscriptionType, true);
      onSubscriptionSuccess(subscriptionType);
      Alert.alert("Activated", `${subscriptionType === 'weekly' ? 'Weekly' : 'Monthly'} subscription activated for testing.`);
    } catch (error) {
      console.error("Activation Error:", error);
      Alert.alert("Error", "An error occurred while activating the subscription.");
    }
  };

  const saveSubscriptionToDatabase = async (subscriptionType, isTest = false) => {
    const currentTimestamp = Timestamp.now();
    const startDate = subscriptionEndDate && subscriptionEndDate > currentTimestamp.toDate()
      ? new Timestamp(subscriptionEndDate.getTime() / 1000, 0)
      : currentTimestamp;
    const durationInSeconds = subscriptionType === 'weekly' ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
    const expirationDate = new Timestamp(startDate.seconds + durationInSeconds, 0);

    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(userDocRef, {
      activePlan: subscriptionType,
      subscriptionStartDate: startDate,
      subscriptionEndDate: expirationDate,
      subscriptionStatus: 'Active',  // Ensures "Active" status is saved
      ...(isTest ? {} : { cancellationDate: null })
    }, { merge: true });

    setSubscriptionEndDate(expirationDate.toDate());
    setSubscriptionStatus('Active');
  };

  const handleCancelSubscription = async () => {
    try {
      setIsLoading(true);
      const currentTimestamp = Timestamp.now();
      const status = subscriptionEndDate && subscriptionEndDate > currentTimestamp.toDate()
        ? 'Active' // Remain active until the end date
        : 'Inactive';

      const userDocRef = doc(firestore, 'users', userId);
      await setDoc(userDocRef, {
        activePlan: null,
        subscriptionStatus: status,
        cancellationDate: currentTimestamp,
      }, { merge: true });

      setSubscriptionStatus(status);
      onSubscriptionSuccess(null);
      Alert.alert('Canceled', 'Your subscription has been successfully canceled.');
    } catch (error) {
      console.error('Error canceling subscription:', error);
      Alert.alert('Error', 'Could not cancel the subscription.');
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Manage Subscription</Text>

          {subscriptionEndDate && (
            <Text style={styles.subscriptionInfo}>
              {`Your subscription ${subscriptionStatus === 'Active' ? 'is active' : 'will remain active'} until ${subscriptionEndDate.toLocaleDateString()}.`}
            </Text>
          )}

          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <>
              {!activePlan ? (
                <>
                  <TouchableOpacity 
                    style={[styles.subscribeButton, styles.weeklyButton]} 
                    onPress={() => handleSubscription('weekly')}
                  >
                    <Text style={styles.buttonTitle}>Weekly Plan</Text>
                    <Text style={styles.buttonPrice}>£5/week</Text>
                    <Text style={styles.buttonDescription}>Great for short-term visibility</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subscribeButton, styles.activateNowButton]}
                    onPress={() => handleActivateNow('weekly')}
                  >
                    <Text style={styles.buttonTitle}>Activate Now (Test)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.subscribeButton, styles.monthlyButton]} 
                    onPress={() => handleSubscription('monthly')}
                  >
                    <Text style={styles.buttonTitle}>Monthly Plan</Text>
                    <Text style={styles.buttonPrice}>£15/month</Text>
                    <Text style={styles.buttonDescription}>Ideal for continuous exposure</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.subscribeButton, styles.activateNowButton]}
                    onPress={() => handleActivateNow('monthly')}
                  >
                    <Text style={styles.buttonTitle}>Activate Now (Test)</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.subscribeButton, styles.cancelButton]}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.buttonTitle}>Cancel Subscription</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
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
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 12,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDescription: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
  },
  subscriptionInfo: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  subscribeButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },
  weeklyButton: {
    backgroundColor: '#4CAF50',
  },
  monthlyButton: {
    backgroundColor: '#007bff',
  },
  activateNowButton: {
    backgroundColor: '#FFD700',
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  buttonPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 5,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#d1e3ff',
    marginTop: 3,
  },
  closeButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#007bff',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default SubscriptionModal;
