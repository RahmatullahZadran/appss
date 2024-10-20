import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from './components/search';
import AuthScreen from './components/auth';
import ProfileScreen from './components/profile';
import InstructorProfileScreen from './components/instructorprofile';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import RecentlyViewedProfiles from './components/viewed';
import { getAuth } from 'firebase/auth';

// Messages and Viewed Profiles screen for tabs
function MessagesScreen() {
  return (
    <View style={styles.container}>
      <Text>Messages Screen</Text>
    </View>
  );
}


// Create Bottom Tabs and Stack Navigator
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ProfileStack() {
  const [user, setUser] = useState(null);

  // Listen to authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user ? user : null);
    });
    return () => unsubscribe(); // Cleanup listener on component unmount
  }, []);

  return (
    <Stack.Navigator>
      {user ? (
        <Stack.Screen name="Profile" component={ProfileScreen}  />
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen}  />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'ProfileStack') {
              iconName = focused ? 'person' : 'person-outline';
            } else if (route.name === 'Messages') {
              iconName = focused ? 'chatbox' : 'chatbox-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'Viewed Profiles') {
              iconName = focused ? 'eye' : 'eye-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="ProfileStack" component={ProfileStack} options={{ headerShown: false }} />
        <Tab.Screen name="Messages" component={MessagesScreen} />
        <Tab.Screen name="Search" component={SearchScreenStack} options={{ headerShown: false }} />
        <Tab.Screen name="Viewed Profiles" component={RecentlyViewedProfiles} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Create a Stack for Search, including navigating to Instructor Profile
function SearchScreenStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        // Hide the header for the SearchScreen
      />
      <Stack.Screen
        name="InstructorProfile"
        component={InstructorProfileScreen}
        options={{ title: 'Instructor Profile' }} // Show a custom title for InstructorProfileScreen
      />
      
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
