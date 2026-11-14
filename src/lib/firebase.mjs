// ==============================================================
// KURA CYBER-ARCADE // FIREBASE SDK INITIALIZER (ESM .mjs)
// ==============================================================
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier
} from "firebase/auth";

const firebaseConfig = {
  apiKey: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_API_KEY || process.env?.VITE_FIREBASE_API_KEY || process.env?.FIREBASE_API_KEY)) || "AIzaSyDc55x5cTfsyiBLONSfz99tXYmO3iEyJFo",
  authDomain: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env?.VITE_FIREBASE_AUTH_DOMAIN || process.env?.FIREBASE_AUTH_DOMAIN)) || "kura-play.firebaseapp.com",
  projectId: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env?.VITE_FIREBASE_PROJECT_ID || process.env?.FIREBASE_PROJECT_ID)) || "kura-play",
  storageBucket: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env?.VITE_FIREBASE_STORAGE_BUCKET || process.env?.FIREBASE_STORAGE_BUCKET)) || "kura-play.firebasestorage.app",
  messagingSenderId: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env?.FIREBASE_MESSAGING_SENDER_ID)) || "282523951472",
  appId: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_APP_ID || process.env?.VITE_FIREBASE_APP_ID || process.env?.FIREBASE_APP_ID)) || "1:282523951472:web:6de398e241c48c99ecafb5",
  measurementId: (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env?.VITE_FIREBASE_MEASUREMENT_ID || process.env?.FIREBASE_MEASUREMENT_ID)) || "G-2NGKRDMDFE"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {}
}

export { 
  app, 
  auth, 
  googleProvider, 
  analytics, 
  firebaseConfig, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier
};
export default app;
