import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';  // Import AsyncStorage for persistence
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAqtvPUpUAql__qIGqegAwIHdn2cQ3d_R0",
  authDomain: "dvla-ab384.firebaseapp.com",
  projectId: "dvla-ab384",
  storageBucket: "dvla-ab384.appspot.com",
  messagingSenderId: "624350859116",
  appId: "1:624350859116:web:b68e80703373f28f366d49",
  measurementId: "G-4ZMYMZCWY3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistent storage using AsyncStorage
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
const firestore = getFirestore(app);

export { auth, firestore };
