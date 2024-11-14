// services/NotificationsService.js

import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';

// Initialize Firestore
const firestore = getFirestore();

// Function to create the notification channel
export const createNotificationChannel = async () => {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    description: 'This is the default notification channel',
    sound: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
    vibrate: true,
  });
};

// Function to get push token and save it to Firestore
export const getPushToken = async (user) => {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: '1ddbb52c-2865-49d0-af78-0efb8e2b98cd', // Your projectId here
    });

    // Save push token to Firestore for authenticated user
    const userRef = doc(firestore, 'users', user.uid);
    await updateDoc(userRef, { expoPushToken: token.data });

    console.log('Push token saved to Firestore:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error requesting push token:', error);
  }
};

// Custom hook to handle notifications
export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);

  // Request notification permission on app launch
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission denied!');
      } else {
        console.log('Notification permission granted!');
      }
    };

    requestPermissions();
  }, []); // Runs once at app launch

  // Listen for notifications while the app is in the foreground
  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground Notification received:', notification);
      setNotification(notification);
    });

    return () => foregroundSubscription.remove();
  }, []);

  // Handle notification responses (background or terminated)
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      // Handle actions after tapping the notification (e.g., navigate to a screen)
    });

    return () => responseSubscription.remove();
  }, []);

  // Get push token when the user is authenticated
  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const token = await getPushToken(user);
        setExpoPushToken(token);
      }
    });

    return () => authUnsubscribe();
  }, []);

  return {
    expoPushToken,
    notification,
  };
};
