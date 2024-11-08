import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator, TextInput, StyleSheet, Animated } from 'react-native';
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
  const [fadeAnim] = useState(new Animated.Value(0)); // New fade animation

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      initializeBilling().then(fetchAvailableProducts);
      fetchSubscriptionData();
    }
  }, [visible]);

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
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
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
                activeOpacity={0.8}
              >
                <Text style={styles.buttonTitle}>7-Day Plan</Text>
                <Text style={styles.buttonPrice}>£5.99 for 7 days</Text>
                <Text style={styles.buttonDescription}>Ideal for short-term access</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.subscribeButton, styles.monthlyButton]} 
                onPress={() => handleSubscription('monthly')}
                activeOpacity={0.8}
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
                placeholderTextColor="#999"
              />
              {promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}

              <TouchableOpacity 
                style={[styles.subscribeButton, styles.applyPromoButton]} 
                onPress={applyPromoCode}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonTitle}>Apply Promo Code</Text>
              </TouchableOpacity>
            </>
          )}
          
         <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
  <Text style={styles.closeButtonText}>Close</Text>
</TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly darker overlay
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
    shadowOpacity: 0.25,
    shadowRadius: 15, // Softer shadow
    elevation: 20,
  },
  modalTitle: {
    fontSize: 24, // Larger title
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  promoInput: {
    height: 45,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  applyPromoButton: {
    backgroundColor: '#34C759', // Bright green for visibility
  },
  errorText: {
    color: '#d9534f', // Slightly softer red for error
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 10,
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
    backgroundColor: '#5C9EAD',
  },
  monthlyButton: {
    backgroundColor: '#007bff',
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
    justifyContent: 'center',
    width: '100%',
    height: 45,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#007bff',
    
  },
  closeButtonText: {
    color: '#007bff',
    fontSize: 25,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Softer background during loading
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
});

export default SubscriptionModal;
