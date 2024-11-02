import * as RNIap from 'react-native-iap';
import { Alert } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';

// Define product IDs for one-time purchases
const SEVEN_DAY_PLAN_ID = '7days';
const THIRTY_DAY_PLAN_ID = '30days';
const productIds = [SEVEN_DAY_PLAN_ID, THIRTY_DAY_PLAN_ID];

// Set up listeners for purchase updates
let purchaseUpdateSubscription;
let purchaseErrorSubscription;

const initializePurchaseListeners = (userId) => {
  // Listener for successful purchases
  purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
    const receipt = purchase.transactionReceipt;
    if (receipt) {
      // Process the purchase and update Firestore
      await handlePurchaseSuccess(purchase, userId);
      await RNIap.finishTransaction(purchase); // Acknowledge the purchase
    }
  });

  // Listener for purchase errors
  purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
    console.error('Purchase error:', error);
    Alert.alert('Purchase Error', error.message || 'An error occurred during the purchase process.');
  });
};

// Clean up listeners
const removePurchaseListeners = () => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }
};

// Function to handle successful purchase and update Firestore
const handlePurchaseSuccess = async (purchase, userId) => {
  try {
    const productType = purchase.productId === SEVEN_DAY_PLAN_ID ? 'weekly' : 'monthly';
    const subscriptionDuration = productType === 'weekly' ? 7 : 30;
    const currentDate = new Date();
    const newEndDate = new Date(currentDate.getTime() + subscriptionDuration * 24 * 60 * 60 * 1000);

    const userDocRef = doc(firestore, 'users', userId);
    await setDoc(
      userDocRef,
      {
        activePlan: productType,
        subscriptionStartDate: currentDate,
        subscriptionEndDate: newEndDate,
        subscriptionStatus: 'Active',
        cancellationDate: null,
      },
      { merge: true }
    );

    Alert.alert('Purchase Success', `${productType === 'weekly' ? '7-Day' : '30-Day'} access activated!`);
  } catch (error) {
    console.error('Error updating subscription:', error);
    Alert.alert('Error', 'Failed to update subscription. Please try again.');
  }
};

// Function to initiate a product purchase
const purchaseProduct = async (userId, productType) => {
  try {
    // Initialize connection with a check
    const connection = await RNIap.initConnection();
    if (!connection) {
      throw new Error('In-app purchases are not available on this device.');
    }

    // Initialize listeners (make sure they are set up only once)
    initializePurchaseListeners(userId);

    // Fetch available products
    const products = await RNIap.getProducts(productIds);
    if (products.length === 0) {
      throw new Error('Products not found. Verify product IDs in Google Play Console.');
    }
    console.log('Available products:', products);

    // Determine the product ID to purchase
    const productId = productType === '7days' ? SEVEN_DAY_PLAN_ID : THIRTY_DAY_PLAN_ID;

    // Request the purchase
    await RNIap.requestPurchase(productId);

    return { success: true }; // Indicate a successful purchase request
  } catch (error) {
    console.error('Purchase error:', error);
    let alertMessage = error.message || 'An error occurred during the purchase process.';

    // Customize error messages for common issues
    if (error.code === 'E_IAP_NOT_AVAILABLE') {
      alertMessage = 'In-app purchases are not available on this device.';
    } else if (error.code === 'E_PRODUCT_NOT_AVAILABLE') {
      alertMessage = 'Requested product is not available.';
    }

    Alert.alert('Purchase Error', alertMessage);
    return { success: false, error: error.message };
  } finally {
    // Clean up connection and listeners
    await RNIap.endConnection();
    removePurchaseListeners();
  }
};

export default purchaseProduct;
