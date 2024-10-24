import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from './components/search';
import AuthScreen from './components/auth';
import ProfileScreen from './components/profile';
import InstructorProfileScreen from './components/instructorprofile';
import MessagesScreen from './components/Message';
import ChattingScreen from './components/Chat';
import StudentProfile from './components/StudentProfile'; // Import the StudentProfile component
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import RecentlyViewedProfiles from './components/viewed';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProfileStack() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user ? user : null);
    });
    return () => unsubscribe(); // Cleanup listener on component unmount
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

// Stack Navigator for Search, InstructorProfile, and Chatting
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

// Stack Navigator for Messages, Chatting, InstructorProfile, and StudentProfile
function MessagesStack({ hasUnreadMessages, setHasUnreadMessages }) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Messages"
        options={{
          headerShown: true,
          title: 'Messages',
        }}
      >
        {props => (
          <MessagesScreen
            {...props}
            setHasUnreadMessages={setHasUnreadMessages} // Pass setHasUnreadMessages to MessagesScreen
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="ChattingScreen"
        component={ChattingScreen}
        options={{ title: 'Chat' }}
      />
      <Stack.Screen
        name="InstructorProfile"
        component={InstructorProfileScreen}
        options={{ title: 'Instructor Profile' }}
      />
      <Stack.Screen
        name="StudentProfile"
        component={StudentProfile}
        options={{ title: 'Student Profile' }}
      />
    </Stack.Navigator>
  );
}

// Stack Navigator for Viewed Profiles and InstructorProfile
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

export default function App() {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false); // Track unread message status

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'ProfileStack') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'MessagesStack') {
              iconName = focused ? 'chatbox' : 'chatbox-outline';
            } else if (route.name === 'SearchScreenStack') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'ViewedProfilesStack') {
              iconName = focused ? 'eye' : 'eye-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen
          name="ProfileStack"
          component={ProfileStack}
          options={{ headerShown: false, title: 'Profile' }}
        />
        <Tab.Screen
          name="MessagesStack"
          options={{
            headerShown: false,
            title: 'Messages',
            tabBarBadge: hasUnreadMessages ? ' ' : null, // Show badge if unread messages exist
          }}
        >
          {props => (
            <MessagesStack
              {...props}
              hasUnreadMessages={hasUnreadMessages} // Pass down unread message state
              setHasUnreadMessages={setHasUnreadMessages} // Pass down setter
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="SearchScreenStack"
          component={SearchScreenStack}
          options={{ headerShown: false, title: 'Search' }}
        />
        <Tab.Screen
          name="ViewedProfilesStack"
          component={ViewedProfilesStack}
          options={{ headerShown: false, title: 'Viewed Profiles' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
