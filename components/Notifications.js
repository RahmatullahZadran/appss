// NotificationHandler.js

import * as Notifications from 'expo-notifications';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useState, useEffect } from 'react';

// Create Notification Channel (for Android)


// Listen for notifications while the app is in the foreground
export const listenForForegroundNotifications = () => {
  return Notifications.addNotificationReceivedListener((notification) => {
    
    // Custom handling for foreground notifications
  });
};

// Listen for notification responses (when tapped)
export const listenForNotificationResponses = () => {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification tapped:', response);
    // Perform actions based on notification data (e.g., navigate to a screen)
  });
};

// Request permissions for notifications and return the status
export const requestNotificationPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
};

// Function to retrieve and save Expo push token to Firestore
export const getPushToken = async (user, firestore) => {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log('Notification permission status:', status);
  
    if (status === 'granted') {
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: '1ddbb52c-2865-49d0-af78-0efb8e2b98cd',  // Use your Expo Project ID here
        });
  
        console.log('Expo Push Token:', token.data); // This should log the token
  
        // Save the token to Firestore for the authenticated user
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { expoPushToken: token.data });
        console.log('Push token saved to Firestore:', token.data);
        return token.data;  // Return the token so it can be used elsewhere
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    } else {
      console.log('Notification permission not granted!');
    }
  };
  

