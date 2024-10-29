import { requestSubscription, initConnection, endConnection } from 'react-native-iap';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase';  // Adjust import path as needed

// Define the subscription product IDs (replace with your actual IDs from the app store)
const WEEKLY_SUBSCRIPTION_ID = 'weekly_subscription';
const MONTHLY_SUBSCRIPTION_ID = 'monthly_subscription';

export const purchaseSubscription = async (userId, subscriptionType, price) => {
  try {
    // Ensure a connection is established to the store
    await initConnection();

    const productId = subscriptionType === 'weekly' ? WEEKLY_SUBSCRIPTION_ID : MONTHLY_SUBSCRIPTION_ID;
    
    // Request the subscription
    const purchase = await requestSubscription(productId);

    if (purchase) {
      // Save subscription info to Firestore if needed
      const subscriptionData = {
        userId,
        subscriptionType,
        price,
        transactionId: purchase.transactionId,
        purchaseTime: new Date(purchase.transactionDate),
        isActive: true,
      };

      // Save the subscription details in Firestore under the user's profile
      const userDocRef = doc(firestore, 'users', userId);
      await setDoc(userDocRef, { subscription: subscriptionData }, { merge: true });

      return { success: true, purchase };
    } else {
      return { success: false, message: 'Purchase was unsuccessful' };
    }
  } catch (error) {
    console.error('Purchase error:', error);
    return { success: false, error };
  } finally {
    // End the connection to the store after the purchase
    await endConnection();
  }
};
