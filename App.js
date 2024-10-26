import React, { useState, useEffect,useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import SearchScreen from './components/search';
import AuthScreen from './components/auth';
import ProfileScreen from './components/profile';
import InstructorProfileScreen from './components/instructorprofile';
import MessagesScreen from './components/Message';
import ChattingScreen from './components/Chat';
import StudentProfile from './components/StudentProfile';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import RecentlyViewedProfiles from './components/viewed';
import { View, Text, Animated } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
        {(props) => (
          <MessagesScreen
            {...props}
            setHasUnreadMessages={setHasUnreadMessages}
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
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  return (
    <NavigationContainer theme={CustomTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'ProfileStack') {
              iconName = focused ? 'person-circle' : 'person-circle-outline';
            } else if (route.name === 'MessagesStack') {
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            } else if (route.name === 'SearchScreenStack') {
              iconName = focused ? 'search' : 'search-outline';
            } else if (route.name === 'ViewedProfilesStack') {
              iconName = focused ? 'eye' : 'eye-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6200ee',
          tabBarInactiveTintColor: '#8e8e93',
          tabBarBadgeStyle: { backgroundColor: '#ff3b30', color: '#ffffff' },
          tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e0e0e0' },
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
    tabBarIcon: ({ focused, color, size }) => {
      const pulseAnim = useRef(new Animated.Value(1)).current;

      useEffect(() => {
        if (hasUnreadMessages) {
          // Start a pulsing animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.3, // Scale up to 1.3x
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1, // Scale back to normal
                duration: 500,
                useNativeDriver: true,
              }),
            ])
          ).start();
        } else {
          // Reset animation when no unread messages
          pulseAnim.setValue(1);
        }
      }, [hasUnreadMessages]);

      return (
        <View style={{ position: 'relative' }}>
          <Ionicons
            name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
            size={size}
            color={color}
          />
          {hasUnreadMessages && (
            <Animated.View
              style={{
                position: 'absolute',
                right: -6,
                top: -3,
                backgroundColor: '#e84118',
                borderRadius: 8,
                height: 16,
                width: 16,
                justifyContent: 'center',
                alignItems: 'center',
                transform: [{ scale: pulseAnim }],
              }}
            >
              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>•</Text>
            </Animated.View>
          )}
        </View>
      );
    },
  }}
>
  {(props) => (
    <MessagesStack
      {...props}
      hasUnreadMessages={hasUnreadMessages}
      setHasUnreadMessages={setHasUnreadMessages}
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
