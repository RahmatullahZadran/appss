// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';  // Import Firebase Storage

const firebaseConfig = {
  apiKey: "AIzaSyAqtvPUpUAql__qIGqegAwIHdn2cQ3d_R0",
  authDomain: "dvla-ab384.firebaseapp.com",
  projectId: "dvla-ab384",
  storageBucket: "dvla-ab384.appspot.com",
  messagingSenderId: "624350859116",
  appId: "1:624350859116:web:b68e80703373f28f366d49",
  measurementId: "G-4ZMYMZCWY3"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firestore
const firestore = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);  // Correctly initialize Firebase Storage

export { auth, firestore, storage };
