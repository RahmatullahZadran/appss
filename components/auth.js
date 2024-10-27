import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
} from 'react-native';
import CheckBox from 'expo-checkbox';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

const AuthScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('');
  const [agreedToGuidelines, setAgreedToGuidelines] = useState(false);
  const [errors, setErrors] = useState({});
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);

  // Initialize Google Sign-In with native modal preference
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '602496785154-l52ri7unkiuh2lfkbmji88jh0qts93ch.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri({
      useProxy: true,
    }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const user = userCredential.user;

          // Check if user exists in Firestore; if not, create new profile
          const userDoc = doc(firestore, 'users', user.uid);
          const docSnapshot = await getDoc(userDoc);
          if (!docSnapshot.exists()) {
            await setDoc(userDoc, {
              firstName: user.displayName.split(' ')[0] || '',
              lastName: user.displayName.split(' ')[1] || '',
              MainEmail: user.email,
              role: 'student', // Default role; modify as needed
            });
          }
        })
        .catch((error) => {
          setErrors((prevErrors) => ({ ...prevErrors, auth: error.message }));
        });
    }
  }, [response]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{isLogin ? 'Login' : 'Register'}</Text>

        {/* Email and Password Inputs */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={() => promptAsync({ useProxy: true })}
          disabled={!request}
        >
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {/* Toggle between Login and Register */}
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // styles go here...
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AuthScreen;
