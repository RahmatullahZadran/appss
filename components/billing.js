import { 
  initConnection, 
  getProducts, 
  requestPurchase, 
  purchaseUpdatedListener, 
  purchaseErrorListener, 
  getAvailablePurchases, 
  finishTransaction
} from 'react-native-iap';
import { Alert } from 'react-native';

const IN_APP_PRODUCT_SKUS = ['30_days_access', '7_days_access'];

const showAlert = (title, message) => {
  Alert.alert(title, message);
};

// Initialization
export const initializeBilling = async () => {
  try {
    console.log("jackson: Initializing IAP connection...");
    await initConnection();
    console.log("jackson: IAP connection initialized.");
    await handlePendingPurchases(); // Handle any unacknowledged purchases
  } catch (error) {
    console.error("jackson: Error connecting to store:", error.message || error);
    showAlert("Error", `Could not connect to the store. ${error.message || "Please try again later."}`);
  }
};

// Handle Pending Purchases
export const handlePendingPurchases = async () => {
  try {
    console.log("jackson: Fetching available purchases...");
    const availablePurchases = await getAvailablePurchases();
    console.log("jackson: Available purchases retrieved:", availablePurchases);
    
    for (const purchase of availablePurchases) {
      console.log("jackson: Processing pending purchase:", purchase);
      await processPurchase(purchase);
    }
  } catch (error) {
    console.error("jackson: Error handling pending purchases:", error.message || error);
  }
};

// Process Purchase
const processPurchase = async (purchase) => {
  const { productId, purchaseToken } = purchase;
  
  try {
    console.log(`jackson: Preparing to process purchase for SKU: ${productId}`);
    console.log(`jackson: Retrieved purchase token: ${purchaseToken}`);

    // Ensure purchaseToken is valid before attempting acknowledgment and consumption
    if (!purchaseToken || purchaseToken === '0' || typeof purchaseToken !== 'string' || purchaseToken.trim() === '') {
      console.error(`jackson: Invalid purchase token detected for SKU: ${productId}. Token: ${purchaseToken}`);
      showAlert("Purchase Error", `Invalid purchase token for SKU: ${productId}. Please try again later.`);
      return;
    }

    // Check if the product is consumable
    const isConsumable = productId === '7_days_access' || productId === '30_days_access';

    // Finalize the transaction, indicating if it’s consumable
    console.log(`jackson: Attempting to finalize transaction for SKU: ${productId} with finishTransaction.`);
    await finishTransaction({ purchase, isConsumable });
    console.log(`jackson: Successfully finalized transaction for SKU: ${productId}`);
    
  } catch (error) {
    console.error("jackson: Error processing purchase:", error.message || error);
    showAlert("Purchase Error", `Could not process the purchase. ${error.message || "Unknown error"}`);
  }
};

// Purchase Listener
export const setupPurchaseListener = () => {
  const updateListener = purchaseUpdatedListener(async (purchase) => {
    console.log("jackson: Purchase update received:", purchase);
    await processPurchase(purchase); // Acknowledge and consume immediately if needed
  });

  const errorListener = purchaseErrorListener((error) => {
    console.error("jackson: Purchase error encountered:", error);
    showAlert("Purchase Error", `Error during purchase process: ${error.message || "Unknown error"}`);
  });

  return { updateListener, errorListener }; // Return listeners for cleanup
};


// Initiate Purchase
export const purchaseProduct = async (sku) => {
  try {
    console.log(`jackson: Initiating purchase for SKU: ${sku}`);
    await requestPurchase({ skus: [sku] });
    console.log(`jackson: Purchase successful for SKU: ${sku}`);

    // After a successful purchase, get the available purchases to process it
    const availablePurchases = await getAvailablePurchases();
    const purchase = availablePurchases.find(p => p.productId === sku);

    if (purchase) {
      // Immediately process (acknowledge and consume) the consumable product
      console.log(`jackson: Found purchase for SKU: ${sku}, processing...`);
      await processPurchase(purchase);
      console.log(`jackson: Purchase for SKU: ${sku} has been acknowledged and consumed.`);
    } else {
      console.error(`jackson: Could not find the completed purchase for SKU: ${sku}.`);
    }

    return { success: true };
  } catch (error) {
    console.error("jackson: Error requesting purchase:", error.message || error);
    showAlert("Purchase Error", `Could not complete the purchase. Error: ${error.message || 'undefined'}`);
    return { success: false };
  }
};

// Fetch Products
export const fetchProducts = async () => {
  try {
    console.log("jackson: Fetching products with SKUs:", IN_APP_PRODUCT_SKUS);
    const products = await getProducts({ skus: IN_APP_PRODUCT_SKUS });
    console.log("jackson: Products retrieved successfully:", products);
    return products;
  } catch (error) {
    console.error("jackson: Error fetching products:", error.message || error);
    showAlert("Error", "Could not fetch products. Please try again later.");
    return [];
  }
};


