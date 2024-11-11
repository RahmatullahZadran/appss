import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { registerForPushNotificationsAsync } from './components/NotificationService';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

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
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [expoPushToken, setExpoPushToken] = useState(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Listener for incoming notifications
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userChatsRef = collection(firestore, 'users', user.uid, 'chats');
        
        const unsubscribe = onSnapshot(userChatsRef, (snapshot) => {
          let chatList = snapshot.docs.map((doc) => {
            const data = doc.data();
            return { id: doc.id, ...data };
          });

          // Sort chats by timestamp or createdAt
          chatList = chatList.sort((a, b) => {
            const timeA = a.timestamp?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
            const timeB = b.timestamp?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
            return timeB - timeA;
          });

          setConversations(chatList);
          const unreadCount = chatList.filter((chat) => chat.unread === true).length;
          
          // Trigger notification if there are new unread messages
          if (unreadCount > unreadMessageCount) {
            sendPushNotification(expoPushToken, 'New Messages', `You have ${unreadCount} unread messages.`);
          }

          setUnreadMessageCount(unreadCount);
        });

        return () => unsubscribe();
      } else {
        setConversations([]);
        setUnreadMessageCount(0);
      }
    });

    return () => authUnsubscribe();
  }, [expoPushToken, unreadMessageCount]);

  async function sendPushNotification(token, title, body) {
    if (token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title: title,
          body: body,
        }),
      });
    }
  }

  // Messages stack with prop drilling
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
        <Stack.Screen name="ChattingScreen" component={ChattingScreen} options={{ title: 'Chat' }} />
        <Stack.Screen name="InstructorProfile" component={InstructorProfileScreen} options={{ title: 'Instructor Profile' }} />
        <Stack.Screen name="StudentProfile" component={StudentProfile} options={{ title: 'Student Profile' }} />
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
