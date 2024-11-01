import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated } from 'react-native';

// Your component imports
import SearchScreen from './components/search';
import AuthScreen from './components/auth';
import ProfileScreen from './components/profile';
import InstructorProfileScreen from './components/instructorprofile';
import MessagesScreen from './components/Message';
import ChattingScreen from './components/Chat';
import StudentProfile from './components/StudentProfile';
import RecentlyViewedProfiles from './components/viewed';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

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



function MessagesStack({ unreadMessageCount, setUnreadMessageCount }) {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Messages"
        options={{ title: 'Messages' }}
      >
        {(props) => (
          <MessagesScreen
            {...props}
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

export default function App() {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

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
        >
          {(props) => (
            <MessagesStack
              {...props}
              unreadMessageCount={unreadMessageCount}
              setUnreadMessageCount={setUnreadMessageCount}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="SearchScreenStack" component={SearchScreenStack} options={{ headerShown: false, title: 'Search' }} />
        <Tab.Screen name="ViewedProfilesStack" component={ViewedProfilesStack} options={{ headerShown: false, title: 'Viewed Profiles' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
