import * as RNIap from 'react-native-iap';
import { Alert } from 'react-native';

const SEVEN_DAY_PLAN_ID = '7days';
const THIRTY_DAY_PLAN_ID = '30days';

const purchaseProduct = async (userId, productType) => {
  try {
    const productId = productType === 'weekly' ? SEVEN_DAY_PLAN_ID : THIRTY_DAY_PLAN_ID;

    Alert.alert("Step 1", "Starting billing connection...");
    console.log("Step 1: Starting billing connection");

    // Initialize billing connection
    const connection = await RNIap.initConnection();
    if (!connection) {
      Alert.alert("Error", "Billing connection failed: Billing is unavailable.");
      console.error("Billing connection failed: Billing is unavailable.");
      throw new Error('Billing is unavailable.');
    }

    Alert.alert("Step 2", `Billing connection successful, preparing to fetch products with ID: ${productId}`);
    console.log(`Step 2: Billing connection successful, preparing to fetch products with ID: ${productId}`);

    // Fetch products
    let products;
    try {
      console.log("Step 3: Fetching products...");
      Alert.alert("Step 3", "Fetching products...");
      
      products = await RNIap.getProducts([SEVEN_DAY_PLAN_ID, THIRTY_DAY_PLAN_ID]);
      console.log("Products fetched:", products);
      
      if (!products || products.length === 0) {
        Alert.alert("Error", "No products fetched. Product list is empty. Check Play Console configuration.");
        console.error("Error: No products fetched. Product list is empty. Check Play Console configuration.");
        throw new Error('No products fetched.');
      }
    } catch (fetchError) {
      const errorDetails = fetchError && fetchError.message ? fetchError.message : 'Unknown error';
      Alert.alert("Product Fetch Error", `Failed to fetch products. Message: ${errorDetails}`);
      console.error("Product fetch error:", errorDetails, "\nComplete error object:", fetchError);
      throw fetchError;
    }

    Alert.alert("Step 4", `Fetched products successfully. Products: ${JSON.stringify(products)}`);
    console.log(`Step 4: Fetched products successfully. Products: ${JSON.stringify(products)}`);

    // Verify that the fetched products contain the selected product ID
    const selectedProduct = products.find(product => product.productId === productId);
    if (!selectedProduct) {
      Alert.alert("Error", `Selected product ID (${productId}) not found in fetched products.`);
      console.error(`Error: Selected product ID (${productId}) not found in fetched products.`);
      throw new Error('Selected product not found.');
    }

    Alert.alert("Step 5", `Product ${productId} found in fetched products, preparing to request purchase.`);
    console.log(`Step 5: Product ${productId} found in fetched products, preparing to request purchase.`);

    // Request the purchase
    try {
      console.log("Step 6: Requesting purchase...");
      Alert.alert("Step 6", "Requesting purchase...");

      const purchase = await RNIap.requestPurchase(productId);
      console.log("Purchase response:", purchase);
      
      if (purchase && purchase.transactionReceipt) {
        Alert.alert("Success", "Purchase successful, transaction receipt received.");
        console.log("Success: Purchase successful, transaction receipt received.");
        return { success: true, purchase };
      } else {
        Alert.alert("Error", "Purchase failed: No transaction receipt received.");
        console.error("Error: Purchase failed: No transaction receipt received.");
        return { success: false, error: 'No transaction receipt received.' };
      }
    } catch (purchaseError) {
      Alert.alert("Purchase Request Error", `Failed to request purchase for product ID: ${productId}. Error: ${purchaseError.message || 'Unknown error'}`);
      console.error("Purchase request error:", purchaseError.message, "\nStack trace:", purchaseError.stack);
      return { success: false, error: purchaseError.message || 'Unknown purchase request error' };
    }

  } catch (error) {
    Alert.alert("Purchase Error", `An error occurred. Message: ${error.message || 'Unknown error'}\nStack trace: ${error.stack || 'No stack trace available'}`);
    console.error("Purchase error:", error.message || 'Unknown error', "\nStack trace:", error.stack || 'No stack trace');
    return { success: false, error: error.message || 'Unknown error' };
  } finally {
    Alert.alert("Final Step", "Ending billing connection...");
    console.log("Final Step: Ending billing connection");
    await RNIap.endConnection();
  }
};

export default purchaseProduct;
