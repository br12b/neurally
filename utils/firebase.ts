
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ------------------------------------------------------------------
// Firebase Configuration
// ------------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyA4M3GOMfIJQno1g8QzeXMFB1qnd3b4OdA",
  authDomain: "neurally-6d9ec.firebaseapp.com",
  projectId: "neurally-6d9ec",
  storageBucket: "neurally-6d9ec.firebasestorage.app",
  messagingSenderId: "374373610994",
  appId: "1:374373610994:web:53f6240b19d2df9203276b",
  measurementId: "G-PQMZYJ6Y4T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Ensure Persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase Persistence Error:", error);
});

// Google Auth Settings
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// ------------------------------------------------------------------
// GLOBAL DATA SANITIZER
// ------------------------------------------------------------------
// This function removes any 'undefined' values from objects before sending to Firestore.
// Firestore crashes if it receives 'undefined'. This converts the object to JSON and back,
// which automatically strips undefined keys.
export const sanitizeForFirestore = (data: any) => {
  if (data === undefined) return null;
  return JSON.parse(JSON.stringify(data));
};
