import * as RNIap from 'react-native-iap';
import { Alert } from 'react-native';

const SEVEN_DAY_PLAN_ID = '7days';
const THIRTY_DAY_PLAN_ID = '30days';

const purchaseProduct = async (userId, productType) => {
  try {
    const productId = productType === 'weekly' ? SEVEN_DAY_PLAN_ID : THIRTY_DAY_PLAN_ID;

    Alert.alert("Step 1", "Starting billing connection...");

    // Initialize billing connection
    const connection = await RNIap.initConnection();
    if (!connection) {
      Alert.alert("Error", "Billing connection failed: Billing is unavailable.");
      throw new Error('Billing is unavailable.');
    }
    
    Alert.alert("Step 2", `Billing connection successful, preparing to fetch products with ID: ${productId}`);

    // Fetch products
    const products = await RNIap.getProducts([SEVEN_DAY_PLAN_ID, THIRTY_DAY_PLAN_ID]);
    if (!products || products.length === 0) {
      Alert.alert("Error", "No products fetched. Please check product configuration in the Play Console.");
      throw new Error('No products fetched.');
    }
    
    Alert.alert("Step 3", `Fetched products successfully. Products: ${JSON.stringify(products)}`);

    // Verify that the fetched products contain the selected product ID
    const selectedProduct = products.find(product => product.productId === productId);
    if (!selectedProduct) {
      Alert.alert("Error", `Selected product ID (${productId}) not found in fetched products.`);
      throw new Error('Selected product not found.');
    }

    Alert.alert("Step 4", `Product ${productId} found in fetched products, preparing to request purchase.`);

    // Request the purchase
    try {
      const purchase = await RNIap.requestPurchase(productId);
      Alert.alert("Step 5", "Purchase request made, waiting for transaction receipt.");
      
      if (purchase && purchase.transactionReceipt) {
        Alert.alert("Success", "Purchase successful, transaction receipt received.");
        return { success: true, purchase };
      } else {
        Alert.alert("Error", "Purchase failed: No transaction receipt received.");
        return { success: false, error: 'No transaction receipt received.' };
      }
    } catch (purchaseError) {
      Alert.alert("Purchase Request Error", `Failed to request purchase for product ID: ${productId}. Error: ${purchaseError.message}`);
      console.error("Purchase request error:", purchaseError.message, "\nStack trace:", purchaseError.stack);
      return { success: false, error: purchaseError.message };
    }
    
  } catch (error) {
    Alert.alert("Purchase Error", `An error occurred. Message: ${error.message}\nStack trace: ${error.stack}`);
    console.error("Purchase error:", error.message, "\nStack trace:", error.stack);
    return { success: false, error: error.message };
  } finally {
    Alert.alert("Final Step", "Ending billing connection...");
    await RNIap.endConnection();
  }
};

export default purchaseProduct;
