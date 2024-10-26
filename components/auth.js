import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as GoogleSignIn from 'expo-google-sign-in';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, firestore } from '../firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';

const AuthScreen = () => {
  useEffect(() => {
    initGoogleSignIn();
  }, []);

  const initGoogleSignIn = async () => {
    await GoogleSignIn.initAsync({
      clientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com', // Replace with your Android client ID
    });
    await GoogleSignIn.askForPlayServicesAsync();
  };

  const handleGoogleSignIn = async () => {
    const { type, user } = await GoogleSignIn.signInAsync();
    if (type === 'success') {
      const credential = GoogleAuthProvider.credential(user.auth.idToken);
      const userCredential = await signInWithCredential(auth, credential);

      // Optionally save additional user data to Firestore
      const docRef = doc(firestore, 'users', userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          firstName: user.givenName,
          lastName: user.familyName,
          email: user.email,
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleGoogleSignIn} style={styles.googleButton}>
        <Text style={styles.googleButtonText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  googleButton: { backgroundColor: '#4285F4', padding: 15, borderRadius: 5 },
  googleButtonText: { color: '#fff', fontSize: 16 },
});

export default AuthScreen;
