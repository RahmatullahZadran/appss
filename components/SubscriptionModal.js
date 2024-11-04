import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import { initializeBilling, fetchProducts, purchaseProduct } from './billing'; 
import { firestore } from '../firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const IN_APP_PRODUCT_SKUS = ['30_days_access', '7_days_access'];

const SubscriptionModal = ({ visible, onClose, userId, onSubscriptionSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('Inactive');
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    initializeBilling().then(fetchAvailableProducts);
    fetchSubscriptionData();
  }, []);

  const fetchAvailableProducts = async () => {
    const productArray = await fetchProducts(IN_APP_PRODUCT_SKUS);
    setProducts(productArray);
  };

  const fetchSubscriptionData = async () => {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      setSubscriptionEndDate(data.subscriptionEndDate?.toDate());
      setSubscriptionStatus(data.subscriptionStatus || 'Inactive');
    }
  };

  const handleSubscription = async (productType) => {
    setIsLoading(true);
    const sku = productType === 'weekly' ? '7_days_access' : '30_days_access';
    const result = await purchaseProduct(sku);
    if (result.success) {
      await saveSubscriptionToDatabase(productType);
      onSubscriptionSuccess(productType);
      Alert.alert("Success", `${productType === 'weekly' ? '7-Day' : '30-Day'} access purchased!`);
    } else {
      Alert.alert("Failed", "Purchase could not be completed.");
    }
    setIsLoading(false);
  };

  const applyPromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code.');
      return;
    }
    setPromoError('');
    setIsLoading(true);
  
    try {
      const promoRef = doc(firestore, 'promo', promoCode.trim());
      const promoDoc = await getDoc(promoRef);
  
      if (!promoDoc.exists() || !promoDoc.data().isActive) {
        setPromoError('Invalid or inactive promo code.');
        setIsLoading(false);
        return;
      }
  
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
  
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const usedPromoCodes = userData.usedPromoCodes || [];
        const currentEndDate = userData.subscriptionEndDate?.toDate() || new Date();
  
        if (usedPromoCodes.includes(promoCode.trim())) {
          setPromoError('Promo code already used.');
          setIsLoading(false);
          return;
        }
  
        const newEndDate = new Timestamp.fromDate(new Date(currentEndDate.getTime() + 30 * 24 * 60 * 60 * 1000));
  
        await setDoc(userRef, {
          subscriptionEndDate: newEndDate,
          subscriptionStatus: 'Active',
          usedPromoCodes: [...usedPromoCodes, promoCode.trim()],
        }, { merge: true });
  
        Alert.alert("Promo Applied", "Your subscription has been extended by 30 days!");
        onSubscriptionSuccess('30 days');
      } else {
        setPromoError("User data not found.");
      }
    } catch (error) {
      console.error("Promo Code Error:", error);
      Alert.alert("Error", "An error occurred while applying the promo code.");
    } finally {
      setIsLoading(false);
      setPromoCode('');
    }
  };
  
  const saveSubscriptionToDatabase = async (subscriptionType) => {
    const currentTimestamp = Timestamp.now();
    const currentEndDate = subscriptionEndDate && subscriptionEndDate > currentTimestamp.toDate()
      ? subscriptionEndDate
      : currentTimestamp.toDate();
    const durationInSeconds = subscriptionType === 'weekly' ? 7 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
    const newEndDate = new Date(currentEndDate.getTime() + durationInSeconds * 1000);
  
    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(userDocRef, {
      activePlan: subscriptionType,
      subscriptionStartDate: currentTimestamp,
      subscriptionEndDate: Timestamp.fromDate(newEndDate),
      subscriptionStatus: 'Active',
      cancellationDate: null
    }, { merge: true });
  
    setSubscriptionEndDate(newEndDate);
    setSubscriptionStatus('Active');
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Manage Subscription</Text>

          {subscriptionEndDate && (
            <Text style={styles.subscriptionInfo}>
              {`You are ${subscriptionStatus === 'Active' ? 'active' : 'will remain active'} until ${subscriptionEndDate.toLocaleDateString()}.`}
            </Text>
          )}

          {isLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.subscribeButton, styles.weeklyButton]} 
                onPress={() => handleSubscription('weekly')}
              >
                <Text style={styles.buttonTitle}>7-Day Plan</Text>
                <Text style={styles.buttonPrice}>£5.99 for 7 days</Text>
                <Text style={styles.buttonDescription}>Ideal for short-term access</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.subscribeButton, styles.monthlyButton]} 
                onPress={() => handleSubscription('monthly')}
              >
                <Text style={styles.buttonTitle}>30-Day Plan</Text>
                <Text style={styles.buttonPrice}>£17.99 for 30 days</Text>
                <Text style={styles.buttonDescription}>Best for extended access</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.promoInput}
                placeholder="Enter Promo Code"
                value={promoCode}
                onChangeText={setPromoCode}
              />
              {promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}

              <TouchableOpacity 
                style={[styles.subscribeButton, styles.applyPromoButton]} 
                onPress={applyPromoCode}
              >
                <Text style={styles.buttonTitle}>Apply Promo Code</Text>
              </TouchableOpacity>
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
  promoInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  applyPromoButton: {
    backgroundColor: '#4CAF50',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
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
