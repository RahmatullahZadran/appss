import { requestPurchase, initConnection, endConnection } from 'react-native-iap';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase'; // Adjust import path as needed

// Define the subscription product IDs
const SEVEN_DAY_PLAN_ID = '7days'; // Use the actual Product ID for 7-day plan from Google Play Console
const THIRTY_DAY_PLAN_ID = '30days'; // Placeholder for 30-day plan, replace with actual Product ID if created

const purchaseSubscription = async (userId, subscriptionType) => {
  try {
    // Ensure a connection is established to the store
    const isConnected = await initConnection();
    if (!isConnected) {
      console.error("Failed to connect to the store");
      return { success: false, message: 'Could not connect to the store' };
    }

    const productId = subscriptionType === '7days' ? SEVEN_DAY_PLAN_ID : THIRTY_DAY_PLAN_ID;
    const purchase = await requestPurchase(productId);

    if (purchase) {
      // Calculate subscription end date based on purchase
      const startDate = new Date();
      const durationInDays = subscriptionType === '7days' ? 7 : 30;
      const endDate = new Date(startDate.getTime() + durationInDays * 24 * 60 * 60 * 1000);

      // Save the subscription info to Firestore
      const userDocRef = doc(firestore, 'users', userId);
      await setDoc(userDocRef, {
        activePlan: subscriptionType,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        subscriptionStatus: 'Active',
      }, { merge: true });

      return { success: true, message: 'Subscription activated!' };
    } else {
      return { success: false, message: 'Purchase was unsuccessful' };
    }
  } catch (error) {
    console.error('Purchase error:', error);
    return { success: false, error };
  } finally {
    await endConnection();
  }
};

export default purchaseSubscription;
