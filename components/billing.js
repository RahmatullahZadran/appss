import { initConnection, getProducts, requestPurchase, consumePurchase, finishTransaction } from 'react-native-iap';
import { Alert, Platform } from 'react-native';

const IN_APP_PRODUCT_SKUS = ['30_days_access', '7_days_access'];

export const initializeBilling = async () => {
  try {
    await initConnection();
    console.log("IAP connection initialized.");
  } catch (error) {
    console.error("Error connecting to store:", error.message || error);
    Alert.alert("Error", `Could not connect to the store. ${error.message || "Please try again later."}`);
  }
};

export const fetchProducts = async (skus) => {
  try {
    const products = await getProducts({ skus });
    console.log("Products retrieved successfully:", products);
    return products;
  } catch (error) {
    console.error("Error fetching products:", error.message || error);
    Alert.alert("Error", "Could not fetch products. Please try again later.");
    return [];
  }
};

export const purchaseProduct = async (sku) => {
  try {
    console.log("Attempting purchase for SKU:", sku);
    if (Platform.OS === 'android') {
      await requestPurchase({ skus: [sku] });
    } else {
      await requestPurchase({ sku });
    }
    console.log("Purchase requested for SKU:", sku);

    // Automatically consume and acknowledge the purchase for consumable items
    await consumePurchase(sku);
    console.log("Purchase consumed successfully for SKU:", sku);

    // Optionally, explicitly finish transaction (acknowledge) on all platforms
    if (Platform.OS === 'ios') {
      await finishTransaction({ purchaseId: sku });
    }

    return { success: true };
  } catch (error) {
    if (error.message === 'You already own this item') {
      console.warn("Item already owned. Attempting to consume.");

      try {
        await consumePurchase(sku);
        console.log("Previously owned item consumed successfully.");
        return { success: true };
      } catch (consumeError) {
        console.error("Error consuming previously owned item:", consumeError);
        Alert.alert("Error", "Could not consume the item. Please try again later.");
        return { success: false };
      }
    } else {
      console.error("Error requesting purchase:", error);
      Alert.alert("Purchase Error", `Could not complete the purchase. Error: ${error.message || 'undefined'}`);
      return { success: false };
    }
  }
};
