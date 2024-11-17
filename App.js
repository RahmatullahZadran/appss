  import React, { useState, useEffect } from 'react';
  import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
  import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
  import { createNativeStackNavigator } from '@react-navigation/native-stack';
  import { Ionicons } from '@expo/vector-icons';
  import { View, Text } from 'react-native';
  import { getFirestore, collection, onSnapshot, getDocs, doc, updateDoc } from 'firebase/firestore';
  import { auth } from './firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import * as Notifications from 'expo-notifications';


  import NotificationBanner from './components/Notitifcationbanner';


  // Component imports
  import SearchScreen from './components/search';
  import AuthScreen from './components/auth';
  import ProfileScreen from './components/profile';
  import InstructorProfileScreen from './components/instructorprofile';
  import MessagesScreen from './components/Message';
  import ChattingScreen from './components/Chat';
  import StudentProfile from './components/StudentProfile';
  import RecentlyViewedProfiles from './components/viewed';



  const Tab = createBottomTabNavigator();
  const Stack = createNativeStackNavigator();
  const firestore = getFirestore();

  const CustomTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#6200ee',
      background: '#f2f2f7',
      card: '#ffffff',
      text: '#1c1c1c',
      border: '#e0e0e0',
      notification: '#ff3b30',
    },
  };

  // Profile stack
  function ProfileStack() {
    const [user, setUser] = useState(null);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user ? user : null);
      });
      return () => unsubscribe();
    }, []);

    return (
      <Stack.Navigator>
        {user ? (
          <Stack.Screen name="Profile" component={ProfileScreen} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    );
  }


  // Main App component with conversation listener

  export default function App() {
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
    

    // Create notification channel and listen for auth state changes
    useEffect(() => {
      createNotificationChannel();

      const authUnsubscribe = auth.onAuthStateChanged(async (user) => {
        if (user) {
          // If the user is logged in, get and save the push token
          await getPushToken(user);

          const userChatsRef = collection(firestore, 'users', user.uid, 'chats');

          // Listen to the user's conversations collection to update unread message count
          const unsubscribe = onSnapshot(userChatsRef, (snapshot) => {
            let chatList = snapshot.docs.map((doc) => {
              const data = doc.data();
              return { id: doc.id, ...data };
            });

            // Sort conversations by timestamp
            chatList = chatList.sort((a, b) => {
              const timeA = a.timestamp?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
              const timeB = b.timestamp?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
              return timeB - timeA;
            });

            setConversations(chatList);

            // Count unread messages
            const unreadCount = chatList.filter((chat) => chat.unread === true).length;
            setUnreadMessageCount(unreadCount);
          });

          // Cleanup the listener
          return () => {
            unsubscribe();
          };
        } else {
          // If the user is not logged in, reset conversations and unread message count
          setConversations([]);
          setUnreadMessageCount(0);
        }
      });

      // Cleanup auth state listener
      return () => {
        authUnsubscribe();
      };
    }, []);

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
    const createNotificationChannel = async () => {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        description: 'This is the default notification channel',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: true,
      });
    };

    const listenForNotificationResponses = () => {
      return Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response);
        // Perform actions based on notification data (e.g., navigate to a screen)
      });
    };

    // Function to retrieve and save the Expo push token to Firestore
 // Function to retrieve and save the device push token to Firestore
const getPushToken = async (user) => {
  try {
    // Get the native device push token
    const { data: token } = await Notifications.getDevicePushTokenAsync();

    console.log('Device push token:', token);
    setExpoPushToken(token); // Save the token in state or Firestore

    // Save the token to Firestore for the authenticated user
    const userRef = doc(firestore, 'users', user.uid);
    await updateDoc(userRef, { devicePushToken: token });

    console.log('Push token saved to Firestore:', token);
  } catch (error) {
    console.error('Error requesting push token:', error);
  }
};


  
    

function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Messages" options={{ title: 'Messages' }}>
        {(props) => (
          <MessagesScreen
            {...props}
            conversations={conversations}
            setUnreadMessageCount={setUnreadMessageCount}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="InstructorProfileScreen"
        component={InstructorProfileScreen}
        options={{ title: 'Instructor Profile' }}
      />
      <Stack.Screen
        name="StudentProfile"
        component={StudentProfile}
        options={{ title: 'Student Profile' }}
      />
      <Stack.Screen name="ChattingScreen" component={ChattingScreen} options={{ title: 'Chat' }} />
    </Stack.Navigator>
  );
}


    function SearchScreenStack() {
      return (
        <Stack.Navigator>
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ headerShown: true, title: 'Search' }}
          />
          <Stack.Screen
            name="InstructorProfile"
            component={InstructorProfileScreen}
            options={{ title: 'Instructor Profile' }}
          />
          <Stack.Screen
            name="ChattingScreen"
            component={ChattingScreen}
            options={{ title: 'Chat' }}
          />
        </Stack.Navigator>
      );
    }
    function ViewedProfilesStack() {
      return (
        <Stack.Navigator>
          <Stack.Screen
            name="Viewed Profiles"
            component={RecentlyViewedProfiles}
            options={{ headerShown: true, title: 'Viewed Profiles' }}
          />
          <Stack.Screen
            name="InstructorProfile"
            component={InstructorProfileScreen}
            options={{ title: 'Instructor Profile' }}
          />
          <Stack.Screen
            name="ChattingScreen"
            component={ChattingScreen}
            options={{ title: 'Chat' }}
          />
        </Stack.Navigator>
      );
    }

    return (
      <NavigationContainer theme={CustomTheme}>


  {notification && (
          <NotificationBanner
            title={notification.request.content.title}
            body={notification.request.content.body}
          />
        )}
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              let badgeCount = null;

              if (route.name === 'ProfileStack') {
                iconName = focused ? 'person-circle' : 'person-circle-outline';
              } else if (route.name === 'MessagesStack') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                badgeCount = unreadMessageCount;
              } else if (route.name === 'SearchScreenStack') {
                iconName = focused ? 'search' : 'search-outline';
              } else if (route.name === 'ViewedProfilesStack') {
                iconName = focused ? 'eye' : 'eye-outline';
              }

              return (
                <View style={{ position: 'relative' }}>
                  <Ionicons name={iconName} size={size} color={color} />
                  {badgeCount > 0 && (
                    <View
                      style={{
                        position: 'absolute',
                        right: -10,
                        top: -3,
                        backgroundColor: '#e84118',
                        borderRadius: 10,
                        height: 18,
                        width: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </Text>
                    </View>
                  )}
                </View>
              );
            },
            tabBarActiveTintColor: '#6200ee',
            tabBarInactiveTintColor: '#8e8e93',
          })}
        >
          <Tab.Screen name="ProfileStack" component={ProfileStack} options={{ headerShown: false, title: 'Profile' }} />
          <Tab.Screen
            name="MessagesStack"
            options={{
              headerShown: false,
              title: 'Messages',
            }}
            component={MessagesStack}
          />
          <Tab.Screen name="SearchScreenStack" component={SearchScreenStack} options={{ headerShown: false, title: 'Search' }} />
          <Tab.Screen name="ViewedProfilesStack" component={ViewedProfilesStack} options={{ headerShown: false, title: 'Viewed Profiles' }} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }
