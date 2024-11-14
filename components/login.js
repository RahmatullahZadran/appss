// NotificationHandler.js
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { auth } from './firebase';
import NotificationBanner from './components/Notitifcationbanner';

const firestore = getFirestore();

export function useNotification() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [notification, setNotification] = useState(null); // To store the notification

  // Request notification permission on app launch (called only once)
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
  }, []);  // Empty dependency array makes sure this runs once at app launch

  // Create notification channel
  const createNotificationChannel = async () => {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      description: 'This is the default notification channel',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: true,
    });
  };

  // Handle notification responses (background or terminated)
  useEffect(() => {
    const responseSubscription = listenForNotificationResponses();
    return () => responseSubscription.remove();
  }, []);

  // Listen for notifications while the app is in the foreground
  useEffect(() => {
    const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Foreground Notification received:', notification);
      setNotification(notification);
    });
  
    return () => foregroundSubscription.remove();
  }, []);

  // Background notification listener
  useEffect(() => {
    const backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification clicked or received in background:', response);
      }
    );

    return () => backgroundSubscription.remove();
  }, []);

  const listenForNotificationResponses = () => {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      // Perform actions based on notification data (e.g., navigate to a screen)
    });
  };

  // Function to retrieve and save the Expo push token to Firestore
  const getPushToken = async (user) => {
    try {
      // Get the Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '1ddbb52c-2865-49d0-af78-0efb8e2b98cd', // Your projectId here
      });

      console.log('Expo push token:', token.data);
      setExpoPushToken(token.data); // Save token in state or Firestore

      // Save the token to Firestore for the authenticated user
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { expoPushToken: token.data });

      console.log('Push token saved to Firestore:', token.data);
    } catch (error) {
      console.error('Error requesting push token:', error);
    }
  };

  return { expoPushToken, unreadMessageCount, conversations, notification, createNotificationChannel, getPushToken };
}

// NotificationBanner component (optional: can be a separate file if needed)
export function NotificationBannerComponent({ notification }) {
  if (!notification) return null;

  return (
    <NotificationBanner
      title={notification.request.content.title}
      body={notification.request.content.body}
    />
  );
}
